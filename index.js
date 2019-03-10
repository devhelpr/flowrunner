

let flowEventRunner = require("./FlowEventRunner");
let flowTaskPackageType = require("./FlowTaskPackageType.js");
let humanFlowToMachineFlow = require('./HumanFlowToMachineFlow');

function createFlowRunner() {
	return {
		flowEventRunner: flowEventRunner,
		flowTaskPackageType: flowTaskPackageType,
		humanFlowToMachineFlow: humanFlowToMachineFlow
	}
}

module.exports = createFlowRunner;