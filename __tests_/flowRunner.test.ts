import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";

jest.setTimeout(15000);

const testBasicFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "TraceConsoleTask",
				"name":"console",
				"message":"test",
				"subtype": "",
				"_outputs":["assign"]
			},
			{
				"taskType": "AssignTask",
				"name":"assign",
				"assignToProperty":"test",
				"value":"test",
				"subtype": "",
				"_outputs":[]
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("console", {"testProperty" : 303});
		value = (result.testProperty === 303) && (result.test === "test");
	});
	return value;
}

const ifConditionBasicFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			
			{
				"taskType": "AssignTask",
				"name":"assign",
				"assignToProperty":"test",
				"value":"test",
				"subtype": "",
				"_outputs":["ifthen"]
			},
			{
				"taskType": "IfConditionTask",
				"name":"ifthen",
				"compareProperty":"test",
				"withProperty":"",
				"withValue":"different",
				"usingCondition": "equals",
				"dataType":"string",
				"_outputs":[],
				"_errors":["else"]
			},
			{
				"taskType": "AssignTask",
				"name":"else",
				"assignToProperty":"error",
				"value":"test"
			},
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("assign", {});
		value = (result.error === "test");
	});
	return value;
}

test('testBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await testBasicFlow();
	expect(value).toBe(true);
})

test('ifConditionBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await ifConditionBasicFlow();
	expect(value).toBe(true);
})