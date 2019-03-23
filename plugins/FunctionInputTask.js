let FlowTask = require("@devhelpr/flowrunner").FlowTask;
let FlowTaskPackageType = require("@devhelpr/flowrunner").FlowTaskPackageType;
let Promise = require('promise');

export class FunctionInputTask extends FlowTask {
	execute(node) {
		
		console.log("RUNNING FunctionInputTask: "+node.id+" - "+node.title);

		return new Promise((resolve,reject) => {
			resolve(node.payload);
		});
	}

	getName() {
		return "FunctionInputTask"
	}

	getFullName() {
		return "FunctionInput"
	}

	getDescription() {
		return "Node that's the startpoint for this function";
	}

	getIcon() {
		return "FunctionInput"
	}

	getShape() {
		return "circle"
	}

	getTaskType() {
		return "both"
	}

	getPackageType() {
		return FlowTaskPackageType.FUNCTION_INPUT_NODE
	}

	getCategory() {
		return "FlowCanvas"
	}

	getController() {
		return "FlowCanvasController"
	}
}