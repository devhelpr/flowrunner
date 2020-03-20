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
				"name": "testFunctionResult",
				"resultProperty": "test"
			},
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("callFunction", {"testProperty" : 303});
		value = (result.testProperty === 303) && (result.test === "test");
	});
	return value;
}

const functionInFunctionTestFlow = async () => {
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
				"_outputs":["callFunctionInFunction"]
			},
			{
				"taskType": "FunctionCallTask",
				"name":"callFunctionInFunction",
				"functionnodeid":"testInFunction",
				"_outputs": ["testFunctionResult"]
			},
			{
				"taskType": "FunctionOutputTask",
				"name": "testFunctionResult",
				"resultProperty": "test"
			},
			{
				"taskType": "FunctionInputTask",
				"name": "testInFunction",
				"_outputs":["assignInFunction"]
			},
			{
				"taskType": "AssignTask",
				"name":"assignInFunction",
				"assignToProperty":"testInsideFunction",
				"value":"test1234",
				"subtype": "",
				"_outputs":["testFunctionInFunctionResult"]
			},
			{
				"taskType": "FunctionOutputTask",
				"name": "testFunctionInFunctionResult",
				"resultProperty": "testInsideFunction"
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("callFunction", {"testProperty" : 303});
		value = (result.testProperty === 303) && 
			(result.test === "test") &&
			(result.testInsideFunction !== "test1234");
	});
	return value;
}

const functionIfConditionFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "FunctionCallTask",
				"name":"callFunction",
				"functionnodeid":"testFunction",
				"_outputs":["then"]
			},
			{
				"taskType": "AssignTask",
				"name":"then",
				"assignToProperty":"result",
				"value":"test"
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
				"_outputs":["assign-if"]
			},
			{
				"taskType": "AssignTask",
				"name":"assign-if",
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
				"withValue":"test",
				"usingCondition": "equals",
				"dataType":"string",
				"_outputs":[],
				"_errors":["testFunctionResult"]
			},
			{
				"taskType": "FunctionOutputTask",
				"name": "testFunctionResult"
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("callFunction", {"testProperty" : 303});
		value = (result.result === "test");	
	});
	return value;
}


const functionIfConditionErrorFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "FunctionCallTask",
				"name":"callFunction",
				"functionnodeid":"testFunction",
				"_errors":["else"]
			},
			{
				"taskType": "AssignTask",
				"name":"else",
				"assignToProperty":"error",
				"value":"test"
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
				"_outputs":["assign-if"]
			},
			{
				"taskType": "AssignTask",
				"name":"assign-if",
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
				"_errors":["testFunctionResult"]
			},
			{
				"taskType": "FunctionOutputTask",
				"name": "testFunctionResult"
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("callFunction", {"testProperty" : 303});
		value = (result.error === "test");	
	});
	return value;
}


test('functionFlow', async () => {
	let value : boolean = await functionTestFlow();
	expect(value).toBe(true);
})

test('functionInFunctionFlow', async () => {
	let value : boolean = await functionInFunctionTestFlow();
	expect(value).toBe(true);
})

test('functionIfConditionFlow', async () => {
	let value : boolean = await functionIfConditionFlow();
	expect(value).toBe(true);
})

test('functionIfConditionErrorFlow', async () => {
	let value : boolean = await functionIfConditionErrorFlow();
	expect(value).toBe(true);
})
