let FlowTask = require("@devhelpr/flowrunner").FlowTask;
let FlowTaskPackageType = require("@devhelpr/flowrunner").FlowTaskPackageType;
let Promise = require('promise');

export class FunctionOutputTask extends FlowTask {
	execute(node) {
		
		console.log("RUNNING FunctionOutputTask: "+node.id+" - "+node.title);

		return new Promise((resolve,reject) => {
			resolve(node.payload);
		});
	}

	getName() {
		return "FunctionOutputTask"
	}

	getFullName() {
		return "FunctionOutput"
	}

	getDescription() {
		return "Node that is the end for this function";
	}

	getIcon() {
		return "FunctionOutput"
	}

	getShape() {
		return "smallcircle"
	}

	getDefaultColor() {
		return "#3d93dd";//"#d43f3af0";
	}

	getTaskType() {
		return "both"
	}

	getPackageType() {
		return FlowTaskPackageType.FUNCTION_OUTPUT_NODE
	}

	getCategory() {
		return "FlowCanvas"
	}

	getController() {
		return "FlowCanvasController"
	}
}