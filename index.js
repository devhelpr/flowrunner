

let flowEventRunner = require("./FlowEventRunner");
let flowTaskPackageType = require("./FlowTaskPackageType.js");
let humanFlowToMachineFlow = require('./HumanFlowToMachineFlow');
let flowTask = require('./flowTask');

function createFlowRunner() {
	return {
		flowEventRunner: flowEventRunner,
		flowTaskPackageType: flowTaskPackageType,
		humanFlowToMachineFlow: humanFlowToMachineFlow,
		flowTask: flowTask
	}
}

module.exports = createFlowRunner;