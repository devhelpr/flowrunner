import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";

jest.setTimeout(15000);

const testAnnotationFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "AssignTask",
				"name":"start",
				"assignToProperty":"hello",
				"value":"world",
				"subtype": "",
				"_outputs":["test-annotation"]
			},
			{
				"taskType": "Annotation",
				"name":"test-annotation",
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
		let result : any = await flowEventRunner.executeNode("start", {"testProperty" : 303});
		value = (result.testProperty === 303) && (result.test === "test");
	});
	return value;
}

test('annotation Basic Flow', async () => {
	let value : boolean = await testAnnotationFlow();
	expect(value).toBe(true);
})


const testOnlyAnnotationFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [			
			{
				"taskType": "Annotation",
				"name":"test-annotation",
				"subtype": "",
				"_outputs":[]
			}
		]
	};

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("test-annotation", {"testProperty" : 303});
		value = (result.testProperty === 303);
	});
	return value;
}

test('annotation Flow with only annotation', async () => {
	let value : boolean = await testOnlyAnnotationFlow();
	expect(value).toBe(true);
})
