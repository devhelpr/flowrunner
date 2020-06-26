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

const testDestroyFlow = async () => {
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
		if (value) {
			flowEventRunner.destroyFlow();
		}
		
	});
	return value;
}

const testInjectFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "TraceConsoleTask",
				"name":"console",
				"message":"test",
				"subtype": "",
				"_outputs":["inject"]
			},
			{
				"taskType": "InjectIntoPayloadTask",
				"name":"inject",
				"object":{"test":"abc","test2":"def"},
				"subtype": "",
				"_outputs":[]
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("console", {"testProperty" : 303});
		value = (result.test === "abc") && (result.test2 === "def");
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
	await flowEventRunner.start(flowPackage).then(async (services : any) => {
		services.logMessage = (...args : any) => {
			console.log(...args)
		}
		let result : any = await flowEventRunner.executeNode("assign", {});
		value = (result.error === "test");
	});
	return value;
}

const testTaskMetaData = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "TraceConsoleTask",
				"name":"console",
				"message":"test",
				"subtype": ""
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		const metaData = flowEventRunner.getTaskMetaData();
		value =  metaData.filter((metaDataItem) => metaDataItem.className == "AssignTask").length > 0;
	});
	return value;
}

const testInjectTemplateIntoPayloadFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "InjectIntoPayloadTask",
				"name":"injectObject",
				"object":{
					"test":"{testProperty}"
				},
				"hasObjectVariables": true,
				"subtype": "",
				"_outputs":["injectArray"]
			},{
				"taskType": "InjectIntoPayloadTask",
				"name":"injectArray",
				"object":{
					"list":"{testList}"
				},
				"hasObjectVariables": true,
				"subtype": "",
				"_outputs":[]
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("injectObject", 
			{
				"testProperty" : "test1234",
				"testList" : ["abc","def"]
			});
		value = (result.test === "test1234") && (result.list.length == 2);
	});
	return value;
}

test('testBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await testBasicFlow();
	expect(value).toBe(true);
})

test('testInjectTemplateIntoPayloadFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await testInjectTemplateIntoPayloadFlow();
	expect(value).toBe(true);
})


test('testDestroyFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await testBasicFlow();
	expect(value).toBe(true);
})

test('ifConditionBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await ifConditionBasicFlow();
	expect(value).toBe(true);
})

test('testInjectFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await testInjectFlow();
	expect(value).toBe(true);
})


test('testTaskMetaData', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await testTaskMetaData();
	expect(value).toBe(true);
})