import { Observable, Subject } from 'rxjs';
import * as uuid from 'uuid';
import * as FlowTaskPackageType from './FlowTaskPackageType';
import { BuildNodeInfoHelper, INodeInfo } from './helpers/BuildNodeInfoHelper';
import { EmitOutput } from './helpers/EmitOutput';
import { FlowEventRunnerHelper } from './helpers/FlowEventRunnerHelper';
import { InjectionHelper } from './helpers/InjectionHelper';
import {
  IReactiveEventEmitterOptions,
  ReactiveEventEmitter,
} from './helpers/ReactiveEventEmitter';
import { ActivationFunction } from './interfaces/FunctionTypes';
import { IServicesInterface } from './interfaces/ServicesInterface';
import { AssignTask } from './plugins/AssignTask';
import { ClearTask } from './plugins/ClearTask';
import { ForwardTask } from './plugins/ForwardTask';
import { FunctionCallTask } from './plugins/FunctionCallTask';
import { FunctionInputTask } from './plugins/FunctionInputTask';
import { FunctionOutputTask } from './plugins/FunctionOutputTask';
import { IfConditionTask } from './plugins/IfConditionTask';
import { InjectIntoPayloadTask } from './plugins/InjectIntoPayloadTask';
import { ObservableTask } from './plugins/ObservableTask';
import { ObserverTask } from './plugins/ObserverTask';
import { ParallelResolveTask } from './plugins/ParallelResolveTask';
import { ParallelTask } from './plugins/ParallelTask';
import { TraceConsoleTask } from './plugins/TraceConsoleTask';

const uuidV4 = uuid.v4;
export interface IRegisteredObservable {
  nodeId: string;
  name: string;
  observable: Observable<any>;
}

export interface ITaskMetaData {
  configMetaData: string;
  fullName: string;
  name: string;
  className: string;
  shape: string;
}

type middlewareFunc = (
  result: any,
  id: any,
  title: any,
  nodeType: any,
  payload: any,
  dateTime: Date
) => void;

export class FlowEventRunner {
  public services: IServicesInterface;
  public throttle: number = 30;

  private nodeValues: any = {};
  private nodes: any;
  private nodeNames: string[] = [];
  private nodeState: any = {};
  private nodeLastPayload: any = {};

  private flowEventEmitter: any;
  private tasks: any = {};

  private middleware: middlewareFunc[] = [];
  private functionNodes: any = [];
  private flowNodeTriggers: any = [];
  private flowNodeRegisterHooks: any = [];
  private flowNodeOverrideAttachHooks: any = [];
  //private nodePluginInfoMap: any = {};
  private observables: IRegisteredObservable[] = [];
  private activationFunctions: any;

  private touchedNodes: any = {};
  private nodeInfoMap: any = {};

  constructor() {
    this.activationFunctions = [];
    this.services = {
      flowEventRunner: this,
      getActivationFunction: this.getActivationFunction,
      //logMessage: (...args) => {},
      logMessage: () => {},
      pluginClasses: [],
      //registerModel: (modelName: string, definition: any) => {},
      registerModel: () => {},
    };
  }

  // TODO : refactor .. this method does too much
  // - creating events foreach node
  // - creating http get/post handlers
  // - instantiate plugins
  // - emit events to output nodes
  // - calling plugin execute or executeAsHTTPEndpoint
  //
  // split in multiple methods / classes

