import * as Rx from '@reactivex/rxjs';
import * as Promise from 'promise';
import * as uuid from 'uuid';
import * as FlowTaskPackageType from './FlowTaskPackageType';
import { EventEmitterHelper } from './helpers/EventEmitterHelper';
import { AssignTask } from './plugins/AssignTask';
import { ClearTask } from './plugins/ClearTask';
import { ForwardTask } from './plugins/ForwardTask';
import { FunctionCallTask } from './plugins/FunctionCallTask';
import { FunctionInputTask } from './plugins/FunctionInputTask';
import { FunctionOutputTask } from './plugins/FunctionOutputTask';
import { IfConditionTask } from './plugins/IfConditionTask';
import { ObserverTask } from './plugins/ObserverTask';
import { TraceConsoleTask } from './plugins/TraceConsoleTask';
const uuidV4 = uuid.v4;

let services: any;
let nodes: any;
let flowEventEmitter: any;

const middleware: any = [];
const functionNodes: any = [];
const flowNodeTriggers: any = [];
const flowNodeRegisterHooks: any = [];
const flowNodeOverrideAttachHooks: any = [];

function callMiddleware(result: any, id: any, title: any, nodeType: any, payload: any) {
  const cleanPayload = Object.assign({}, payload);

  cleanPayload.request = undefined;
  cleanPayload.response = undefined;

  middleware.map((middlewareFunction: any) => {
    middlewareFunction(result, id, title, nodeType, cleanPayload);
  });
}

function getNodeInjections(injections: any, nodeList: any) {
  const nodeInjections: any = [];
  if (injections.length > 0) {
    console.log('INJECTIONS getNodeInjections', injections);
  }
  injections.map((nodeRelation: any) => {
    console.log('nodeRelation injection', nodeRelation.startshapeid);

    nodeList.map((node: any) => {
      if (node.id === nodeRelation.startshapeid) {
        nodeInjections.push(node);

        console.log('getNodeInjections', node);
      }
    });
  });

  return nodeInjections;
}

function getManuallyToFollowNodes(manuallyToFollowNodes: any, nodeList: any) {
  return nodeList.filter((node: any) => {
    return typeof manuallyToFollowNodes.find((o: any) => o.endshapeid === node.id.toString()) !== 'undefined';
  });
}

function getInjections(injectIntoNodeId: any, nodeList: any, nodeTypes: any) {
  const injections: any = [];

  const nodeInjections = nodeList.filter(
    (o: any) =>
      o.endshapeid === injectIntoNodeId && o.shapeType === 'line' && o.followflow === 'injectConfigIntoPayload',
  );

  nodeInjections.map((nodeRelation: any) => {
    nodeList.map((node: any) => {
      if (node.id === nodeRelation.startshapeid) {
        const nodeType = nodeTypes[node.shapeType];
        if (typeof nodeType !== 'undefined') {
          const nodeInstance = Object.assign({}, node);
          nodeInstance.payload = {};

          injections.push({ pluginInstance: nodeType.pluginInstance, node });
          /*
					let result = nodeType.pluginInstance.execute(nodeInstance, _services);

					if (typeof result == "object" && typeof result.then == "function") {
						result.then((payload) => {
							
							for (var key in payload) {
								if (!payload.hasOwnProperty(key)) {
									continue;
								}
								injections[key] = payload[key];
							}	
						})
						.catch((err) => {
							console.log("injection promise failed",err)
						})
					} else if (typeof result == "object") {
						for (var key in result) {
							if (!result.hasOwnProperty(key)) {
								continue;
							}
							injections[key] = result[key];
						}
					}
					*/
        }
      }
    });
  });

  return injections;
}

// TODO : refactor .. this method does too much
// - creating events foreach node
// - creating http get/post handlers
// - instantiate plugins
// - emit events to output nodes
// - calling plugin execute or executeAsHTTPEndpoint
//
// split in multiple methods / classes

