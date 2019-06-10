import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";

const testBasicFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"id": "consolelog1error",
				"shapeType": "TraceConsoleTask",
				"name":"console",
				"title": "test taak ",
				"message":"test",
				"subtype": "",
				"_outputs":[]
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
		 
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		await flowEventRunner.callNode("consolelog1error", {});
		value = true;
	});
	return value;
}

test('testBasicFlow', async () => {
	let value : boolean = await testBasicFlow();
	expect(value).toBe(true);
})