  public createNodes = (
    nodeList: any[],
    autoStartNodes: boolean = false,
    keepOldFlowValues = false
  ) => {
    this.flowEventEmitter = new ReactiveEventEmitter();
    this.flowEventEmitter.throttle = this.throttle;

    const nodeEmitter = this.flowEventEmitter;

    nodeEmitter.on('error', this.errorListener);

    const nodePluginInfoMap: any = {};
    const autostarters: any = [];

    for (const pluginClassName in this.services.pluginClasses) {
      if (this.services.pluginClasses.hasOwnProperty(pluginClassName)) {
        const pluginClass = this.services.pluginClasses[pluginClassName];
        if (pluginClass === undefined) {
          throw new Error(`Task ${pluginClassName} doesn't exist`);
        }
        const pluginInstance = new pluginClass();
        if (!pluginInstance.getName) {
          throw new Error(`Task ${pluginClassName} has no getName() method`);
        }

        const name = pluginInstance.getName() || '';
        if (!name || name === '' || name === 'FlowTask') {
          throw new Error(
            `Task ${pluginClassName} has no valid getName() method`
          );
        }

        if (nodePluginInfoMap[name]) {
          throw new Error(
            `Task ${pluginClassName} has getName() conflict with other task`
          );
        }

        nodePluginInfoMap[name] = {
          configMetaData: pluginInstance.getConfigMetaData(),
          fullName: pluginInstance.getFullName(),
          name,
          pluginClass,
          pluginClassName,
          pluginInstance,
          shape: pluginInstance.getShape(),
        };
      }
    }
    //this.nodePluginInfoMap = nodePluginInfoMap;

    this.nodes = nodeList
      .filter((o: any) => o.taskType !== 'connection')
      .map((node: any) => {
        if (!keepOldFlowValues || !this.nodeValues[node.id]) {
          this.nodeValues[node.id] = node;
        }

        // nodePluginInfo contains info about the the plugin such as the plugInstance, className and config metadata
        const nodePluginInfo = nodePluginInfoMap[node.taskType];

        const pluginClass = this.services.pluginClasses[node.taskType];

        if (!pluginClass) {
          this.services.logMessage('pluginClass not defined', node.id, node);
          return false;
        }

        const pluginInstance = new pluginClass();

        // node is the actual node on flow-level (it contains just the basic properties defined in the flow)
        node.payload = {};

        if (node.subtype === 'registrate' || node.subtype === 'register') {
          FlowEventRunnerHelper.registerNode(
            node,
            pluginInstance,
            this.services,
            this.flowNodeRegisterHooks
          );
          return false;
        }

        // nodeInfo contains the info needed to run the plugin on and list of input/output nodes and
        // which nodes are used for injection on each run of a plugin
        const nodeInfo = BuildNodeInfoHelper.build(
          nodeList,
          node,
          nodePluginInfoMap,
          this.services
        );
        nodeInfo.pluginInstance = pluginInstance;

        this.nodeInfoMap[node.id] = nodeInfo;

        this.nodeNames[node.name] = node.id;

        if (pluginInstance !== undefined) {
          this.flowNodeTriggers.map((flowNodeTrigger: any) => {
            flowNodeTrigger(
              pluginInstance.getPackageType(),
              node,
              (payload: any, callStack: any) => {
                nodeEmitter.emit(node.id.toString(), payload, callStack);
              }
            );
            return true;
          });
        }

        if (typeof nodePluginInfo !== 'undefined') {
          this.flowNodeOverrideAttachHooks.map((hook: any) => {
            if (hook(node, pluginInstance, this.flowEventEmitter, nodeInfo)) {
              return false;
            }
            return true;
          });

          if (node.subtype === 'autostart') {
            autostarters.push(node.id.toString());
          } else if (pluginInstance.isStartingOnInitFlow !== undefined) {
            if (pluginInstance.isStartingOnInitFlow()) {
              autostarters.push(node.id.toString());
            }
          }

          if (pluginInstance.getObservable !== undefined) {
            this.observables.push({
              name: node.name || node.title.replace(/ /g, ''),
              nodeId: node.id,
              observable: pluginInstance.getObservable(node),
            });
          }

          if (
            pluginInstance.getPackageType() ===
            FlowTaskPackageType.FUNCTION_INPUT_NODE
          ) {
            this.functionNodes[node.name] = node.id.toString();
            this.services.logMessage(this.functionNodes);
          }

          if (node.controllers) {
            nodeEmitter.registerNodeControllers(node);
          }

          const options: IReactiveEventEmitterOptions = {
            isSampling:
              !!node.isSampling ||
              (pluginInstance.isSampling && pluginInstance.isSampling(node)),
            isThrottling:
              !!node.isThrottling ||
              (pluginInstance.isThrottling &&
                pluginInstance.isThrottling(node)),
            sampleInterval: node.sampleInterval,
            throttleInterval: node.throttleInterval,
          };

          if (node.events) {
            const flowEventRunner = this;
            node.events.map((event: any) => {
              nodeEmitter.on(
                node.id.toString() + '_' + event.eventName,
                (payload: any, callStack: any) => {
                  const currentNode = Object.assign(
                    {},
                    node,
                    this.nodeValues[node.id]
                  );
                  const nodeInstance = Object.assign({}, currentNode, {
                    followNodes: nodeInfo.manuallyToFollowNodes,
                  });

                  // copy the current node info but DONT include its outputs...
                  const eventNodeInfo = { ...nodeInfo };
                  if (eventNodeInfo.outputs) {
                    delete eventNodeInfo.outputs;
                  }
                  if (eventNodeInfo.error) {
                    delete eventNodeInfo.error;
                  }
                  // only add the connections which are the actual event...
                  eventNodeInfo.outputs = nodeList.filter(
                    (o: any) =>
                      o.startshapeid === node.id.toString() &&
                      o.taskType === 'connection' &&
                      o.followflow !== 'onfailure' &&
                      o.followflow !== 'followManually' &&
                      o.followflow !== 'injectConfigIntoPayload' &&
                      o.event === event.eventName
                  );

                  eventNodeInfo.error = [];

                  nodeInstance.payload = Object.assign({}, payload);
                  EmitOutput.emitToOutputs(
                    nodePluginInfo,
                    nodeEmitter,
                    eventNodeInfo,
                    nodeInstance,
                    callStack,
                    flowEventRunner,
                    event.eventName
                  );
                },
                options
              );
              return true;
            });
          }

          nodeEmitter.on(
            node.id.toString(),
            (payload: any, callStack: any) => {
              const currentNode = Object.assign(
                {},
                node,
                this.nodeValues[node.id]
              );
              let payloadInstance = { ...payload };

              if (
                !!node['_setPerformanceMarker'] &&
                typeof performance !== 'undefined'
              ) {
                payloadInstance['_performance'] = performance.now();
              }

              if (
                !!node['_getPerformanceMeasure'] &&
                payloadInstance['_performance'] &&
                typeof performance !== 'undefined'
              ) {
                payloadInstance['_performanceDuration'] =
                  performance.now() - payloadInstance['_performance'];
              }

              if (!!node['_clearPerformance']) {
                if (payloadInstance['_performanceDuration']) {
                  delete payloadInstance['_performanceDuration'];
                }
                if (payloadInstance['_performance']) {
                  delete payloadInstance['_performance'];
                }
              }

              if (node.controllers) {
                node.controllers.map((controller: any) => {
                  const value = nodeEmitter.getNodeControllerValue(
                    node.name,
                    controller.name
                  );
                  if (value || value === 0) {
                    payloadInstance[controller.name] = value;
                  }
                  return true;
                });
              }

              const injectionValues: any = {};
              const injectionPromises: any = InjectionHelper.executeInjections(
                currentNode,
                nodeInfo,
                injectionValues,
                payloadInstance,
                this.services,
                callStack,
                this.middleware
              );

              const flowEventRunner = this;

              Promise.all(injectionPromises).then(() => {
                // nodeInstance contains the payload and is the current instance of the node which
                // is used to execute the plugin on.

                let tempPayload = { ...payloadInstance };
                let callstackInstance = { ...callStack };
                let nodeInstance = Object.assign({}, currentNode, {
                  followNodes: nodeInfo.manuallyToFollowNodes,
                });

                if (node && node.observable) {
                  nodeInstance.observable = node.observable;
                }

                nodeInstance.payload = Object.assign(
                  {},
                  tempPayload,
                  injectionValues
                );

                if (node.subtype === 'start') {
                  callstackInstance.sessionId = uuidV4();
                }

                this.services.logMessage(
                  'EVENT Received for node: ',
                  nodeInfo.name,
                  node.id.toString()
                );

                function emitToOutputs(
                  currentNodeInstance: any,
                  currentCallStack: any
                ) {
                  EmitOutput.emitToOutputs(
                    nodePluginInfo,
                    nodeEmitter,
                    nodeInfo,
                    currentNodeInstance,
                    currentCallStack,
                    flowEventRunner
                  );
                }

                function emitToError(
                  currentNodeInstance: any,
                  currentCallStack: any
                ) {
                  EmitOutput.emitToError(
                    nodePluginInfo,
                    nodeEmitter,
                    nodeInfo,
                    currentNodeInstance,
                    currentCallStack,
                    flowEventRunner
                  );
                }

                try {
                  let newCallStack = callstackInstance;

                  if (
                    pluginInstance.getPackageType() ===
                    FlowTaskPackageType.FUNCTION_NODE
                  ) {
                    emitToOutputs(nodeInstance, newCallStack);

                    newCallStack = null;
                    tempPayload = null;
                    callstackInstance = null;

                    return;
                  }

                  if (
                    pluginInstance.getPackageType() !==
                      FlowTaskPackageType.FORWARD_NODE &&
                    pluginInstance.getPackageType() !==
                      FlowTaskPackageType.FUNCTION_OUTPUT_NODE
                  ) {
                    if (
                      typeof nodeInstance.payload.followFlow !== 'undefined'
                    ) {
                      delete nodeInstance.payload.followFlow;
                    }
                  } else {
                    // FORWARD_NODE OR FUNCTION_OUTPUT_NODE
                    //
                    // _forwardFollowFlow contains the last followFlow
                    // followFlow is used by IfConditionTask to handle 'else'

                    if (nodeInstance.payload._forwardFollowFlow !== undefined) {
                      nodeInstance.payload.followFlow =
                        nodeInstance.payload._forwardFollowFlow;
                    }
                  }
                  nodeInstance.payload._forwardFollowFlow = undefined;

                  this.nodeState[nodeInstance.name] = {
                    hasError: false,
                  };

                  this.nodeLastPayload[node.name] = { ...nodeInstance.payload };

                  this.resetTouchedNodesPreExecute(nodeInfo, []);
                  this.touchedNodes[nodeInfo.nodeId] = true;

                  const result = pluginInstance.execute(
                    nodeInstance,
                    this.services,
                    newCallStack
                  );

                  if (
                    result instanceof Observable ||
                    result instanceof Subject
                  ) {
                    if (pluginInstance.getObservable === undefined) {
                      this.observables.push({
                        name:
                          nodeInstance.name ||
                          nodeInstance.title.replace(/ /g, ''),
                        nodeId: nodeInstance.id,
                        observable: result,
                      });
                    }

                    if (node.isNodeObserved) {
                      newCallStack = null;
                      tempPayload = null;
                      callstackInstance = null;
                      return;
                    }

                    node.isNodeObserved = true;

                    const observer = {
                      complete: () => {
                        this.services.logMessage(
                          'Completed observable for ',
                          nodeInstance.name
                        );
                        tempPayload = null;
                        callstackInstance = null;
                      },
                      error: (err: any) => {
                        this.nodeState[nodeInstance.name] = {
                          hasError: true,
                        };

                        nodeInstance.payload = Object.assign(
                          {},
                          nodeInstance.payload,
                          { error: err }
                        );
                        emitToError(nodeInstance, newCallStack);

                        FlowEventRunnerHelper.callMiddleware(
                          this.middleware,
                          'error',
                          nodeInstance.id,
                          nodeInstance.name,
                          node.taskType,
                          tempPayload,
                          new Date()
                        );

                        tempPayload = null;
                        callstackInstance = null;
                      },
                      next: (incomingPayload: any) => {
                        nodeInstance.payload = incomingPayload.payload
                          ? incomingPayload.payload
                          : incomingPayload;
                        emitToOutputs(nodeInstance, newCallStack);

                        FlowEventRunnerHelper.callMiddleware(
                          this.middleware,
                          incomingPayload &&
                            incomingPayload.followFlow === 'isError'
                            ? 'error'
                            : 'ok',
                          nodeInstance.id,
                          nodeInstance.name,
                          node.taskType,
                          { ...incomingPayload },
                          new Date()
                        );

                        tempPayload = null;
                        callstackInstance = null;
                        newCallStack = null;
                      },
                    };

                    if (node.subscription) {
                      node.subscription.unsubscribe();
                      node.subscription = null;
                    }

                    node.subscription = result.subscribe(observer);
                  } else if (
                    typeof result === 'object' &&
                    typeof result.then === 'function'
                  ) {
                    // Promise
                    result
                      .then((incomingPayload: any) => {
                        nodeInstance.payload = { ...incomingPayload };
                        emitToOutputs(nodeInstance, newCallStack);

                        FlowEventRunnerHelper.callMiddleware(
                          this.middleware,
                          incomingPayload &&
                            incomingPayload.followFlow === 'isError'
                            ? 'error'
                            : 'ok',
                          nodeInstance.id,
                          nodeInstance.name,
                          node.taskType,
                          { ...incomingPayload },
                          new Date()
                        );

                        tempPayload = null;
                        callstackInstance = null;
                        newCallStack = null;
                      })
                      .catch((err: any) => {
                        this.services.logMessage(err);

                        this.nodeState[nodeInstance.name] = {
                          hasError: true,
                        };

                        nodeInstance.payload = Object.assign(
                          {},
                          nodeInstance.payload,
                          { error: err }
                        );
                        emitToError(nodeInstance, newCallStack);

                        FlowEventRunnerHelper.callMiddleware(
                          this.middleware,
                          'error',
                          nodeInstance.id,
                          nodeInstance.name,
                          node.taskType,
                          nodeInstance.payload,
                          new Date()
                        );

                        tempPayload = null;
                        callstackInstance = null;
                        newCallStack = null;
                      });
                  } else if (typeof result === 'object') {
                    nodeInstance.payload = { ...result };
                    emitToOutputs(nodeInstance, newCallStack);

                    FlowEventRunnerHelper.callMiddleware(
                      this.middleware,
                      result && result.followFlow === 'isError'
                        ? 'error'
                        : 'ok',
                      nodeInstance.id,
                      nodeInstance.name,
                      node.taskType,
                      result,
                      new Date()
                    );

                    tempPayload = null;
                    callstackInstance = null;
                    newCallStack = null;
                  } else if (typeof result === 'boolean' && result === true) {
                    emitToOutputs(nodeInstance, newCallStack);

                    FlowEventRunnerHelper.callMiddleware(
                      this.middleware,
                      'ok',
                      nodeInstance.id,
                      nodeInstance.name,
                      node.taskType,
                      nodeInstance.payload,
                      new Date()
                    );

                    tempPayload = null;
                    callstackInstance = null;
                    newCallStack = null;
                  } else if (typeof result === 'boolean' && result === false) {
                    console.log('====== RETURN IS FALSE ====', nodeInstance);
                    this.nodeState[nodeInstance.name] = {
                      hasError: true,
                    };

                    // todo : check and think about if this should not happen here
                    // emitToError(nodeInstance, newCallStack);

                    FlowEventRunnerHelper.callMiddleware(
                      this.middleware,
                      'error',
                      nodeInstance.id,
                      nodeInstance.name,
                      node.taskType,
                      nodeInstance.payload,
                      new Date()
                    );

                    newCallStack = null;
                    tempPayload = null;
                    callstackInstance = null;
                  }
                } catch (err) {
                  this.services.logMessage(err);
                  const payloadForNotification = Object.assign(
                    {},
                    nodeInstance.payload
                  );
                  payloadForNotification.response = undefined;
                  payloadForNotification.request = undefined;

                  emitToError(nodeInstance, callstackInstance);

                  tempPayload = null;
                  callstackInstance = null;
                }

                payloadInstance = null;
              });
            },
            options
          );

          return nodeInfo;
        }
        return false;
      });

    autostarters.map((nodeId: any) => {
      nodeEmitter.emit(nodeId.toString(), {}, {});
      return true;
    });

    if (!!autoStartNodes) {
      this.nodes.map((nodeInfo: any) => {
        if (
          nodeInfo.pluginInstance.getPackageType() !==
          FlowTaskPackageType.FUNCTION_INPUT_NODE
        ) {
          if (nodeInfo.inputs.length === 0 && !nodeInfo.dontAutostart) {
            nodeEmitter.emit(nodeInfo.nodeId.toString(), {}, {});
          }
        }
        return true;
      });
    }
  };

