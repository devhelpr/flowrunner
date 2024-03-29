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

/*
// this situation cant be tested.. because the ifconditiontask doesn't trigger in this scenario

const ifConditionNoResultFlow = async () => {
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
				"compareProperty":"doesnexists",
				"withProperty":"",
				"withValue":"different",
				"usingCondition": "equals",
				"dataType":"string",
				"dontTriggerOnEmptyValues": true,
				"_outputs":["return"],
				"_errors":["else"]
			},
			{
				"taskType": "AssignTask",
				"name":"else",
				"assignToProperty":"ok",
				"value":"ja"
			},
			{
				"taskType": "AssignTask",
				"name":"return",
				"assignToProperty":"ok",
				"value":"ja"
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
		value = (result.ok ===  undefined);
	});
	return value;
}
*/

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


const testInjectTemplateWithValuesRangeIntoPayloadFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "InjectIntoPayloadTask",
				"name":"injectObject",
				"object":{
					"test":"{values:A1:B1}"
				},
				"transformObject": {
					"values" : {
						"name": "{name}",
						"value" : "{value}"
					}
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
				"values" : [["abc","def"],["ghi","jkl"],["mno","pqr"]]
			});
		console.log("testInjectTemplateWithValuesRangeIntoPayloadFlow", JSON.stringify(humanFlowPackage), result);
		value = (result.test.length === 2);
	});
	return value;
}

const testInjectTemplateWithValueIntoPayloadFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "InjectIntoPayloadTask",
				"name":"injectObject",
				"object":{
					"test":"{value:B3}"
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
				"values" : [["abc","def"],["ghi","jkl"],["mno","pqr"]]
			});
		console.log("testInjectTemplateWithValueIntoPayloadFlow", JSON.stringify(humanFlowPackage), result);
		value = (result.test == "pqr");
	});
	return value;
}

const testAssignTaskWithTemplateValues = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "AssignTask",
				"name":"assign",
				"assignToProperty":"abc",
				"value" : "{test}",				
				"_outputs":[],
				"replaceValues": true			
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("assign", 
			{
				"test" : "123"				
			});
		console.log("testAssignTaskWithTemplateValues", JSON.stringify(humanFlowPackage), result);
		value = (result.abc == "123");
	});
	return value;
}

const testRetriggerNode = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "AssignTask",
				"name":"assign",
				"assignToProperty":"abc",
				"value" : "abcdef",				
				"_outputs":["assign2"]			
			},
			{
				"taskType": "AssignTask",
				"name":"assign2",
				"assignToProperty":"def",
				"value" : "ghij",				
				"_outputs":[]		
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		await flowEventRunner.executeNode("assign", {});
		let result : any = await flowEventRunner.retriggerNode("assign2");
		console.log("testRetriggerNode", JSON.stringify(humanFlowPackage), result);
		value = (result.abc == "abcdef" && result.def == "ghij");
	});
	return value;
}

test('testBasicFlow', async () => {
	let value : boolean = await testBasicFlow();
	expect(value).toBe(true);
})

test('testInjectTemplateIntoPayloadFlow', async () => {
	let value : boolean = await testInjectTemplateIntoPayloadFlow();
	expect(value).toBe(true);
})

test('testInjectTemplateWithValuesRangeIntoPayloadFlow', async () => {
	let value : boolean = await testInjectTemplateWithValuesRangeIntoPayloadFlow();
	expect(value).toBe(true);
})

test('testDestroyFlow', async () => {
	let value : boolean = await testDestroyFlow();
	expect(value).toBe(true);
})

test('ifConditionBasicFlow', async () => {
	let value : boolean = await ifConditionBasicFlow();
	expect(value).toBe(true);
})

test('testInjectFlow', async () => {
	let value : boolean = await testInjectFlow();
	expect(value).toBe(true);
})


test('testTaskMetaData', async () => {
	let value : boolean = await testTaskMetaData();
	expect(value).toBe(true);
})

test('testInjectTemplateWithValueIntoPayloadFlow', async () => {
	let value : boolean = await testInjectTemplateWithValueIntoPayloadFlow();
	expect(value).toBe(true);
})

test('testAssignTaskWithTemplateValues', async () => {
	let value : boolean = await testAssignTaskWithTemplateValues();
	expect(value).toBe(true);
})

test('testRetriggerNode', async () => {
	let value : boolean = await testRetriggerNode();
	expect(value).toBe(true);
})
