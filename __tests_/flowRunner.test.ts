import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";

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
				"message":"test",
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

test('testBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await testBasicFlow();
	expect(value).toBe(true);
})