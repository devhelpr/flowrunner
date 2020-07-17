import { Observable, Subject } from '@reactivex/rxjs';
import * as Promise from 'promise';
import * as uuid from 'uuid';
import * as FlowTaskPackageType from './FlowTaskPackageType';
import { BuildNodeInfoHelper } from './helpers/BuildNodeInfoHelper';
import { EmitOutput } from './helpers/EmitOutput';
import { FlowEventRunnerHelper } from './helpers/FlowEventRunnerHelper';
import { InjectionHelper } from './helpers/InjectionHelper';
import { ReactiveEventEmitter } from './helpers/ReactiveEventEmitter';
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

type middlewareFunc = (result: any, id: any, title: any, nodeType: any, payload: any, dateTime: Date) => void;

export class FlowEventRunner {
  public services: IServicesInterface;

  private nodeValues: any = {};
  private nodes: any;
  private nodeNames: string[] = [];
  private flowEventEmitter: any;
  private tasks: any = {};

  private middleware: middlewareFunc[] = [];
  private functionNodes: any = [];
  private flowNodeTriggers: any = [];
  private flowNodeRegisterHooks: any = [];
  private flowNodeOverrideAttachHooks: any = [];
  private nodePluginInfoMap: any = {};
  private observables: IRegisteredObservable[] = [];