  public destroyFlow = () => {
    this.nodeInfoMap = {};

    if (this.touchedNodes) {
      this.touchedNodes = {};
    }

    if (this.flowEventEmitter) {
      this.flowEventEmitter.removeListener('error');
    }
    if (this.nodeState) {
      this.nodeState = {};
    }

    if (this.nodeLastPayload) {
      this.nodeLastPayload = {};
    }

    if (this.nodes) {
      this.nodes.map((nodeInfo: any) => {
        if (nodeInfo && nodeInfo.nodeId) {
          if (this.flowEventEmitter) {
            this.flowEventEmitter.removeListener(nodeInfo.nodeId);
          }
        }
        if (nodeInfo && nodeInfo.subscription) {
          nodeInfo.subscription.unsubscribe();
          nodeInfo.subscription = undefined;
        }
        if (
          nodeInfo &&
          nodeInfo.pluginInstance &&
          nodeInfo.pluginInstance.kill
        ) {
          nodeInfo.pluginInstance.kill();
        }
        if (nodeInfo) {
          nodeInfo.pluginInstance = undefined;
          nodeInfo.inputs = [];
          nodeInfo.outputs = [];
          nodeInfo.error = [];
        }
        return true;
      });
    }
    this.nodes = [];
    this.observables.map(observableHelper => {
      if (observableHelper && observableHelper.observable) {
        (observableHelper.observable as any).complete();
      }
      return true;
    });
    this.observables = [];
    //this.nodeValues = {};
    this.nodeNames = [];
  };

