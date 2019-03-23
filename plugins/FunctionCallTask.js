let FlowTask = require("@devhelpr/flowrunner").FlowTask;
let FlowTaskPackageType = require("@devhelpr/flowrunner").FlowTaskPackageType;
let Promise = require('promise');

export class FunctionCallTask extends FlowTask {
	execute(node) {
		
		console.log("RUNNING FunctionCallTask: "+node.id+" - "+node.title);

		return new Promise((resolve,reject) => {
			resolve(node.payload);
		});
	}

	getName() {
		return "FunctionCallTask"
	}

	getFullName() {
		return "FunctionCall"
	}

	getDescription() {
		return "Node that calls a function node";
	}

	getIcon() {
		return "functioncall"
	}

	getShape() {
		return "circle"
	}

	getTaskType() {
		return "both"
	}

	getPackageType() {
		return FlowTaskPackageType.FUNCTION_NODE
	}

	getCategory() {
		return "FlowCanvas"
	}

	getController() {
		return "FlowCanvasController"
	}

	getConfigMetaData() {
		return [
			{name:"functionnodeid", defaultValue:"", valueType:"enum", required: true, optionsViaController:true}					
		]
	}
}