  constructor() {
    this.services = {
      flowEventRunner: this,
      logMessage: (...args) => {},
      pluginClasses: [],
      registerModel: (modelName: string, definition: any) => {},
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

  public createNodes = (nodeList: any[], autoStartNodes: boolean = false) => {
    this.flowEventEmitter = new ReactiveEventEmitter();
    const nodeEmitter = this.flowEventEmitter;

    nodeEmitter.on('error', this.errorListener);

    const nodePluginInfoMap: any = {};
    const autostarters: any = [];

    for (const pluginClassName in this.services.pluginClasses) {
      if (this.services.pluginClasses.hasOwnProperty(pluginClassName)) {
        const pluginClass = this.services.pluginClasses[pluginClassName];
        const pluginInstance = new pluginClass();

        nodePluginInfoMap[pluginInstance.getName()] = {
          configMetaData: pluginInstance.getConfigMetaData(),
          fullName: pluginInstance.getFullName(),
          name: pluginInstance.getName(),
          pluginClass,
          pluginClassName,
          pluginInstance,
          shape: pluginInstance.getShape(),
        };
      }
    }
    this.nodePluginInfoMap = nodePluginInfoMap;

    this.nodes = nodeList
      .filter((o: any) => o.taskType !== 'connection')
      .map((node: any) => {
        this.nodeValues[node.id] = node;

        // nodePluginInfo contains info about the the plugin such as the plugInstance, className and config metadata
        const nodePluginInfo = nodePluginInfoMap[node.taskType];

        const pluginClass = this.services.pluginClasses[node.taskType];
        const pluginInstance = new pluginClass();

        // node is the actual node on flow-level (it contains just the basic properties defined in the flow)
        node.payload = {};

        if (node.subtype === 'registrate' || node.subtype === 'register') {
          FlowEventRunnerHelper.registerNode(node, pluginInstance, this.services, this.flowNodeRegisterHooks);
          return;
        }

        // nodeInfo contains the info needed to run the plugin on and list of input/output nodes and
        // which nodes are used for injection on each run of a plugin
        const nodeInfo = BuildNodeInfoHelper.build(nodeList, node, nodePluginInfoMap);
        nodeInfo.pluginInstance = pluginInstance;

        this.nodeNames[node.name] = node.id;

        if (pluginInstance !== undefined) {
          this.flowNodeTriggers.map((flowNodeTrigger: any) => {
            flowNodeTrigger(pluginInstance.getPackageType(), node, (payload: any, callStack: any) => {
              nodeEmitter.emit(node.id.toString(), payload, callStack);
            });
          });
        }

        if (typeof nodePluginInfo !== 'undefined') {
          this.flowNodeOverrideAttachHooks.map((hook: any) => {
            if (hook(node, pluginInstance, this.flowEventEmitter, nodeInfo)) {
              return;
            }
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

          if (pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_INPUT_NODE) {
            this.functionNodes[node.name] = node.id.toString();
            this.services.logMessage(this.functionNodes);
          }

          if (node.controllers) {
            nodeEmitter.registerNodeControllers(node);
          }

          if (node.events) {
            node.events.map((event: any) => {
              nodeEmitter.on(node.id.toString() + '_' + event.eventName, (payload: any, callStack: any) => {
                const currentNode = Object.assign({}, node, this.nodeValues[node.id]);
                const nodeInstance = Object.assign({}, currentNode, { followNodes: nodeInfo.manuallyToFollowNodes });
                
                // copy the current node info but DONT include its outputs...
                let eventNodeInfo = {...nodeInfo};
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
                    o.event == event.eventName
                );

                eventNodeInfo.error = [];

                nodeInstance.payload = Object.assign({}, payload);
                EmitOutput.emitToOutputs(
                  nodePluginInfo,
                  nodeEmitter,
                  eventNodeInfo,
                  nodeInstance,
                  callStack,
                  event.eventName,
                );
              });
            });
          }

          nodeEmitter.on(node.id.toString(), (payload: any, callStack: any) => {
            const currentNode = Object.assign({}, node, this.nodeValues[node.id]);
            let _payload = {...payload};
            
            if (!!node["_setPerformanceMarker"] && typeof performance !== "undefined") {
              _payload["_performance"] = performance.now();
            }           

            if (!!node["_getPerformanceMeasure"] && _payload["_performance"] &&
                typeof performance !== "undefined") {
                _payload["_performanceDuration"] = performance.now() - _payload["_performance"];
            }

            if (node.controllers) {
              node.controllers.map((controller: any) => {
                const value = nodeEmitter.getNodeControllerValue(node.name, controller.name);
                if (value || value === 0) {
                  _payload[controller.name] = value;
                }
              });
            }

            const injectionValues: any = {};
            const injectionPromises: any = InjectionHelper.executeInjections(
              currentNode,
              nodeInfo,
              injectionValues,
              _payload,
              this.services,
              callStack,
              this.middleware,
            );

            Promise.all(injectionPromises).then(() => {
              // nodeInstance contains the payload and is the current instance of the node which
              // is used to execute the plugin on.

              let __payload = {..._payload};
              let _callstack = {...callStack};
              const nodeInstance = Object.assign({}, currentNode, { followNodes: nodeInfo.manuallyToFollowNodes });

              nodeInstance.payload = Object.assign({}, __payload, injectionValues);

              if (node.subtype === 'start') {
                _callstack.sessionId = uuidV4();
              }

              this.services.logMessage('EVENT Received for node: ', nodeInfo.name, node.id.toString());

              function emitToOutputs(currentNodeInstance: any, currentCallStack: any) {
                EmitOutput.emitToOutputs(nodePluginInfo, nodeEmitter, nodeInfo, currentNodeInstance, currentCallStack);
              }

              function emitToError(currentNodeInstance: any, currentCallStack: any) {
                EmitOutput.emitToError(nodePluginInfo, nodeEmitter, nodeInfo, currentNodeInstance, currentCallStack);
              }

              try {
                let newCallStack = _callstack;

                if (pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_NODE) {
                  emitToOutputs(nodeInstance, newCallStack);

                  newCallStack = null;
                  __payload = null;
                  _callstack = null;

                  return;
                }

                if (
                  pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE &&
                  pluginInstance.getPackageType() !== FlowTaskPackageType.FUNCTION_OUTPUT_NODE
                ) {
                  if (typeof nodeInstance.payload.followFlow !== 'undefined') {
                    delete nodeInstance.payload.followFlow;
                  }
                } else {
                  // FORWARD_NODE OR FUNCTION_OUTPUT_NODE
                  //
                  // _forwardFollowFlow contains the last followFlow
                  // followFlow is used by IfConditionTask to handle 'else'

                  if (nodeInstance.payload._forwardFollowFlow !== undefined) {
                    nodeInstance.payload.followFlow = nodeInstance.payload._forwardFollowFlow;
                  }
                }
                nodeInstance.payload._forwardFollowFlow = undefined;

                const result = pluginInstance.execute(nodeInstance, this.services, newCallStack);

                if (result instanceof Observable || result instanceof Subject) {
                  if (pluginInstance.getObservable === undefined) {
                    this.observables.push({
                      name: nodeInstance.name || nodeInstance.title.replace(/ /g, ''),
                      nodeId: nodeInstance.id,
                      observable: result,
                    });
                  }

                  if (node.isNodeObserved) {
                    newCallStack = null;
                    __payload = null;
                    _callstack = null;
                    return;
                  }

                  node.isNodeObserved = true;

                  const observer = {
                    complete: () => {
                      this.services.logMessage('Completed observable for ', nodeInstance.name);
                      __payload = null;
                      _callstack = null;
                    },
                    error: (err: any) => {
                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'error',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.taskType,
                        __payload,
                        new Date(),
                      );

                      nodeInstance.payload = Object.assign({}, nodeInstance.payload, { error: err });
                      emitToError(nodeInstance, newCallStack);
                      __payload = null;
                      _callstack = null;
                    },
                    next: (incomingPayload: any) => {
                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'ok',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.taskType,
                        {...incomingPayload},
                        new Date(),
                      );

                      nodeInstance.payload = incomingPayload.payload ? incomingPayload.payload : incomingPayload;
                      emitToOutputs(nodeInstance, newCallStack);

                      __payload = null;
                      _callstack = null;
                      newCallStack = null;
                    },
                  };

                  if (node.subscription) {
                    node.subscription.unsubscribe();
                    node.subscription = null;
                  }

                  node.subscription = result.subscribe(observer);
                } else if (typeof result === 'object' && typeof result.then === 'function') {
                  // Promise
                  result.then((incomingPayload: any) => {
                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'ok',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.taskType,
                        {...incomingPayload},
                        new Date(),
                      );

                      nodeInstance.payload = {...incomingPayload};
                      emitToOutputs(nodeInstance, newCallStack);

                      __payload = null;
                      _callstack = null;
                      newCallStack = null;
                    })
                    .catch((err: any) => {
                      this.services.logMessage(err);

                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'error',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.taskType,
                        nodeInstance.payload,
                        new Date(),
                      );

                      nodeInstance.payload = Object.assign({}, nodeInstance.payload, { error: err });
                      emitToError(nodeInstance, newCallStack);

                      __payload = null;
                      _callstack = null;
                      newCallStack = null;
                    });
                } else if (typeof result === 'object') {
                  FlowEventRunnerHelper.callMiddleware(
                    this.middleware,
                    'ok',
                    nodeInstance.id,
                    nodeInstance.name,
                    node.taskType,
                    result,
                    new Date(),
                  );

                  nodeInstance.payload = {...result};
                  emitToOutputs(nodeInstance, newCallStack);

                  __payload = null;
                  _callstack = null;
                  newCallStack = null;
                } else if (typeof result === 'boolean' && result === true) {
                  FlowEventRunnerHelper.callMiddleware(
                    this.middleware,
                    'ok',
                    nodeInstance.id,
                    nodeInstance.name,
                    node.taskType,
                    nodeInstance.payload,
                    new Date(),
                  );

                  emitToOutputs(nodeInstance, newCallStack);
                  __payload = null;
                  _callstack = null;
                  newCallStack = null;

                } else if (typeof result === 'boolean' && result === false) {
                  FlowEventRunnerHelper.callMiddleware(
                    this.middleware,
                    'error',
                    nodeInstance.id,
                    nodeInstance.name,
                    node.taskType,
                    nodeInstance.payload,
                    new Date(),
                  );

                  emitToError(nodeInstance, newCallStack);

                  newCallStack = null;
                  __payload = null;
                  _callstack = null;

                }
                
              } catch (err) {
                this.services.logMessage(err);
                const payloadForNotification = Object.assign({}, nodeInstance.payload);
                payloadForNotification.response = undefined;
                payloadForNotification.request = undefined;

                emitToError(nodeInstance, _callstack);

                __payload = null;
                _callstack = null;
              }

              
              
              _payload = null;
              
            });

            
          });

          return nodeInfo;
        }
      });

