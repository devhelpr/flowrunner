import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";

jest.setTimeout(15000);

const testPausingFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "AssignTask",
				"name":"start",
				"assignToProperty":"hello",
				"value":"world",
				"subtype": "",
				"_outputs":["step2"]
			},
			{
				"taskType": "AssignTask",
				"name": "step2",
				"assignToProperty": "step2",
				"value": "step 2",
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
	};

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		flowEventRunner.pauseFlowrunner();
		setTimeout(() => {
			flowEventRunner.continueFlowrunner();
		});
		let result : any = await flowEventRunner.executeNode("start", {"testProperty" : 303});
		console.log(result);
	
		value = (result.testProperty === 303) && (result.test === "test");
	});
	return value;
}

test('pausign Basic Flow', async () => {
	let value : boolean = await testPausingFlow();
	expect(value).toBe(true);
})
