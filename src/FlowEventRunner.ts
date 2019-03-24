import * as Rx from "@reactivex/rxjs";
import { EventEmitter } from "events";
import * as Promise from "promise";
import * as uuid from "uuid";
import * as FlowTaskPackageType from "./FlowTaskPackageType";
import { FunctionCallTask } from './plugins/FunctionCallTask';
import { FunctionInputTask } from './plugins/FunctionInputTask';
import { FunctionOutputTask } from './plugins/FunctionOutputTask';
import { IfConditionTask } from './plugins/IfConditionTask';
import { TraceConsoleTask } from './plugins/TraceConsoleTask';
const uuidV4 = uuid.v4;



let services: any;
let nodes: any;
let flowEventEmitter: any;

const middleware: any = [];
const functionNodes: any = [];
const flowNodeTriggers: any = [];

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
    (o: any) => o.endshapeid === injectIntoNodeId && o.shapeType === 'line' && o.followflow === 'injectConfigIntoPayload',
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
  const nodeEmitter = Object.assign({}, EventEmitter.prototype, {});
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

        const nodeTypeForCurrentNode = nodeTypes[node.shapeType];
        const nodeInstance = Object.assign({}, thisNode);

        if (typeof nodeTypeForCurrentNode !== 'undefined') {
          const result = nodeTypeForCurrentNode.pluginInstance.execute(nodeInstance, services, {});
          result.then((payload: any) => {
            services.registerModel(node.modelname, payload.modelDefinition);
          });
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
          title: node.title
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

      if (typeof nodeType !== 'undefined' && nodeType.pluginInstance.getTaskType() !== 'frontend') {
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

            function emitToOutputs(nodeInstance: any, callStack: any) {
              let followFlow = '';

              if (typeof nodeInstance.payload.followFlow !== 'undefined' && nodeInstance.payload.followFlow) {
                nodeInstance.payload._forwardFollowFlow = nodeInstance.payload.followFlow;
              }

              if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_OUTPUT_NODE) {
                let _payload = Object.assign({}, nodeInstance.payload);
                // delete _payload._functionOutputs;
                // delete _payload._functionErrorOutputs;
                delete _payload.followFlow;

                // TODO: Is this needed?
                if (typeof nodeInstance.payload.followFlow !== 'undefined' && nodeInstance.payload.followFlow) {
                  followFlow = nodeInstance.payload.followFlow;

                  if (followFlow === 'isError') {
                    nodeInstance.payload._functionErrorOutputs.map((node: any) => {
                      nodeEmitter.emit(node.endshapeid.toString(), _payload, callStack);
                    });
                    return;
                  }
                }

                // if (typeof nodeInstance.payload._functionOutputs != "undefined") {
                if (typeof callStack.outputs !== 'undefined') {
                  /* nodeInstance.payload._functionOutputs.map((node) => {
									nodeEmitter.emit(node.endshapeid.toString(), _payload, callStack);		
								})
								*/
                  const upperCallStack = callStack.callStack;
                  callStack.outputs.map((node: any) => {
                    nodeEmitter.emit(node.endshapeid.toString(), _payload, upperCallStack);
                  });
                }
              } else if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_NODE) {
                // nodeInstance.payload._functionOutputs = nodeEvent.outputs;
                // nodeInstance.payload._functionErrorOutputs = nodeEvent.error;

                let _callStack = {
                  callStack: callStack,
                  callStackType: 'FUNCTION',
                  error: nodeEvent.error,
                  outputs: nodeEvent.outputs,
                  returnNodeId: nodeInstance.id,
                };

                nodeEmitter.emit(nodeInstance.functionnodeid.toString(), nodeInstance.payload, _callStack);
              } else {
                if (typeof nodeInstance.payload.followFlow !== 'undefined' && nodeInstance.payload.followFlow) {
                  followFlow = nodeInstance.payload.followFlow;
                  // nodeInstance.payload.followFlow = undefined;

                  if (followFlow === 'isError') {
                    if (nodeType.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE) {
                      nodeInstance.payload.followFlow = undefined;
                    }

                    emitToError(nodeInstance, callStack);
                    return;
                  }
                }

                if (nodeType.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE) {
                  nodeInstance.payload.followFlow = undefined;
                }

                delete nodeInstance.payload.errors;

                nodeEvent.outputs.map((node: any) => {
                  if (followFlow === '' || (followFlow !== '' && node.title === followFlow)) {
                    nodeEmitter.emit(node.endshapeid.toString(), nodeInstance.payload, callStack);
                  }
                });
              }
            }

            function emitToError(nodeInstance: any, callStack: any) {
              if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_OUTPUT_NODE) {
                let _payload = Object.assign({}, nodeInstance.payload);

                if (typeof _payload.followFlow !== 'undefined' && _payload.followFlow) {
                  _payload._forwardFollowFlow = _payload.followFlow;
                }

                // delete _payload._functionOutputs;
                // delete _payload._functionErrorOutputs;
                delete _payload.followFlow;

                /* nodeInstance.payload._functionErrorOutputs.map((node) => {
								nodeEmitter.emit(node.endshapeid.toString(), _payload, callStack)
							})
							*/

                const upperCallStack = callStack.callStack;
                callStack.error.map((node: any) => {
                  nodeEmitter.emit(node.endshapeid.toString(), _payload, upperCallStack);
                });
              } else {
                if (typeof nodeInstance.payload.followFlow !== 'undefined' && nodeInstance.payload.followFlow) {
                  nodeInstance.payload._forwardFollowFlow = nodeInstance.payload.followFlow;
                }

                nodeEvent.error.map((node: any) => {
                  nodeEmitter.emit(node.endshapeid.toString(), nodeInstance.payload, callStack);
                });
              }
            }

            try {
              let _callStack = callStack;

              if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_NODE) {
                if (typeof nodeInstance.payload.followFlow !== 'undefined') {
                  if (nodeInstance.payload.followFlow === 'isError') {
                    emitToOutputs(nodeInstance, _callStack);
                    return;
                  }
                }
              }

              if (
                nodeType.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE &&
                nodeType.pluginInstance.getPackageType() !== FlowTaskPackageType.FUNCTION_OUTPUT_NODE
              ) {
                if (typeof nodeInstance.payload.followFlow != 'undefined') {
                  delete nodeInstance.payload.followFlow;
                }
              } else {
                if (nodeInstance.payload._forwardFollowFlow !== undefined) {
                  nodeInstance.payload.followFlow = nodeInstance.payload._forwardFollowFlow;
                }
              }
              nodeInstance.payload._forwardFollowFlow = undefined;

              let result = nodeType.pluginInstance.execute(nodeInstance, services, _callStack);
              if (result instanceof Rx.Observable) {
                const observer = {
                  next: (payload: any) => {
                    callMiddleware('ok', nodeInstance.id, nodeInstance.title, node.shapeType, payload);

                    nodeInstance.payload = payload;
                    emitToOutputs(nodeInstance, _callStack);
                  },
                  error: (err: any) => {
                    callMiddleware('error', nodeInstance.id, nodeInstance.title, node.shapeType, payload);

                    nodeInstance.payload = Object.assign({}, nodeInstance.payload, { error: err });
                    emitToError(nodeInstance, _callStack);
                  },
                  complete: () => {
                    console.log('Completed observable for ', nodeInstance.title);
                  },
                };

                result.subscribe(observer);
              } else if (typeof result === 'object' && typeof result.then === 'function') {
                // Promise
                result
                  .then((payload: any) => {
                    callMiddleware('ok', nodeInstance.id, nodeInstance.title, node.shapeType, payload);

                    nodeInstance.payload = payload;
                    emitToOutputs(nodeInstance, _callStack);
                  })
                  .catch((err: any) => {
                    console.log(err);

                    callMiddleware('error', nodeInstance.id, nodeInstance.title, node.shapeType, nodeInstance.payload);

                    nodeInstance.payload = Object.assign({}, nodeInstance.payload, { error: err });
                    emitToError(nodeInstance, _callStack);
                  });
              } else if (typeof result === 'object') {
                callMiddleware('ok', nodeInstance.id, nodeInstance.title, node.shapeType, result);

                nodeInstance.payload = result;
                emitToOutputs(nodeInstance, _callStack);
              } else if (typeof result === 'boolean' && result === true) {
                callMiddleware('ok', nodeInstance.id, nodeInstance.title, node.shapeType, nodeInstance.payload);

                emitToOutputs(nodeInstance, _callStack);
              } else if (typeof result === 'boolean' && result === false) {
                callMiddleware('error', nodeInstance.id, nodeInstance.title, node.shapeType, nodeInstance.payload);

                emitToError(nodeInstance, _callStack);
              }
            } catch (err) {
              let payloadForNotification = Object.assign({}, nodeInstance.payload);
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

module.exports = {
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

  executeFlowFunction: (flowFunctionName: any) => {
    return new Promise(function(resolve: any, reject: any) {
      let tempNodeId: any;
      function onFunctionResult(payload: any) {
        flowEventEmitter.removeListener(tempNodeId, onFunctionResult);
        resolve(payload);
      }

      try {
        if (typeof functionNodes[flowFunctionName] !== 'undefined' && functionNodes[flowFunctionName] !== '') {
          tempNodeId = uuidV4().toString();
          let nodeId = functionNodes[flowFunctionName];

          flowEventEmitter.on(tempNodeId, onFunctionResult);
          let payload = {};
          // payload._functionOutputs = [{endshapeid:tempNodeId}];
          // payload._functionErrorOutputs = [];
          let callStack = {
            outputs: [{ endshapeid: tempNodeId }],
            error: [],
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
    	services.pluginClasses['TraceConsoleTask'] = TraceConsoleTask;
      services.pluginClasses['IfConditionTask'] = IfConditionTask;
      services.pluginClasses['FunctionCallTask'] = FunctionCallTask;
      services.pluginClasses['FunctionInputTask'] = FunctionInputTask;
      services.pluginClasses['FunctionOutputTask'] = FunctionOutputTask;
    }

    return new Promise((resolve: any, reject: any) => {
      try {
        createNodes(flowPackage.flow);

        resolve();
      } catch (err) {
        console.log('setup failed! error', err);
        reject();
      }
    });
  },
};
