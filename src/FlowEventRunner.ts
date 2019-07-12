import * as Rx from '@reactivex/rxjs';
import * as Promise from 'promise';
import * as uuid from 'uuid';
import * as FlowTaskPackageType from './FlowTaskPackageType';
import { BuildNodeInfoHelper } from './helpers/BuildNodeInfoHelper';
import { EmitOutput } from './helpers/EmitOutput';
import { FlowEventRunnerHelper } from './helpers/FlowEventRunnerHelper';
import { InjectionHelper } from './helpers/InjectionHelper';
import { ReactiveEventEmitter } from './helpers/ReactiveEventEmitter';
import { AssignTask } from './plugins/AssignTask';
import { ClearTask } from './plugins/ClearTask';
import { ForwardTask } from './plugins/ForwardTask';
import { FunctionCallTask } from './plugins/FunctionCallTask';
import { FunctionInputTask } from './plugins/FunctionInputTask';
import { FunctionOutputTask } from './plugins/FunctionOutputTask';
import { IfConditionTask } from './plugins/IfConditionTask';
import { ObservableTask } from './plugins/ObservableTask';
import { ObserverTask } from './plugins/ObserverTask';
import { ServicesInterface } from './interfaces/ServicesInterface';
import { TraceConsoleTask } from './plugins/TraceConsoleTask';

const uuidV4 = uuid.v4;

export interface registeredObservable {
  nodeId: string;
  name: string;
  observable: Rx.Observable<any>;
}

export interface TaskMetaData {
  configMetaData: string;
  fullName: string;
  name: string;
  className: string;
  shape: string;
}

export class FlowEventRunner {
  constructor() {
    this.services = {
      logMessage: (message?: string) => {},
      pluginClasses: [],
      registerModel: (modelName: string, definition: any) => {},
    };
  }

  services: ServicesInterface;

  nodes: any;
  nodeNames: any[] = [];
  flowEventEmitter: any;
  tasks: any = {};

  middleware: any = [];
  functionNodes: any = [];
  flowNodeTriggers: any = [];
  flowNodeRegisterHooks: any = [];
  flowNodeOverrideAttachHooks: any = [];
  observables: registeredObservable[] = [];

  // TODO : refactor .. this method does too much
  // - creating events foreach node
  // - creating http get/post handlers
  // - instantiate plugins
  // - emit events to output nodes
  // - calling plugin execute or executeAsHTTPEndpoint
  //
  // split in multiple methods / classes

  createNodes = (nodeList: any[]) => {
    const nodeEmitter: any = new ReactiveEventEmitter();

    this.flowEventEmitter = nodeEmitter;

    nodeEmitter.on('error', (err: any) => {
      console.error('error in FlowEventRunner EventEmitter');
      console.log(err);
    });

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

    this.nodes = nodeList
      .filter((o: any) => o.shapeType !== 'line')
      .map((node: any) => {
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
        const nodePluginInfo = nodePluginInfoMap[node.shapeType];
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
              nodeId: node.id,
              name: node.name || node.title.replace(/ /g, ''),
              observable: nodePluginInfo.pluginInstance.getObservable(node),
            });
          }

          if (nodePluginInfo.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_INPUT_NODE) {
            this.functionNodes[node.name] = node.id.toString();
            console.log(this.functionNodes);
          }

          nodeEmitter.on(node.id.toString(), (payload: any, callStack: any) => {
            const injectionValues: any = {};
            const injectionPromises: any = InjectionHelper.executeInjections(
              node,
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
              const nodeInstance = Object.assign({}, node, { followNodes: nodeInfo.manuallyToFollowNodes });

              nodeInstance.payload = Object.assign({}, payload, injectionValues);

              if (node.subtype === 'start') {
                callStack.sessionId = uuidV4();
              }

              console.log('EVENT Received for node: ', nodeInfo.name, node.id.toString());

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
                      nodeId: nodeInstance.id,
                      name: nodeInstance.name || nodeInstance.title.replace(/ /g, ''),
                      observable: result,
                    });
                  }

