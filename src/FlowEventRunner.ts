import * as Rx from '@reactivex/rxjs';
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
  observable: Rx.Observable<any>;
}

export interface ITaskMetaData {
  configMetaData: string;
  fullName: string;
  name: string;
  className: string;
  shape: string;
}

export class FlowEventRunner {
  public services: IServicesInterface;

  private nodeValues: any = {};
  private nodes: any;
  private nodeNames: string[] = [];
  private flowEventEmitter: any;
  private tasks: any = {};

  private middleware: any = [];
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

  public createNodes = (nodeList: any[]) => {
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

        // node is the actual node on flow-level (it contains just the basic properties defined in the flow)
        node.payload = {};

        if (node.subtype === 'registrate') {
          FlowEventRunnerHelper.registerNode(node, nodePluginInfoMap, this.services, this.flowNodeRegisterHooks);
          return;
        }

        // nodeInfo contains the info needed to run the plugin on and list of input/output nodes and
        // which nodes are used for injection on each run of a plugin
        const nodeInfo = BuildNodeInfoHelper.build(nodeList, node, nodePluginInfoMap);

        this.nodeNames[node.name] = node.id;

        // nodePluginInfo contains info about the the plugin such as the plugInstance, className and config metadata
        const nodePluginInfo = nodePluginInfoMap[node.taskType];
        if (typeof nodePluginInfo !== 'undefined' && typeof nodePluginInfo.pluginInstance !== 'undefined') {
          this.flowNodeTriggers.map((flowNodeTrigger: any) => {
            flowNodeTrigger(nodePluginInfo.pluginInstance.getPackageType(), node, (payload: any, callStack: any) => {
              nodeEmitter.emit(node.id.toString(), payload, callStack);
            });
          });
        }

        if (typeof nodePluginInfo !== 'undefined') {
          this.flowNodeOverrideAttachHooks.map((hook: any) => {
            if (hook(node, nodePluginInfo.pluginInstance, this.flowEventEmitter, nodeInfo)) {
              return;
            }
          });

          if (node.subtype === 'autostart') {
            autostarters.push(node.id.toString());
          }

          if (nodePluginInfo.pluginInstance.getObservable !== undefined) {
            this.observables.push({
              name: node.name || node.title.replace(/ /g, ''),
              nodeId: node.id,
              observable: nodePluginInfo.pluginInstance.getObservable(node),
            });
          }

          if (nodePluginInfo.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_INPUT_NODE) {
            this.functionNodes[node.name] = node.id.toString();
            this.services.logMessage(this.functionNodes);
          }

          nodeEmitter.on(node.id.toString(), (payload: any, callStack: any) => {
            // TODO :
            const currentNode = Object.assign({}, node, this.nodeValues[node.id]);

            const injectionValues: any = {};
            const injectionPromises: any = InjectionHelper.executeInjections(
              currentNode,
              nodeInfo,
              injectionValues,
              payload,
              this.services,
              callStack,
              this.middleware,
            );

            Promise.all(injectionPromises).then(() => {
              // nodeInstance contains the payload and is the current instance of the node which
              // is used to execute the plugin on.
              const nodeInstance = Object.assign({}, currentNode, { followNodes: nodeInfo.manuallyToFollowNodes });

              nodeInstance.payload = Object.assign({}, payload, injectionValues);

              if (node.subtype === 'start') {
                callStack.sessionId = uuidV4();
              }

              this.services.logMessage('EVENT Received for node: ', nodeInfo.name, node.id.toString());

              function emitToOutputs(currentNodeInstance: any, currentCallStack: any) {
                EmitOutput.emitToOutputs(nodePluginInfo, nodeEmitter, nodeInfo, currentNodeInstance, currentCallStack);
              }

              function emitToError(currentNodeInstance: any, currentCallStack: any) {
                EmitOutput.emitToError(nodePluginInfo, nodeEmitter, nodeInfo, currentNodeInstance, currentCallStack);
              }

              try {
                const newCallStack = callStack;

                if (nodePluginInfo.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_NODE) {
                  if (typeof nodeInstance.payload.followFlow !== 'undefined') {
                    if (nodeInstance.payload.followFlow === 'isError') {
                      emitToOutputs(nodeInstance, newCallStack);
                      return;
                    }
                  }
                }

                if (
                  nodePluginInfo.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE &&
                  nodePluginInfo.pluginInstance.getPackageType() !== FlowTaskPackageType.FUNCTION_OUTPUT_NODE
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

                const result = nodePluginInfo.pluginInstance.execute(nodeInstance, this.services, newCallStack);

                if (result instanceof Rx.Observable || result instanceof Rx.Subject) {
                  if (nodePluginInfo.pluginInstance.getObservable === undefined) {
                    this.observables.push({
                      name: nodeInstance.name || nodeInstance.title.replace(/ /g, ''),
                      nodeId: nodeInstance.id,
                      observable: result,
                    });
                  }

                  const observer = {
                    complete: () => {
                      this.services.logMessage('Completed observable for ', nodeInstance.name);
                    },
                    error: (err: any) => {
                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'error',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.taskType,
                        payload,
                      );

                      nodeInstance.payload = Object.assign({}, nodeInstance.payload, { error: err });
                      emitToError(nodeInstance, newCallStack);
                    },
                    next: (incomingPayload: any) => {
                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'ok',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.taskType,
                        incomingPayload,
                      );

                      nodeInstance.payload = incomingPayload;
                      emitToOutputs(nodeInstance, newCallStack);
                    },
                  };

                  result.subscribe(observer);
                } else if (typeof result === 'object' && typeof result.then === 'function') {
                  // Promise
                  result
                    .then((incomingPayload: any) => {
                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'ok',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.taskType,
                        incomingPayload,
                      );

                      nodeInstance.payload = incomingPayload;
                      emitToOutputs(nodeInstance, newCallStack);
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
                      );

                      nodeInstance.payload = Object.assign({}, nodeInstance.payload, { error: err });
                      emitToError(nodeInstance, newCallStack);
                    });
                } else if (typeof result === 'object') {
                  FlowEventRunnerHelper.callMiddleware(
                    this.middleware,
                    'ok',
                    nodeInstance.id,
                    nodeInstance.name,
                    node.taskType,
                    result,
                  );

                  nodeInstance.payload = result;
                  emitToOutputs(nodeInstance, newCallStack);
                } else if (typeof result === 'boolean' && result === true) {
                  FlowEventRunnerHelper.callMiddleware(
                    this.middleware,
                    'ok',
                    nodeInstance.id,
                    nodeInstance.name,
                    node.taskType,
                    nodeInstance.payload,
                  );

                  emitToOutputs(nodeInstance, newCallStack);
                } else if (typeof result === 'boolean' && result === false) {
                  FlowEventRunnerHelper.callMiddleware(
                    this.middleware,
                    'error',
                    nodeInstance.id,
                    nodeInstance.name,
                    node.taskType,
                    nodeInstance.payload,
                  );

                  emitToError(nodeInstance, newCallStack);
                }
              } catch (err) {
                this.services.logMessage(err);
                const payloadForNotification = Object.assign({}, nodeInstance.payload);
                payloadForNotification.response = undefined;
                payloadForNotification.request = undefined;

                emitToError(nodeInstance, callStack);
              }
            });
          });

          return nodeInfo;
        }
      });

    autostarters.map((nodeId: any) => {
      nodeEmitter.emit(nodeId.toString(), {}, {});
    });
  };

  public destroyFlow = () => {
    this.flowEventEmitter.removeListener('error');
    if (this.nodes) {
      this.nodes.map((nodeInfo: any) => {
        if (nodeInfo && nodeInfo.nodeId) {
          this.flowEventEmitter.removeListener(nodeInfo.nodeId);
        }
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

  public executeNode = (nodeName: any, payload: any, callStack?: any) => {
    const self = this;
    return new Promise((resolve: any, reject: any) => {
      let tempNodeId: any;
      let tempErrorNodeId: any;

      function onResult(localPayload: any) {
        self.services.logMessage('executeNode result', localPayload);
        self.flowEventEmitter.removeListener(tempNodeId, onResult);
        self.flowEventEmitter.removeListener(tempErrorNodeId, onError);
        resolve(localPayload);
      }

      function onError(localPayload: any) {
        self.services.logMessage('executeNode result', localPayload);
        self.flowEventEmitter.removeListener(tempNodeId, onResult);
        self.flowEventEmitter.removeListener(tempErrorNodeId, onError);
        reject();
      }

      try {
        tempNodeId = uuidV4().toString();
        tempErrorNodeId = uuidV4().toString();
        const nodeId = self.nodeNames[nodeName];

        self.flowEventEmitter.on(tempNodeId, onResult);
        self.flowEventEmitter.on(tempErrorNodeId, onError);

        const newCallStack = Object.assign(
          {},
          {
            error: [{ endshapeid: tempErrorNodeId }],
            outputs: [{ endshapeid: tempNodeId }],
          },
          callStack,
        );

        self.flowEventEmitter.emit(nodeId.toString(), payload, newCallStack);
      } catch (err) {
        this.services.logMessage('executeNode error', err);
        reject();
      }
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

  public start = (flowPackage: any, customServices?: IServicesInterface, mergeWithDefaultPlugins: boolean = true) => {
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
        this.createNodes(flowPackage.flow);

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