  public getFunctionNodeId = (title: any) => {
    if (
      typeof this.functionNodes[title] !== 'undefined' &&
      this.functionNodes[title] !== ''
    ) {
      return this.functionNodes[title];
    }
    return false;
  };

  public callNode = (nodeId: any, payload: any) => {
    this.flowEventEmitter.emit(nodeId.toString(), payload, {});
  };

  public triggerEventOnNode = (
    nodeName: any,
    eventName: string,
    payload: any
  ) => {
    return this.executeNode(nodeName, payload, undefined, eventName);
  };

  public retriggerNode = (nodeName: any) => {
    const payload = this.nodeLastPayload[nodeName] || {};
    return this.executeNode(nodeName, payload, undefined);
  };

  public executeNode = (
    nodeName: any,
    payload: any,
    callStack?: any,
    eventName?: string
  ) => {
    // this.touchedNodes = {};

    if (!this.nodeNames[nodeName]) {
      return new Promise((_resolve, reject) => {
        reject();
      });
    }
    let self: any = this;
    let payloadInstance = { ...payload };
    let callstackInstance = callStack ? { ...callStack } : {};
    let tempNodeId: any;
    let tempErrorNodeId: any;

    /*

      problem with pausing the flow is that this can happen during handling of
      executeNode internal emits, and then the executeNode/triggerEventOnNode never finished
      
      TODO : figure out how to prevent that?

    */
    callstackInstance['_executeNode'] = true;

    if (!!this.flowEventEmitter.isPaused) {
      return new Promise((resolve, _reject) => {
        resolve({});
      });
    }

    tempNodeId = uuidV4().toString();
    tempErrorNodeId = uuidV4().toString();

    return new Promise((resolve: any, reject: any) => {
      new Promise((innerresolve: any, innerreject: any) => {
        function onResult(localPayload: any) {
          // self.services.logMessage('executeNode result', localPayload);
          innerresolve(localPayload);
        }

        function onError() {
          // self.services.logMessage('executeNode result', localPayload);
          innerreject();
        }

        try {
          const nodeId = self.nodeNames[nodeName];

          self.flowEventEmitter.on(tempNodeId, onResult);
          self.flowEventEmitter.on(tempErrorNodeId, onError);

          const newCallStack = Object.assign(
            {},
            {
              error: [{ endshapeid: tempErrorNodeId }],
              outputs: [{ endshapeid: tempNodeId }],
            },
            callstackInstance
          );

          self.flowEventEmitter.emit(
            nodeId.toString() +
              (eventName !== undefined ? '_' + eventName : ''),
            payloadInstance,
            newCallStack
          );

          payloadInstance = null;
          callstackInstance = null;
        } catch (err) {
          this.services.logMessage('executeNode error', err);
          payloadInstance = null;
          callstackInstance = null;
          innerreject();
        }
      })
        .then(localPayload => {
          self.flowEventEmitter.removeListener(tempNodeId);
          self.flowEventEmitter.removeListener(tempErrorNodeId);

          self = null;
          tempNodeId = null;
          tempErrorNodeId = null;

          resolve(localPayload);
        })
        .catch(() => {
          self.flowEventEmitter.removeListener(tempNodeId);
          self.flowEventEmitter.removeListener(tempErrorNodeId);

          self = null;
          tempNodeId = null;
          tempErrorNodeId = null;

          reject();
        });
    });
  };

