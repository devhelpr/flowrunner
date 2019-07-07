import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";
jest.setTimeout(15000);
const functionTestFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "FunctionCallTask",
				"name":"callFunction",
				"functionnodeid":"testFunction",
				"_outputs": ["console"]
			},
			{
				"taskType": "TraceConsoleTask",
				"name":"console",
				"message":"tot hier"
			},
			{
				"taskType": "FunctionInputTask",
				"name": "testFunction",
				"_outputs":["assign"]
			},
			{
				"taskType": "AssignTask",
				"name":"assign",
				"assignToProperty":"test",
				"value":"test",
				"message":"test",
				"subtype": "",
				"_outputs":["testFunctionResult"]
			},
			{
				"taskType": "FunctionOutputTask",
				"name": "testFunctionResult"
			},
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	console.log(flowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("callFunction", {"testProperty" : 303});
		value = (result.testProperty === 303) && (result.test === "test");
	});
	return value;
}

test('functionFlow', async () => {
	let value : boolean = await functionTestFlow();
	expect(value).toBe(true);
})