    autostarters.map((nodeId: any) => {
      nodeEmitter.emit(nodeId.toString(), {}, {});
    });

    if (!!autoStartNodes) {
      this.nodes.map((nodeInfo: any) => {
        if (nodeInfo.pluginInstance.getPackageType() !== FlowTaskPackageType.FUNCTION_INPUT_NODE) {
          if (nodeInfo.inputs.length === 0) {
            nodeEmitter.emit(nodeInfo.nodeId.toString(), {}, {});
          }
        }
      });
    }
  };

  public destroyFlow = () => {
    this.flowEventEmitter.removeListener('error');
    if (this.nodes) {
      this.nodes.map((nodeInfo: any) => {
        if (nodeInfo && nodeInfo.nodeId) {
          this.flowEventEmitter.removeListener(nodeInfo.nodeId);
        }
        if (nodeInfo.subscription) {
          nodeInfo.subscription.unsubscribe();
          nodeInfo.subscription = undefined;
        }
        if (nodeInfo.pluginInstance && nodeInfo.pluginInstance.kill) {
          nodeInfo.pluginInstance.kill();
        }
        nodeInfo.pluginInstance = undefined;
        nodeInfo.inputs = [];
        nodeInfo.outputs = [];
        nodeInfo.error = [];
      });
    }
    this.nodes = [];
    this.observables.map(observableHelper => {
      if (observableHelper && observableHelper.observable) {
        (observableHelper.observable as any).complete();
      }
    });
    this.observables = [];
    this.nodeValues = {};
    this.nodeNames = [];
  };

  public getFunctionNodeId = (title: any) => {
    if (typeof this.functionNodes[title] !== 'undefined' && this.functionNodes[title] !== '') {
      return this.functionNodes[title];
    }
    return false;
  };

  public callNode = (nodeId: any, payload: any) => {
    this.flowEventEmitter.emit(nodeId.toString(), payload, {});
  };

  public triggerEventOnNode = (nodeName: any, eventName: string, payload: any) => {
    return this.executeNode(nodeName, payload, undefined, eventName);
  };

  public executeNode = (nodeName: any, payload: any, callStack?: any, eventName?: string) => {
    let self = this;
    let _payload = {...payload};
    let _callstack = callStack ? {...callStack} : {};
    let tempNodeId: any;
    let tempErrorNodeId: any;

    tempNodeId = uuidV4().toString();
    tempErrorNodeId = uuidV4().toString();

    return new Promise((resolve: any, reject: any) => {

      let innerPromise = new Promise((innerresolve: any, innerreject: any) => {    

        function onResult(localPayload: any) {
          //self.services.logMessage('executeNode result', localPayload);        
          innerresolve(localPayload);
        }

        function onError() {
          //self.services.logMessage('executeNode result', localPayload);      
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
            _callstack,
          );

          self.flowEventEmitter.emit(
            nodeId.toString() + (eventName !== undefined ? '_' + eventName : ''),
            _payload,
            newCallStack,
          );

          _payload = null;
          _callstack = null;

        } catch (err) {
          this.services.logMessage('executeNode error', err);
          _payload = null;
          _callstack = null;
          innerreject();
        }

      }).then((localPayload) => {
        
        self.flowEventEmitter.removeListener(tempNodeId);
        self.flowEventEmitter.removeListener(tempErrorNodeId);

        (self as any) = null;
        tempNodeId = null;
        tempErrorNodeId = null;

        resolve(localPayload);
      }).catch(() => {
        
        self.flowEventEmitter.removeListener(tempNodeId);
        self.flowEventEmitter.removeListener(tempErrorNodeId);

        (self as any) = null;
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
        if (typeof this.functionNodes[nodeName] !== 'undefined' && self.functionNodes[nodeName] !== '') {
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
  ) => {
    if (customServices !== undefined) {
      this.services = customServices;
      this.services.flowEventRunner = this;
    } else {
      this.services = {
        flowEventRunner: this,
        logMessage: (...args) => {},
        pluginClasses: {},
        registerModel: (modelName: string, definition: any) => {},
      };
    }

    if (mergeWithDefaultPlugins === undefined || mergeWithDefaultPlugins === true) {
      this.services.pluginClasses['AssignTask'] = AssignTask;
      this.services.pluginClasses['ClearTask'] = ClearTask;
      this.services.pluginClasses['ForwardTask'] = ForwardTask;
      this.services.pluginClasses['InjectIntoPayloadTask'] = InjectIntoPayloadTask;
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

    this.services.pluginClasses = Object.assign({}, this.services.pluginClasses, this.tasks);

    return new Promise((resolve: any, reject: any) => {
      try {
        this.createNodes(flowPackage.flow, autoStartNodes);

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

  public setPropertyOnNode = (nodeName: string, propertyName: string, value: any) => {
    const nodeId: string = this.nodeNames[nodeName as any];
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

  private errorListener = (err: any) => {
    console.error('error in FlowEventRunner EventEmitter');
    console.log(err);
  };
}