  public getFlowEventEmitter = () => {
    return this.flowEventEmitter;
  };

  public registerFlowNodeTrigger = (effect: any) => {
    this.flowNodeTriggers.push(effect);
  };

  public registerFlowNodeRegisterHook = (hook: any) => {
    this.flowNodeRegisterHooks.push(hook);
  };

  public registerFlowNodeOverrideAttachHook = (hook: any) => {
    this.flowNodeOverrideAttachHooks.push(hook);
  };

  public registerTask = (taskName: string, taskClass: any) => {
    this.tasks[taskName] = taskClass;
    return true;
  };

  public registerMiddleware = (middleware: middlewareFunc) => {
    this.middleware.push(middleware);
  };

  public getObservableNode = (nodeName: string) => {
    const observables = this.observables.filter(observableNode => {
      return observableNode.name === nodeName;
    });
    return observables.length > 0 ? observables[0].observable : false;
  };

  public executeFlowFunction = (nodeName: any) => {
    const self = this;
    return new Promise((resolve: any, reject: any) => {
      let tempNodeId: any;

      function onFunctionResult(payload: any) {
        self.flowEventEmitter.removeListener(tempNodeId, onFunctionResult);
        resolve(payload);
      }

      try {
        if (
          typeof this.functionNodes[nodeName] !== 'undefined' &&
          self.functionNodes[nodeName] !== ''
        ) {
          tempNodeId = uuidV4().toString();
          const nodeId = self.functionNodes[nodeName];

          self.flowEventEmitter.on(tempNodeId, onFunctionResult);
          const payload = {};
          // payload._functionOutputs = [{endshapeid:tempNodeId}];
          // payload._functionErrorOutputs = [];
          const callStack = {
            error: [],
            outputs: [{ endshapeid: tempNodeId }],
          };
          self.flowEventEmitter.emit(nodeId.toString(), payload, callStack);
        } else {
          reject();
        }
      } catch (err) {
        this.services.logMessage('executeFlowFunction error', err);
        reject();
      }
    });
  };

