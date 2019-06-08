import * as Rx from '@reactivex/rxjs';
import * as Promise from 'promise';
import * as uuid from 'uuid';
import * as FlowTaskPackageType from './FlowTaskPackageType';
import { FlowEventRunnerHelper } from './helpers/FlowEventRunnerHelper';
import { ReactiveEventEmitter } from './helpers/ReactiveEventEmitter';
import { AssignTask } from './plugins/AssignTask';
import { ClearTask } from './plugins/ClearTask';
import { ForwardTask } from './plugins/ForwardTask';
import { FunctionCallTask } from './plugins/FunctionCallTask';
import { FunctionInputTask } from './plugins/FunctionInputTask';
import { FunctionOutputTask } from './plugins/FunctionOutputTask';
import { IfConditionTask } from './plugins/IfConditionTask';
import { ObserverTask } from './plugins/ObserverTask';
import { ServicesInterface } from './interfaces/ServicesInterface';
import { TraceConsoleTask } from './plugins/TraceConsoleTask';

const uuidV4 = uuid.v4;

interface registeredObservable {
  nodeId : string;
  observable : Rx.Observable<any>;
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

  createNodes = (nodeList: any) => {
    const nodeEmitter: any = new ReactiveEventEmitter();

    this.flowEventEmitter = nodeEmitter;

    nodeEmitter.on('error', (err: any) => {
      console.error('error in FlowEventRunner EventEmitter');
      console.log(err);
    });

    const nodeTypes: any = {};
    const autostarters: any = [];

    for (const pluginClassName in this.services.pluginClasses) {
      if (this.services.pluginClasses.hasOwnProperty(pluginClassName)) {
        const pluginClass = this.services.pluginClasses[pluginClassName];
        const pluginInstance = new pluginClass();

        nodeTypes[pluginInstance.getName()] = {
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
        const thisNode = node;
        thisNode.payload = {};

        if (node.subtype === 'registrate') {
          this.services.logMessage('REGISTRATE ' + node.title);

          const nodeTaskForCurrentNode = nodeTypes[node.shapeType];
          const nodeInstance = Object.assign({}, thisNode);

          if (typeof nodeTaskForCurrentNode !== 'undefined') {
            this.flowNodeRegisterHooks.map((hook: any) => {
              if (hook(node, nodeTaskForCurrentNode.pluginInstance)) {
                return;
              }
            });

            const result = nodeTaskForCurrentNode.pluginInstance.execute(nodeInstance, this.services, {});
            if (typeof result === 'object' && typeof result.then === 'function') {
              result.then((payload: any) => {
                this.services.registerModel(node.modelname, payload.modelDefinition);
              });
            }
          }
          return;
        }

        // followflow onfailure
        const nodeEvent = Object.assign(
          {},
          {
            error: nodeList.filter(
              (o: any) =>
                o.startshapeid === node.id.toString() && o.shapeType === 'line' && o.followflow === 'onfailure',
            ),
            // TODO : hier direct de nodes uitlezen en de variabelen die geinjecteerd moeten
            // worden toevoegen
            injections: FlowEventRunnerHelper.getInjections(node.id.toString(), nodeList, nodeTypes),
            inputs: nodeList.filter(
              (o: any) =>
                o.endshapeid === node.id.toString() &&
                o.shapeType === 'line' &&
                o.followflow !== 'followManually' &&
                o.followflow !== 'injectConfigIntoPayload',
            ),
            manuallyToFollowNodes: FlowEventRunnerHelper.getManuallyToFollowNodes(
              nodeList.filter(
                (o: any) =>
                  o.startshapeid === node.id.toString() && o.shapeType === 'line' && o.followflow === 'followManually',
              ),
              nodeList,
            ),
            nodeId: node.id,
            outputs: nodeList.filter(
              (o: any) =>
                o.startshapeid === node.id.toString() &&
                o.shapeType === 'line' &&
                o.followflow !== 'onfailure' &&
                o.followflow !== 'followManually' &&
                o.followflow !== 'injectConfigIntoPayload',
            ),
            title: node.title,
          },
        );

        const nodeType = nodeTypes[node.shapeType];
        if (typeof nodeType !== 'undefined' && typeof nodeType.pluginInstance !== 'undefined') {
          this.flowNodeTriggers.map((flowNodeTrigger: any) => {
            flowNodeTrigger(nodeType.pluginInstance.getPackageType(), thisNode, (payload: any, callStack: any) => {
              nodeEmitter.emit(thisNode.id.toString(), payload, callStack);
            });
          });
        }

        if (typeof nodeType !== 'undefined') {
          this.flowNodeOverrideAttachHooks.map((hook: any) => {
            if (hook(thisNode, nodeType.pluginInstance, this.flowEventEmitter, nodeEvent)) {
              return;
            }
          });

          if (thisNode.subtype === 'autostart') {
            autostarters.push(node.id.toString());
          }

          if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_INPUT_NODE) {
            this.functionNodes[node.title] = node.id.toString();
          }

          nodeEmitter.on(node.id.toString(), (payload: any, callStack: any) => {
            const injectionValues: any = {};
            const injectionPromises: any = [];
            nodeEvent.injections.map((nodeInjection: any) => {
              const nodeInstance = Object.assign({}, nodeInjection.node);
              nodeInstance.payload = Object.assign({}, payload);
              const result = nodeInjection.pluginInstance.execute(nodeInstance, this.services, callStack);

              if (typeof result === 'object' && typeof result.then === 'function') {
                result
                  .then((payloadResult: any) => {
                    payloadResult.response = null;
                    payloadResult.request = null;

                    FlowEventRunnerHelper.callMiddleware(
                      this.middleware,
                      'injection',
                      nodeInstance.id,
                      nodeInstance.title,
                      node.shapeType,
                      payloadResult,
                    );

                    for (const property in payloadResult) {
                      if (typeof payloadResult[property] === 'undefined' || payloadResult[property] === null) {
                        continue;
                      }
                      if (!payloadResult.hasOwnProperty(property)) {
                        continue;
                      }
                      injectionValues[property] = payloadResult[property];
                    }
                  })
                  .catch((err: any) => {
                    console.log('injection promise failed', err);
                  });
              } else if (typeof result === 'object') {
                FlowEventRunnerHelper.callMiddleware(
                  this.middleware,
                  'injection',
                  nodeInstance.id,
                  nodeInstance.title,
                  node.shapeType,
                  payload,
                );

                for (const property in result) {
                  if (!result.hasOwnProperty(property)) {
                    continue;
                  }
                  injectionValues[property] = result[property];
                }
              }

              injectionPromises.push(result);
            });

            Promise.all(injectionPromises).then(() => {
              const nodeInstance = Object.assign({}, thisNode, { followNodes: nodeEvent.manuallyToFollowNodes });

              nodeInstance.payload = Object.assign({}, payload, injectionValues);

              if (thisNode.subtype === 'start') {
                callStack.sessionId = uuidV4();
              }

              console.log('EVENT Received for node: ', nodeEvent.title, node.id.toString());

              function emitToOutputs(currentNodeInstance: any, currentCallStack: any) {
                let followFlow = '';

                if (
                  typeof currentNodeInstance.payload.followFlow !== 'undefined' &&
                  currentNodeInstance.payload.followFlow
                ) {
                  currentNodeInstance.payload._forwardFollowFlow = currentNodeInstance.payload.followFlow;
                }

                if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_OUTPUT_NODE) {
                  const newPayload = Object.assign({}, currentNodeInstance.payload);
                  delete newPayload.followFlow;

                  // TODO: Is this needed?
                  if (
                    typeof currentNodeInstance.payload.followFlow !== 'undefined' &&
                    currentNodeInstance.payload.followFlow
                  ) {
                    followFlow = currentNodeInstance.payload.followFlow;

                    if (followFlow === 'isError') {
                      currentNodeInstance.payload._functionErrorOutputs.map((errorNode: any) => {
                        nodeEmitter.emit(errorNode.endshapeid.toString(), newPayload, currentCallStack);
                      });
                      return;
                    }
                  }
                  // END CHECK TODO: Is this needed?

                  if (typeof currentCallStack.outputs !== 'undefined') {
                    const upperCallStack = currentCallStack.callStack;
                    currentCallStack.outputs.map((outputNode: any) => {
                      nodeEmitter.emit(outputNode.endshapeid.toString(), newPayload, upperCallStack);
                    });
                  }
                } else if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_NODE) {
                  const newCallStack = {
                    callStack: currentCallStack,
                    callStackType: 'FUNCTION',
                    error: nodeEvent.error,
                    outputs: nodeEvent.outputs,
                    returnNodeId: currentNodeInstance.id,
                  };

                  nodeEmitter.emit(
                    currentNodeInstance.functionnodeid.toString(),
                    currentNodeInstance.payload,
                    newCallStack,
                  );
                } else {
                  if (
                    typeof currentNodeInstance.payload.followFlow !== 'undefined' &&
                    currentNodeInstance.payload.followFlow
                  ) {
                    followFlow = currentNodeInstance.payload.followFlow;

                    if (followFlow === 'isError') {
                      if (nodeType.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE) {
                        currentNodeInstance.payload.followFlow = undefined;
                      }

                      emitToError(currentNodeInstance, currentCallStack);
                      return;
                    }
                  }

                  if (nodeType.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE) {
                    currentNodeInstance.payload.followFlow = undefined;
                  }

                  delete currentNodeInstance.payload.errors;

                  console.log('nodeEvent.outputs', nodeEvent.outputs.length);
                  nodeEvent.outputs.map((nodeOutput: any) => {
                    if (followFlow === '' || (followFlow !== '' && nodeOutput.title === followFlow)) {
                      console.log('before emit', nodeOutput.endshapeid.toString());
                      nodeEmitter.emit(nodeOutput.endshapeid.toString(), currentNodeInstance.payload, currentCallStack);
                    }
                  });
                }
              }

              function emitToError(currentNodeInstance: any, currentCallStack: any) {
                if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_OUTPUT_NODE) {
                  const newPayload = Object.assign({}, currentNodeInstance.payload);

                  if (typeof newPayload.followFlow !== 'undefined' && newPayload.followFlow) {
                    newPayload._forwardFollowFlow = newPayload.followFlow;
                  }

                  // delete _payload._functionOutputs;
                  // delete _payload._functionErrorOutputs;
                  delete newPayload.followFlow;

                  /* nodeInstance.payload._functionErrorOutputs.map((node) => {
                  nodeEmitter.emit(node.endshapeid.toString(), _payload, callStack)
                })
                */

                  const upperCallStack = currentCallStack.callStack;
                  currentCallStack.error.map((currentNode: any) => {
                    nodeEmitter.emit(currentNode.endshapeid.toString(), newPayload, upperCallStack);
                  });
                } else {
                  if (
                    typeof currentNodeInstance.payload.followFlow !== 'undefined' &&
                    currentNodeInstance.payload.followFlow
                  ) {
                    currentNodeInstance.payload._forwardFollowFlow = currentNodeInstance.payload.followFlow;
                  }

                  nodeEvent.error.map((currentNode: any) => {
                    nodeEmitter.emit(currentNode.endshapeid.toString(), currentNodeInstance.payload, currentCallStack);
                  });
                }
              }

              try {
                const newCallStack = callStack;

                if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_NODE) {
                  if (typeof nodeInstance.payload.followFlow !== 'undefined') {
                    if (nodeInstance.payload.followFlow === 'isError') {
                      emitToOutputs(nodeInstance, newCallStack);
                      return;
                    }
                  }
                }

                if (
                  nodeType.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE &&
                  nodeType.pluginInstance.getPackageType() !== FlowTaskPackageType.FUNCTION_OUTPUT_NODE
                ) {
                  if (typeof nodeInstance.payload.followFlow !== 'undefined') {
                    delete nodeInstance.payload.followFlow;
                  }
                } else {
                  if (nodeInstance.payload._forwardFollowFlow !== undefined) {
                    nodeInstance.payload.followFlow = nodeInstance.payload._forwardFollowFlow;
                  }
                }
                nodeInstance.payload._forwardFollowFlow = undefined;

                const result = nodeType.pluginInstance.execute(nodeInstance, this.services, newCallStack);
                if (result instanceof Rx.Observable) {
                  
                  this.observables.push({
                    nodeId: nodeInstance.id,
                    observable: result
                  });

                  const observer = {
                    complete: () => {
                      console.log('Completed observable for ', nodeInstance.title);
                    },
                    error: (err: any) => {
                      FlowEventRunnerHelper.callMiddleware(
                        this.middleware,
                        'error',
                        nodeInstance.id,
                        nodeInstance.title,
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
                        nodeInstance.title,
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
                        nodeInstance.title,
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
                        nodeInstance.title,
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
                    nodeInstance.title,
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
                    nodeInstance.title,
                    node.shapeType,
                    nodeInstance.payload,
                  );

                  emitToOutputs(nodeInstance, newCallStack);
                } else if (typeof result === 'boolean' && result === false) {
                  FlowEventRunnerHelper.callMiddleware(
                    this.middleware,
                    'error',
                    nodeInstance.id,
                    nodeInstance.title,
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

          return nodeEvent;
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

  getObservableForNode = (nodeId: string) => {
    return false;
  };

  executeFlowFunction = (flowFunctionName: any) => {
    let self = this;
    return new Promise((resolve: any, reject: any) => {
      let tempNodeId: any;

      function onFunctionResult(payload: any) {
        self.flowEventEmitter.removeListener(tempNodeId, onFunctionResult);
        resolve(payload);
      }

      try {
        if (
          typeof this.functionNodes[flowFunctionName] !== 'undefined' &&
          self.functionNodes[flowFunctionName] !== ''
        ) {
          tempNodeId = uuidV4().toString();
          const nodeId = self.functionNodes[flowFunctionName];

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
}