                  const observer = {
                    complete: () => {
                      console.log('Completed observable for ', nodeInstance.name);
                    },
                    error: (err: any) => {
                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'error',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.shapeType,
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
                        node.shapeType,
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
                        node.shapeType,
                        incomingPayload,
                      );

                      nodeInstance.payload = incomingPayload;
                      emitToOutputs(nodeInstance, newCallStack);
                    })
                    .catch((err: any) => {
                      console.log(err);

                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'error',
                        nodeInstance.id,
                        nodeInstance.name,
                        node.shapeType,
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
                    node.shapeType,
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
                    node.shapeType,
                    nodeInstance.payload,
                  );

                  emitToOutputs(nodeInstance, newCallStack);
                } else if (typeof result === 'boolean' && result === false) {
                  FlowEventRunnerHelper.callMiddleware(
                    this.middleware,
                    'error',
                    nodeInstance.id,
                    nodeInstance.name,
                    node.shapeType,
                    nodeInstance.payload,
                  );

                  emitToError(nodeInstance, newCallStack);
                }
              } catch (err) {
                const payloadForNotification = Object.assign({}, nodeInstance.payload);
                payloadForNotification.response = undefined;
                payloadForNotification.request = undefined;
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

  getFunctionNodeId = (title: any) => {
    if (typeof this.functionNodes[title] !== 'undefined' && this.functionNodes[title] !== '') {
      return this.functionNodes[title];
    }
    return false;
  };

  callNode = (nodeId: any, payload: any) => {
    this.flowEventEmitter.emit(nodeId.toString(), payload, {});
  };

  executeNode = (nodeName: any, payload: any) => {
    let self = this;
    return new Promise((resolve: any, reject: any) => {
      let tempNodeId: any;

      function onResult(payload: any) {
        console.log('executeNode result', payload);
        self.flowEventEmitter.removeListener(tempNodeId, onResult);
        resolve(payload);
      }

      try {
        tempNodeId = uuidV4().toString();
        const nodeId = self.nodeNames[nodeName];

        self.flowEventEmitter.on(tempNodeId, onResult);
        const callStack = {
          error: [],
          outputs: [{ endshapeid: tempNodeId }],
        };
        self.flowEventEmitter.emit(nodeId.toString(), payload, callStack);
      } catch (err) {
        console.log('executeNode error', err);
        reject();
      }
    });
  };

  getFlowEventEmitter = () => {
    return this.flowEventEmitter;
  };

  registerFlowNodeTrigger = (effect: any) => {
    this.flowNodeTriggers.push(effect);
  };

  registerFlowNodeRegisterHook = (hook: any) => {
    this.flowNodeRegisterHooks.push(hook);
  };

  registerFlowNodeOverrideAttachHook = (hook: any) => {
    this.flowNodeOverrideAttachHooks.push(hook);
  };

  registerTask = (taskName: string, taskClass: any) => {
    this.tasks[taskName] = taskClass;
    return true;
  };

  getObservableNode = (nodeName: string) => {
    let observables = this.observables.filter(observableNode => {
      return observableNode.name === nodeName;
    });
    return observables.length > 0 ? observables[0].observable : false;
  };

  executeFlowFunction = (nodeName: any) => {
    let self = this;
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
        console.log('executeFlowFunction error', err);
        reject();
      }
    });
  };

  start = (flowPackage: any, customServices?: ServicesInterface, mergeWithDefaultPlugins: boolean = true) => {
    if (customServices !== undefined) {
      this.services = customServices;
    } else {
      this.services = {
        logMessage: (message?: string) => {},
        pluginClasses: {},
        registerModel: (modelName: string, definition: any) => {},
      };
    }

    if (mergeWithDefaultPlugins === undefined || mergeWithDefaultPlugins === true) {
      this.services.pluginClasses['AssignTask'] = AssignTask;
      this.services.pluginClasses['ClearTask'] = ClearTask;
      this.services.pluginClasses['ForwardTask'] = ForwardTask;
      this.services.pluginClasses['ObserverTask'] = ObserverTask;
      this.services.pluginClasses['ObservableTask'] = ObservableTask;
      this.services.pluginClasses['TraceConsoleTask'] = TraceConsoleTask;
      this.services.pluginClasses['IfConditionTask'] = IfConditionTask;
      this.services.pluginClasses['FunctionCallTask'] = FunctionCallTask;
      this.services.pluginClasses['FunctionInputTask'] = FunctionInputTask;
      this.services.pluginClasses['FunctionOutputTask'] = FunctionOutputTask;
    }

    this.services.pluginClasses = Object.assign({}, this.services.pluginClasses, this.tasks);

    return new Promise((resolve: any, reject: any) => {
      try {
        this.createNodes(flowPackage.flow);

        resolve(this.services);
      } catch (err) {
        console.log('setup failed! error', err);
        reject();
      }
    });
  };

  getTaskMetaData = (): TaskMetaData[] => {
    let metaData: TaskMetaData[] = [];
    for (const pluginClassName in this.services.pluginClasses) {
      if (this.services.pluginClasses.hasOwnProperty(pluginClassName)) {
        const pluginClass = this.services.pluginClasses[pluginClassName];
        const pluginInstance = new pluginClass();

        metaData.push({
          configMetaData: pluginInstance.getConfigMetaData(),
          fullName: pluginInstance.getFullName(),
          name: pluginInstance.getName(),
          className: pluginClassName,
          shape: pluginInstance.getShape(),
        });
      }
    }

    return metaData;
  };
}