  public start = (
    flowPackage: any,
    customServices?: IServicesInterface,
    mergeWithDefaultPlugins: boolean = true,
    autoStartNodes = false,
    keepOldFlowValues = false
  ) => {
    this.touchedNodes = {};
    this.nodeInfoMap = {};

    if (!keepOldFlowValues) {
      this.nodeValues = {};
    }

    if (customServices !== undefined) {
      this.services = customServices;
      this.services.flowEventRunner = this;
    } else {
      this.services = {
        flowEventRunner: this,
        logMessage: (..._args) => {},
        pluginClasses: {},
        registerModel: (_modelName: string, _definition: any) => {},
      };
    }

    this.services.getActivationFunction = this.getActivationFunction;

    if (
      mergeWithDefaultPlugins === undefined ||
      mergeWithDefaultPlugins === true
    ) {
      this.services.pluginClasses['AssignTask'] = AssignTask;
      this.services.pluginClasses['ClearTask'] = ClearTask;
      this.services.pluginClasses['ForwardTask'] = ForwardTask;
      this.services.pluginClasses[
        'InjectIntoPayloadTask'
      ] = InjectIntoPayloadTask;
      this.services.pluginClasses['ObserverTask'] = ObserverTask;
      this.services.pluginClasses['ObservableTask'] = ObservableTask;
      this.services.pluginClasses['TraceConsoleTask'] = TraceConsoleTask;
      this.services.pluginClasses['IfConditionTask'] = IfConditionTask;
      this.services.pluginClasses['FunctionCallTask'] = FunctionCallTask;
      this.services.pluginClasses['FunctionInputTask'] = FunctionInputTask;
      this.services.pluginClasses['FunctionOutputTask'] = FunctionOutputTask;
      this.services.pluginClasses['ParallelTask'] = ParallelTask;
      this.services.pluginClasses['ParallelResolveTask'] = ParallelResolveTask;
    }

    this.services.pluginClasses = Object.assign(
      {},
      this.services.pluginClasses,
      this.tasks
    );

    return new Promise((resolve: any, reject: any) => {
      try {
        this.createNodes(flowPackage.flow, autoStartNodes, keepOldFlowValues);

        resolve(this.services);
      } catch (err) {
        this.services.logMessage('setup failed! error', err);
        reject();
      }
    });
  };

