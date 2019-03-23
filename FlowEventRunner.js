let FlowTaskPackageType = require("./FlowTaskPackageType");
let EventEmitter = require('events').EventEmitter;
let Promise = require('promise');
const uuidV4 = require('uuid/v4');
let Rx = require('@reactivex/rxjs');

import { TraceConsoleTask } from "./plugins/TraceConsoleTask";
import { FunctionCallTask } from "./plugins/FunctionCallTask";
import { FunctionInputTask } from "./plugins/FunctionInputTask";
import { FunctionOutputTask } from "./plugins/FunctionOutputTask";
import { IfConditionTask } from "./plugins/IfConditionTask";

let _services;
let _nodes;
let _middleware = [];
let functionNodes = [];
let flowEventEmitter;
let _flowNodeTriggers = [];

function callMiddleware(result, id, title, nodeType, payload) {

	let cleanPayload = Object.assign({}, payload);

	cleanPayload.request = undefined;
	cleanPayload.response = undefined;

	_middleware.map((middleware) => {
		middleware(result, id, title, nodeType, cleanPayload);
	})
}


function getNodeInjections(injections, nodeList) {
	let nodes = [];
	if (injections.length > 0) {
		console.log("INJECTIONS getNodeInjections",injections);
	}
	injections.map((nodeRelation) => {

		console.log("nodeRelation injection", nodeRelation.startshapeid);

		nodeList.map((node) => {
			if (node.id == nodeRelation.startshapeid) {
				nodes.push(node)
				
				console.log("getNodeInjections",node)
			}
		})
	})
	
	return nodes;
}

function getManuallyToFollowNodes(manuallyToFollowNodes, nodeList) {
	return nodeList.filter((node) => {
		return (typeof manuallyToFollowNodes.find((o) => o.endshapeid == node.id.toString()) != "undefined")
	})
}