function createNodes(nodeList: any) {
  const nodeEmitter : any = EventEmitterHelper.getEventEmitter();
   
  flowEventEmitter = nodeEmitter;

  nodeEmitter.on('error', (err: any) => {
    console.error('error in FlowEventRunner EventEmitter');
    console.log(err);
  });

  const nodeTypes: any = {};
  const autostarters: any = [];

  for (const pluginClassName in services.pluginClasses) {
    if (services.pluginClasses.hasOwnProperty(pluginClassName)) {
      const pluginClass = services.pluginClasses[pluginClassName];
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

  nodes = nodeList
    .filter((o: any) => o.shapeType !== 'line')
    .map((node: any) => {
      const thisNode = node;
      thisNode.payload = {};

      if (node.subtype === 'registrate') {
        services.logMessage('REGISTRATE ' + node.title);

        const nodeTaskForCurrentNode = nodeTypes[node.shapeType];
        const nodeInstance = Object.assign({}, thisNode);

        if (typeof nodeTaskForCurrentNode !== 'undefined') {
          flowNodeRegisterHooks.map((hook: any) => {
            if (hook(node, nodeTaskForCurrentNode.pluginInstance)) {
              return;
            }
          });

          const result = nodeTaskForCurrentNode.pluginInstance.execute(nodeInstance, services, {});
          if (typeof result === 'object' && typeof result.then === 'function') {
            result.then((payload: any) => {
              services.registerModel(node.modelname, payload.modelDefinition);
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
            (o: any) => o.startshapeid === node.id.toString() && o.shapeType === 'line' && o.followflow === 'onfailure',
          ),
          // TODO : hier direct de nodes uitlezen en de variabelen die geinjecteerd moeten
          // worden toevoegen
          injections: getInjections(node.id.toString(), nodeList, nodeTypes),
          inputs: nodeList.filter(
            (o: any) =>
              o.endshapeid === node.id.toString() &&
              o.shapeType === 'line' &&
              o.followflow !== 'followManually' &&
              o.followflow !== 'injectConfigIntoPayload',
          ),
          manuallyToFollowNodes: getManuallyToFollowNodes(
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
        flowNodeTriggers.map((flowNodeTrigger: any) => {
          flowNodeTrigger(nodeType.pluginInstance.getPackageType(), thisNode, (payload: any, callStack: any) => {
            nodeEmitter.emit(thisNode.id.toString(), payload, callStack);
          });
        });
      }

      if (typeof nodeType !== 'undefined') {
        flowNodeOverrideAttachHooks.map((hook: any) => {
          if (hook(thisNode, nodeType.pluginInstance, flowEventEmitter, nodeEvent)) {
            return;
          }
        });

        if (thisNode.subtype === 'autostart') {
          autostarters.push(node.id.toString());
        }

        if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_INPUT_NODE) {
          functionNodes[node.title] = node.id.toString();
        }

        nodeEmitter.on(node.id.toString(), (payload: any, callStack: any) => {
          const injectionValues: any = {};
          const injectionPromises: any = [];
          nodeEvent.injections.map((nodeInjection: any) => {
            const nodeInstance = Object.assign({}, nodeInjection.node);
            nodeInstance.payload = Object.assign({}, payload);
            const result = nodeInjection.pluginInstance.execute(nodeInstance, services, callStack);

            if (typeof result === 'object' && typeof result.then === 'function') {
              result
                .then((payloadResult: any) => {
                  payloadResult.response = null;
                  payloadResult.request = null;

                  callMiddleware('injection', nodeInstance.id, nodeInstance.title, node.shapeType, payloadResult);

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
              callMiddleware('injection', nodeInstance.id, nodeInstance.title, node.shapeType, payload);

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

                console.log("nodeEvent.outputs",nodeEvent.outputs.length);
                nodeEvent.outputs.map((nodeOutput: any) => {
                  if (followFlow === '' || (followFlow !== '' && nodeOutput.title === followFlow)) {
                    console.log("before emit", nodeOutput.endshapeid.toString());
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

              const result = nodeType.pluginInstance.execute(nodeInstance, services, newCallStack);
              if (result instanceof Rx.Observable) {
                const observer = {
                  complete: () => {
                    console.log('Completed observable for ', nodeInstance.title);
                  },
                  error: (err: any) => {
                    callMiddleware('error', nodeInstance.id, nodeInstance.title, node.shapeType, payload);

                    nodeInstance.payload = Object.assign({}, nodeInstance.payload, { error: err });
                    emitToError(nodeInstance, newCallStack);
                  },
                  next: (incomingPayload: any) => {
                    callMiddleware('ok', nodeInstance.id, nodeInstance.title, node.shapeType, incomingPayload);

                    nodeInstance.payload = incomingPayload;
                    emitToOutputs(nodeInstance, newCallStack);
                  },
                };

                result.subscribe(observer);
              } else if (typeof result === 'object' && typeof result.then === 'function') {
                // Promise
                result
                  .then((incomingPayload: any) => {
                    callMiddleware('ok', nodeInstance.id, nodeInstance.title, node.shapeType, incomingPayload);

                    nodeInstance.payload = incomingPayload;
                    emitToOutputs(nodeInstance, newCallStack);
                  })
                  .catch((err: any) => {
                    console.log(err);

                    callMiddleware('error', nodeInstance.id, nodeInstance.title, node.shapeType, nodeInstance.payload);

                    nodeInstance.payload = Object.assign({}, nodeInstance.payload, { error: err });
                    emitToError(nodeInstance, newCallStack);
                  });
              } else if (typeof result === 'object') {
                callMiddleware('ok', nodeInstance.id, nodeInstance.title, node.shapeType, result);

                nodeInstance.payload = result;
                emitToOutputs(nodeInstance, newCallStack);
              } else if (typeof result === 'boolean' && result === true) {
                callMiddleware('ok', nodeInstance.id, nodeInstance.title, node.shapeType, nodeInstance.payload);

                emitToOutputs(nodeInstance, newCallStack);
              } else if (typeof result === 'boolean' && result === false) {
                callMiddleware('error', nodeInstance.id, nodeInstance.title, node.shapeType, nodeInstance.payload);

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
}

export const FlowEventRunner = {
  getFunctionNodeId: (title: any) => {
    if (typeof functionNodes[title] !== 'undefined' && functionNodes[title] !== '') {
      return functionNodes[title];
    }
    return false;
  },

  callNode: (nodeId: any, payload: any) => {
    flowEventEmitter.emit(nodeId.toString(), payload, {});
  },

  getFlowEventEmitter: () => {
    return flowEventEmitter;
  },

  useFlowNodeTrigger: (effect: any) => {
    flowNodeTriggers.push(effect);
  },

  useFlowNodeRegisterHook: (hook: any) => {
    flowNodeRegisterHooks.push(hook);
  },

  useFlowNodeOverrideAttachHook: (hook: any) => {
    flowNodeOverrideAttachHooks.push(hook);
  },

  executeFlowFunction: (flowFunctionName: any) => {
    return new Promise((resolve: any, reject: any) => {
      let tempNodeId: any;
      function onFunctionResult(payload: any) {
        flowEventEmitter.removeListener(tempNodeId, onFunctionResult);
        resolve(payload);
      }

      try {
        if (typeof functionNodes[flowFunctionName] !== 'undefined' && functionNodes[flowFunctionName] !== '') {
          tempNodeId = uuidV4().toString();
          const nodeId = functionNodes[flowFunctionName];

          flowEventEmitter.on(tempNodeId, onFunctionResult);
          const payload = {};
          // payload._functionOutputs = [{endshapeid:tempNodeId}];
          // payload._functionErrorOutputs = [];
          const callStack = {
            error: [],
            outputs: [{ endshapeid: tempNodeId }],
          };
          flowEventEmitter.emit(nodeId.toString(), payload, callStack);
        } else {
          reject();
        }
      } catch (err) {
        console.log('executeFlowFunction error', err);
        reject();
      }
    });
  },

  start: (flowPackage: any, customServices: any, mergeWithDefaultPlugins: any) => {
    if (customServices !== undefined) {
      services = customServices;
    } else {
      services = {
        logMessage: () => {},
        pluginClasses: {},
        registerModel: () => {},
      };
    }

    if (mergeWithDefaultPlugins === undefined || mergeWithDefaultPlugins === true) {
      services.pluginClasses['AssignTask'] = AssignTask;
      services.pluginClasses['ClearTask'] = ClearTask;
      services.pluginClasses['ForwardTask'] = ForwardTask;
      services.pluginClasses['ObserverTask'] = ObserverTask;
      services.pluginClasses['TraceConsoleTask'] = TraceConsoleTask;
      services.pluginClasses['IfConditionTask'] = IfConditionTask;
      services.pluginClasses['FunctionCallTask'] = FunctionCallTask;
      services.pluginClasses['FunctionInputTask'] = FunctionInputTask;
      services.pluginClasses['FunctionOutputTask'] = FunctionOutputTask;
    }

    return new Promise((resolve: any, reject: any) => {
      try {
        createNodes(flowPackage.flow);

        resolve(services);
      } catch (err) {
        console.log('setup failed! error', err);
        reject();
      }
    });
  },
};