  public getTaskMetaData = (): ITaskMetaData[] => {
    const metaData: ITaskMetaData[] = [];
    for (const pluginClassName in this.services.pluginClasses) {
      if (this.services.pluginClasses.hasOwnProperty(pluginClassName)) {
        const pluginClass = this.services.pluginClasses[pluginClassName];
        const pluginInstance = new pluginClass();

        metaData.push({
          className: pluginClassName,
          configMetaData: pluginInstance.getConfigMetaData(),
          fullName: pluginInstance.getFullName(),
          name: pluginInstance.getName(),
          shape: pluginInstance.getShape(),
        });
      }
    }

    return metaData;
  };

  public setPropertyOnNode = (
    nodeName: string,
    propertyName: string,
    value: any,
    additionalValues: any
  ) => {
    const nodeId: string = this.nodeNames[nodeName as any];
    if (additionalValues) {
      this.nodeValues[nodeId] = {
        ...this.nodeValues[nodeId],
        ...additionalValues,
      };
    }
    if (nodeId !== undefined && this.nodeValues[nodeId] !== undefined) {
      this.nodeValues[nodeId][propertyName] = value;
    }
  };

  public getPropertyFromNode = (nodeName: string, propertyName: string) => {
    const nodeId: string = this.nodeNames[nodeName as any];
    if (nodeId !== undefined && this.nodeValues[nodeId] !== undefined) {
      return this.nodeValues[nodeId][propertyName];
    }
    return undefined;
  };

