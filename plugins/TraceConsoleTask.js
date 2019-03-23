let FlowTask = require("@devhelpr/flowrunner").FlowTask;
let Promise = require('promise');
class TraceConsoleTask extends FlowTask {
	execute(node, services, callStack) {
		console.log("RUNNING: "+node.id+" - "+node.title);		

		if (node.message !== undefined && node.message != "") {
			console.log("LOGMESSAGE:",node.message);
		} else {
			console.log(node.payload);
		}
		
		return new Promise((resolve,reject) => {
			resolve(node.payload);
		});
	}

	getName() {
		return "TraceConsoleTask"
	}

	getFullName() {
		return "Log to console"
	}

	getIcon() {
		return "console"
	}

	getShape() {
		return "rect"
	}

	getTaskType() {
		// both/frontend/backend/mobileapp
		return "both"
	}

	getCategory() {
		return "FlowCanvas"
	}

	getController() {
		return "FlowCanvasController"
	}

	getConfigMetaData() {
		return [
			{name:"message", defaultValue:"", valueType:"string"}		
		]
	}
}

module.exports = TraceConsoleTask