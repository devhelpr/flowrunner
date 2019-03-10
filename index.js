

let flowEventRunner = require("./FlowEventRunner.js");
let flowTaskPackageType = require("./FlowTaskPackageType.js");
let humanFlowToMachineFlow = require('./HumanFlowToMachineFlow.js');
let flowTask = require('./FlowTask.js');

function createFlowRunner() {
	return {
		flowEventRunner: flowEventRunner,
		flowTaskPackageType: flowTaskPackageType,
		humanFlowToMachineFlow: humanFlowToMachineFlow,
		flowTask: flowTask
	}
}

module.exports = createFlowRunner;