  public getNodeState(nodeName: string) {
    return this.nodeState[nodeName] || {};
  }

  public getTouchedNodeState(nodeName: string): boolean {
    return (this.touchedNodes[nodeName] as boolean) || false;
  }

  public getTouchedNodes(): any {
    return this.touchedNodes || {};
  }

  public pauseFlowrunner = () => {
    this.flowEventEmitter.pauseFlowrunner();
  };

  public registerActivationFuncion = (
    name: string,
    activationFunction: ActivationFunction
  ) => {
    this.activationFunctions[name] = activationFunction;
  };

  public resumeFlowrunner = () => {
    this.flowEventEmitter.resumeFlowrunner();
  };

  private errorListener = (err: any) => {
    console.error('error in FlowEventRunner EventEmitter');
    console.log(err);
  };

  private getActivationFunction = (name: string) => {
    if (this.activationFunctions[name]) {
      return this.activationFunctions[name];
    }
    return false;
  };

  private resetTouchedNodesPreExecute = (
    nodeInfo: INodeInfo,
    updatedNodes: string[]
  ) => {
    /*
    - touchednodes bijwerken in de FlowEventRunner:
		
			- touchednodes wordt alleen gereset bij volledig starten van flow (startFlow)
			- voor node.execute
				- set output node connections en ouput nodes als touched = false

				- recursief door output nodes lopen (voorkom circulaire nodes door steeds lijst
						van nodes die "geweest" zijn mee te sturen en als een node behandeld
							wordt die al geweest is.. dan stoppen
					) 

					PROBLEEM : de output nodes zijn nog niet uitgevoerd als een parent
            wordt uitgevoerd .. de kinderen worden natuurlijk van zelf uitgevoerd
        - na elke node.execute:
          - set current node als touched
          - emitoutput zet de node-connections die aangeraakt zijn als touched

    */
    if (!nodeInfo) {
      return;
    }
    if (updatedNodes.indexOf(nodeInfo.nodeId) >= 0) {
      return;
    }
    const updatedNodesList = [...updatedNodes, nodeInfo.nodeId];
    this.touchedNodes[nodeInfo.nodeId] = false;
    if (nodeInfo && nodeInfo.outputs) {
      nodeInfo.outputs.map((outputNode: any) => {
        delete this.touchedNodes[outputNode.name];
        return true;
      });

      nodeInfo.outputs.map((outputNode: any) => {
        this.resetTouchedNodesPreExecute(
          this.nodeInfoMap[outputNode.endshapeid],
          updatedNodesList
        );
        return true;
      });
    }

    if (nodeInfo && nodeInfo.error) {
      nodeInfo.error.map((outputNode: any) => {
        delete this.touchedNodes[outputNode.name];
        return true;
      });

      nodeInfo.error.map((outputNode: any) => {
        this.resetTouchedNodesPreExecute(
          this.nodeInfoMap[outputNode.endshapeid],
          updatedNodesList
        );
        return true;
      });
    }
  };

  /*
  private updateTouchedNodesPostExecute = (nodeInfo: INodeInfo, updatedNodes: string[]) => {
    if (!nodeInfo) {
      return;
    }
    if (updatedNodes.indexOf(nodeInfo.nodeId) >= 0) {
      return;
    }
    this.touchedNodes[nodeInfo.nodeId] = true;
  };
  */
}