function getInjections(injectIntoNodeId,nodeList,nodeTypes) {
	let injections = [];

	let nodeInjections = nodeList.filter((o) =>
		o.endshapeid == injectIntoNodeId && o.shapeType == 'line' &&
		o.followflow == "injectConfigIntoPayload"
	)

	nodeInjections.map((nodeRelation) => {
		
		nodeList.map((node) => {
			if (node.id == nodeRelation.startshapeid) {

				let nodeType = nodeTypes[node.shapeType];
				if (typeof nodeType != "undefined") {

					let nodeInstance =  Object.assign({}, node);
					nodeInstance.payload = {};

					injections.push({pluginInstance:nodeType.pluginInstance,node:node});
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
		})
	})

	return injections;
}

// TODO : refactor .. this method does too much
//  	- creating events foreach node
//		- creating http get/post handlers
//		- instantiate plugins
//		- emit events to output nodes
//		- calling plugin execute or executeAsHTTPEndpoint
//
// split in multiple methods / classes

function createNodes(nodeList) {

	let nodeEmitter = Object.assign( {}, EventEmitter.prototype, { 
	});
	flowEventEmitter = nodeEmitter;

	nodeEmitter.on('error', (err) => {
		console.error('error in FlowEventRunner EventEmitter');
		console.log(err);
	});

	let nodeTypes = {};
	let autostarters = [];

	for (var pluginClassName in _services.pluginClasses) {
		
		if (_services.pluginClasses.hasOwnProperty(pluginClassName)) {
			
			let pluginClass = _services.pluginClasses[pluginClassName];
			let pluginInstance = new pluginClass();
			
			nodeTypes[pluginInstance.getName()] = {
				name: pluginInstance.getName(),
				fullName: pluginInstance.getFullName(),
				shape: pluginInstance.getShape(),
				configMetaData: pluginInstance.getConfigMetaData(),
				pluginInstance: pluginInstance,
				pluginClassName: pluginClassName
			}
		}
	}

	_nodes = nodeList
	.filter((o) => o.shapeType != "line")
	.map((node) => {
		let baseFlowRoute = "/flowrunner/";
		let thisNode = node;
		thisNode.payload = {}

		if (node.subtype == "registrate") {
			_services.logMessage("REGISTRATE "+node.title)
			
			let nodeType = nodeTypes[node.shapeType];
			let nodeInstance =  Object.assign({}, thisNode);

			if (typeof nodeType != "undefined") {
				let result = nodeType.pluginInstance.execute(nodeInstance, _services, {});
				result.then(function(payload) {
					_services.registerModel(node.modelname, payload.modelDefinition)
				})
			}
			return;
		}

		// followflow onfailure
		let nodeEvent = Object.assign( {}, { 
			nodeId:node.id,
			title:node.title,
			inputs:nodeList.filter((o) => 
				o.endshapeid == node.id.toString() && o.shapeType == 'line' &&
				o.followflow != "followManually" &&
				o.followflow != "injectConfigIntoPayload"
			),
			outputs:nodeList.filter((o) =>
				o.startshapeid == node.id.toString() && o.shapeType == 'line' &&
				o.followflow != "onfailure" && 
				o.followflow != "followManually" &&
				o.followflow != "injectConfigIntoPayload"
			),
			error:nodeList.filter((o) =>
				o.startshapeid == node.id.toString() && o.shapeType == 'line' &&
				o.followflow == "onfailure"
			),
			manuallyToFollowNodes:getManuallyToFollowNodes(nodeList.filter((o) =>
				o.startshapeid == node.id.toString() && o.shapeType == 'line' &&
				o.followflow == "followManually"
			), nodeList),

			/*

			// TODO : bepalen of dit echt nodig is..

			fowardNodes:nodeList.filter((o) =>
				o.startshapeid == node.id.toString() && o.shapeType == 'line')
				.map((o) => {
					let forwardNodeId = o.endshapeid.toString();
					let forwardNodes = nodeList.filter((o) => {
						if (o.id.toString() == forwardNodeId && o.shapeType == "ForwardTask") {
							return true;
						}
						return false;
					});
					if (forwardNodes.length > 0) {
						return forwardNodes[0].id.toString();
					}	
				}),
			*/

			// TODO : hier direct de nodes uitlezen en de variabelen die geinjecteerd moeten
			// worden toevoegen
			injections:getInjections(node.id.toString(), nodeList, nodeTypes)
		})		

		let nodeType = nodeTypes[node.shapeType];
		if ((typeof nodeType != "undefined") &&
		    (typeof nodeType.pluginInstance != "undefined")) {
				_flowNodeTriggers.map((flowNodeTrigger) => {
					flowNodeTrigger(nodeType.pluginInstance.getPackageType(),
						thisNode, 
						function (payload, callStack) {
							nodeEmitter.emit(thisNode.id.toString(), payload, callStack);

						}
					);
				})			
		}

		if ((typeof nodeType != "undefined") && 
			(nodeType.pluginInstance.getTaskType() != "frontend")) {

			if (thisNode.subtype == "autostart") {
				autostarters.push(node.id.toString());
			}

			if (nodeType.pluginInstance.getPackageType() == FlowTaskPackageType.FUNCTION_INPUT_NODE) {
				functionNodes[node.title] = node.id.toString();
			}

			nodeEmitter.on(node.id.toString(), (payload, callStack) => {

				let injectionValues = {};
				let injectionPromises = [];
				nodeEvent.injections.map((nodeInjection) => {
					let nodeInstance =  Object.assign({}, nodeInjection.node);
					nodeInstance.payload = Object.assign({}, payload);
					let result = nodeInjection.pluginInstance.execute(nodeInstance,_services, callStack);

					if (typeof result == "object" && typeof result.then == "function") {
						result.then((_payload) => {

							_payload.response = null;
							_payload.request = null;

							callMiddleware("injection", nodeInstance.id, nodeInstance.title, 
											node.shapeType, _payload);

							for (var key in _payload) {
								if (typeof _payload[key] == "undefined" || _payload[key] == null) {
									continue;
								}
								if (!_payload.hasOwnProperty(key)) {
									continue;
								}
								injectionValues[key] = _payload[key];
							}	
						})
						.catch((err) => {
							console.log("injection promise failed",err)
						})
					} else if (typeof result == "object") {

						callMiddleware("injection", nodeInstance.id, nodeInstance.title, 
											node.shapeType, payload);

						for (var key in result) {
							if (!result.hasOwnProperty(key)) {
								continue;
							}
							injectionValues[key] = result[key];
						}
					}

					injectionPromises.push(result);
				})

				Promise.all(injectionPromises).then(() => {
					let nodeInstance =  Object.assign({}, thisNode, {followNodes:nodeEvent.manuallyToFollowNodes});

					nodeInstance.payload = Object.assign({}, payload, injectionValues);				

					if (thisNode.subtype == "start") {
						callStack.sessionId = uuidV4();
					}

					console.log("EVENT Received for node: ",nodeEvent.title,node.id.toString())
					
					function emitToOutputs(nodeInstance, callStack) {
						let followFlow = "";

						if (typeof nodeInstance.payload.followFlow != "undefined" && 
							nodeInstance.payload.followFlow) {
							nodeInstance.payload._forwardFollowFlow = nodeInstance.payload.followFlow;	
						}	

						if (nodeType.pluginInstance.getPackageType() == FlowTaskPackageType.FUNCTION_OUTPUT_NODE) {

							let _payload = Object.assign({}, nodeInstance.payload);								
							//delete _payload._functionOutputs;
							//delete _payload._functionErrorOutputs;
							delete _payload.followFlow;

							// TODO: Is this needed?
							if (typeof nodeInstance.payload.followFlow != "undefined" && nodeInstance.payload.followFlow) {
								followFlow = nodeInstance.payload.followFlow;

								if (followFlow == "isError") {
									nodeInstance.payload._functionErrorOutputs.map((node) => {
										nodeEmitter.emit(node.endshapeid.toString(), _payload, callStack)
									})
									return;
								}
							}

							//if (typeof nodeInstance.payload._functionOutputs != "undefined") {
							if (typeof callStack.outputs != "undefined") {
								
								/*nodeInstance.payload._functionOutputs.map((node) => {
									nodeEmitter.emit(node.endshapeid.toString(), _payload, callStack);		
								})
								*/
								let upperCallStack = callStack.callStack;
								callStack.outputs.map((node) => {
									nodeEmitter.emit(node.endshapeid.toString(), _payload, upperCallStack);		
								});
							}
						} else
						if (nodeType.pluginInstance.getPackageType() == FlowTaskPackageType.FUNCTION_NODE) {

							//nodeInstance.payload._functionOutputs = nodeEvent.outputs;
							//nodeInstance.payload._functionErrorOutputs = nodeEvent.error;

							let _callStack = {
								callStackType : "FUNCTION",
								returnNodeId : nodeInstance.id,
								outputs : nodeEvent.outputs,
								error : nodeEvent.error,
								callStack : callStack
							}

							nodeEmitter.emit(nodeInstance.functionnodeid.toString(), nodeInstance.payload, _callStack);

						} else {
							if (typeof nodeInstance.payload.followFlow != "undefined" && 
								nodeInstance.payload.followFlow) {
								followFlow = nodeInstance.payload.followFlow;
								//nodeInstance.payload.followFlow = undefined;

								if (followFlow == "isError") {

									if (nodeType.pluginInstance.getPackageType() != FlowTaskPackageType.FORWARD_NODE) {
										nodeInstance.payload.followFlow = undefined;
									}

									emitToError(nodeInstance)
									return;
								}
							}

							if (nodeType.pluginInstance.getPackageType() != FlowTaskPackageType.FORWARD_NODE) {
								nodeInstance.payload.followFlow = undefined;
							}

							delete nodeInstance.payload.errors;

							nodeEvent.outputs.map((node) => {
								if ((followFlow == "") || 
									((followFlow != "" && node.title == followFlow))) {
									nodeEmitter.emit(node.endshapeid.toString(), nodeInstance.payload, callStack)		
								}								 						
							})
						}
					}

					function emitToError(nodeInstance, callStack) {
						if (nodeType.pluginInstance.getPackageType() == FlowTaskPackageType.FUNCTION_OUTPUT_NODE) {

							let _payload = Object.assign({}, nodeInstance.payload);	
							
							if (typeof _payload.followFlow != "undefined" && 
								_payload.followFlow) {
								_payload._forwardFollowFlow = _payload.followFlow;	
							}	
							
							//delete _payload._functionOutputs;
							//delete _payload._functionErrorOutputs;
							delete _payload.followFlow;

							/*nodeInstance.payload._functionErrorOutputs.map((node) => {
								nodeEmitter.emit(node.endshapeid.toString(), _payload, callStack)
							})
							*/

							let upperCallStack = callStack.callStack;
							callStack.error.map((node) => {
								nodeEmitter.emit(node.endshapeid.toString(), _payload, upperCallStack);		
							});

						} else {

							if (typeof nodeInstance.payload.followFlow != "undefined" && 
								nodeInstance.payload.followFlow) {
								nodeInstance.payload._forwardFollowFlow = nodeInstance.payload.followFlow;	
							}	
								
							nodeEvent.error.map((node) => {
								nodeEmitter.emit(node.endshapeid.toString(), nodeInstance.payload, callStack)
							}) 
						}
					}

					try {

						let _callStack = callStack;

						if (nodeType.pluginInstance.getPackageType() == FlowTaskPackageType.FUNCTION_NODE) {
							if (typeof nodeInstance.payload.followFlow !== "undefined") {

								if (nodeInstance.payload.followFlow == "isError") {
									emitToOutputs(nodeInstance, _callStack)
									return;
								}
							}							
						} 	

						if ((nodeType.pluginInstance.getPackageType() != FlowTaskPackageType.FORWARD_NODE) && (
							nodeType.pluginInstance.getPackageType() != FlowTaskPackageType.FUNCTION_OUTPUT_NODE)) {
						   if (typeof nodeInstance.payload.followFlow != "undefined") {
							   delete nodeInstance.payload.followFlow;
						   }
					   } else {
						   if (nodeInstance.payload._forwardFollowFlow !== undefined) {
							   nodeInstance.payload.followFlow = nodeInstance.payload._forwardFollowFlow;
						   }
					   }
					   nodeInstance.payload._forwardFollowFlow = undefined;

						let result = nodeType.pluginInstance.execute(nodeInstance, _services, _callStack);
						if (result instanceof Rx.Observable) {
							var observer = {
								next: (payload) => {
									callMiddleware("ok", nodeInstance.id, nodeInstance.title, 
											node.shapeType, payload);

									nodeInstance.payload = payload;
									emitToOutputs(nodeInstance, _callStack)
								},
								error: (err) => {

									callMiddleware("error", nodeInstance.id, nodeInstance.title, 
											node.shapeType, payload);

									nodeInstance.payload = Object.assign({}, nodeInstance.payload, {error:err});
									emitToError(nodeInstance, _callStack);
								},
								complete: () => {
									console.log('Completed observable for ',nodeInstance.title)
								},
							};
							
							result.subscribe(observer);
						} else
						if (typeof result == "object" && typeof result.then == "function") {
							// Promise
							result.then((payload) => {

								callMiddleware("ok", nodeInstance.id, nodeInstance.title, 
											node.shapeType, payload);

								nodeInstance.payload = payload;
								emitToOutputs(nodeInstance, _callStack)
							})
							.catch((err) => {
								console.log(err);

								callMiddleware("error", nodeInstance.id, nodeInstance.title, 
											node.shapeType, nodeInstance.payload);

								nodeInstance.payload = Object.assign({}, nodeInstance.payload, {error:err});
								emitToError(nodeInstance, _callStack)
							})
						} else if (typeof result == "object") {

							callMiddleware("ok", nodeInstance.id, nodeInstance.title, 
											node.shapeType, result);

							nodeInstance.payload = result;
							emitToOutputs(nodeInstance, _callStack)
						} else if (typeof result == "boolean" && result === true) {

							callMiddleware("ok", nodeInstance.id, nodeInstance.title, 
											node.shapeType, nodeInstance.payload);

							emitToOutputs(nodeInstance, _callStack)
						} else if (typeof result == "boolean" && result === false) {

							callMiddleware("error", nodeInstance.id, nodeInstance.title, 
											node.shapeType, nodeInstance.payload);

							emitToError(nodeInstance, _callStack)
						}
					} catch(err) {
						let payloadForNotification = Object.assign({},nodeInstance.payload);
						payloadForNotification.response = undefined;
						payloadForNotification.request = undefined;

						sendNotification('FlowEventRunner.debug',{
							id:nodeInstance.id.toString(),
							error:true,
							errorMessage:err,
							title:nodeInstance.title,
							dateTime:new Date().toISOString(),
							payload:payloadForNotification
						});
					}
				})
			})

			return nodeEvent;
		}
	})

	autostarters.map(function (nodeId) {
		nodeEmitter.emit(nodeId.toString(), {}, {});
	})
}


module.exports = {

	getFunctionNodeId:function(title) {
		if (typeof functionNodes[title] != "undefined" && functionNodes[title] != "") {
			return functionNodes[title];
		}
		return false;
	},

	callNode:function(nodeId, payload) {
		flowEventEmitter.emit(nodeId.toString(), payload);	
	},

	getFlowEventEmitter:function() {
		return flowEventEmitter;
	},

	useFlowNodeTrigger: function(effect) {
		_flowNodeTriggers.push(effect);
	},

	executeFlowFunction:function(flowFunctionName) {

		return new Promise(function(resolve, reject) {
			try {
				if (typeof functionNodes[flowFunctionName] != "undefined" && functionNodes[flowFunctionName] != "") {
					let tempNodeId = uuidV4().toString();
					let nodeId = functionNodes[flowFunctionName];
		
					function onFunctionResult(payload) {
						flowEventEmitter.removeListener(tempNodeId, onFunctionResult);
						resolve(payload);
					}

					flowEventEmitter.on(tempNodeId, onFunctionResult);
					let payload = {}
					//payload._functionOutputs = [{endshapeid:tempNodeId}];
					//payload._functionErrorOutputs = [];
					let callStack = {
						outputs: [{endshapeid:tempNodeId}],
						error: []
					}
					flowEventEmitter.emit(nodeId.toString(), payload, callStack);

				} else {
					reject();
				}
			} catch (err) {
				console.log("executeFlowFunction error",err);
				reject();
			}
		})
	},

	start:function (flowPackage, services, mergeWithDefaultPlugins) {
		if (services !== undefined) {
			_services = services;
		} else {
			_services = {
				registerModel : () => {}, 				
				logMessage : () => {},
				pluginClasses : {}
			}
		}

		if (mergeWithDefaultPlugins === undefined || mergeWithDefaultPlugins === true) {
			_services.pluginClasses["TraceConsoleTask"] = TraceConsoleTask;
			_services.pluginClasses["IfConditionTask"] = IfConditionTask;
			_services.pluginClasses["FunctionCallTask"] = FunctionCallTask;
			_services.pluginClasses["FunctionInputTask"] = FunctionInputTask;
			_services.pluginClasses["FunctionOutputTask"] = FunctionOutputTask;
		}
		
		return new Promise(function(resolve, reject) {
				try {
					
					createNodes(flowPackage.flow)

					resolve();
				} catch (err) {
					console.log("error",err)
					reject();
				}
			}
		).catch(() => {
			console.log("setup failed");
			resolve();
		});
	}
}