import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";
import { FlowTask } from '../src/FlowTask';

jest.setTimeout(15000);


export class ModifyFlowTask extends FlowTask {
	public execute(node: any, services: any) {
		services.logMessage('RUNNING ModifyFlowTask: ' + node.id + ' - ' + node.name);
		services.flowEventRunner.setPropertyOnNode(node.nodeName, 
			node.modifyProperty,
			node.value);
		return true;
	  }
	
	  public getName() {
		return 'ModifyFlowTask';
	  }
	
}

const runFlow = async () => {
	const flowEventRunner = new FlowEventRunner();
	flowEventRunner.registerTask("ModifyFlowTask", ModifyFlowTask);
	const humanFlowPackage = {
		flow : [
			{
				"taskType": "TraceConsoleTask",
				"name":"console",
				"message":"test",
				"subtype": "",
				"test":1,
				"_outputs":["modify"]
			},
			{
				"taskType": "ModifyFlowTask",
				"name":"modify",
				"nodeName":"console",
				"modifyProperty":"test",
				"value":303
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("console", {});
		value = (flowEventRunner.getPropertyFromNode("console","test") === 303);
	});
	return value;
}

const runFlowUnknownNode = async () => {
	const flowEventRunner = new FlowEventRunner();
	flowEventRunner.registerTask("ModifyFlowTask", ModifyFlowTask);
	const humanFlowPackage = {
		flow : [
			{
				"taskType": "TraceConsoleTask",
				"name":"console",
				"message":"test",
				"subtype": "",
				"test":1,
				"_outputs":["modify"]
			},
			{
				"taskType": "ModifyFlowTask",
				"name":"modify",
				"nodeName":"console",
				"modifyProperty":"test",
				"value":303
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("console", {});
		value = (flowEventRunner.getPropertyFromNode("unknown","test") === undefined);
	});
	return value;
}


test('modifyFlowDuringRunBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await runFlow();
	expect(value).toBe(true);
})


test('modifyFlowDuringRunBasicFlowGetPropertyFromUnknownNode', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await runFlowUnknownNode();
	expect(value).toBe(true);
})


