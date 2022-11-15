import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";

jest.setTimeout(15000);

const testBasicFunctionalConnectionFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "TraceConsoleTask",
				"name":"console",
				"message":"test",
				"subtype": "",
				"isFunctionalConnection" : true,
				"_outputs":["assign"]
			},
			{
				"taskType": "AssignTask",
				"name":"assign",
				"assignToProperty":"test",
				"value":"test",
				"subtype": "",
				"isFunctionCall" : true,
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



test('testBasicFunctionalConnectionFlow', async () => {
	let value : boolean = await testBasicFunctionalConnectionFlow();
	expect(value).toBe(true);
})
