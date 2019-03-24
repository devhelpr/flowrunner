let FlowTask = require('../FlowTask');
let Promise = require('promise');

console.log(FlowTask);

export class TraceConsoleTask extends FlowTask {
	execute(node : any, services : any, callStack : any) {
		console.log("RUNNING: "+node.id+" - "+node.title);		

		if (node.message !== undefined && node.message != "") {
			console.log("LOGMESSAGE:",node.message);
		} else {
			console.log(node.payload);
		}
		
		return new Promise((resolve : any, reject : any) => {
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
};