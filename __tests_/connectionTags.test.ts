import { FlowEventRunner } from "../src/FlowEventRunner";
import { doesConnectionEmit } from '../src/helpers/EmitOutput';

jest.setTimeout(15000);

const testDoesConnectionEmit = () => {
	return doesConnectionEmit(
		{
			tag: "test",
			id:"testconnection",
			name:"testconnection"
		},
		{
			tag: "test", 
			id : "test",
			name :"test",
			taskType :"test"
		}, {});
}

const testConnectionTagBasicFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"test",
				"value":"test",
				"tag":"test-tag"
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"tag": "test-tag",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8"
			},
			{
				"id": "EndNode",
				"name": "EndNode",
				"taskType": "AssignTask",
				"assignToProperty":"end",
				"value":"ok"
			}	
		]
	}
	
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async (services : any) => {
		services.logMessage = (...args : any) => {
			console.log(...args)
		}
		let result : any = await flowEventRunner.executeNode("AssignNode", {});
		console.log("result" , result);
		value = (result.end === "ok");
	});
	return value;
}

const testConnectionTagNotFiringFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"test",
				"value":"test",
				"tag":"test-tag-different"
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"tag":"test-tag",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8"
			},
			{
				"id": "EndNode",
				"name": "EndNode",
				"taskType": "AssignTask",
				"assignToProperty":"end",
				"value":"ok"
			}	
		]
	}
	
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async (services : any) => {
		services.logMessage = (...args : any) => {
			console.log(...args)
		}
		let result : any = await flowEventRunner.executeNode("AssignNode", {});
		value = (result.end !== "ok");
	});
	return value;
}


const testConnectionEventBasicFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"test",
				"value":"test",
				"tag":"test-tag",
				"events": [
					{
						"eventName" : "onFire"
					}
				]
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"tag": "test-tag",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"event" : "onFire"
			},
			{
				"id": "EndNode",
				"name": "EndNode",
				"taskType": "AssignTask",
				"assignToProperty":"end",
				"value":"ok"
			}	
		]
	}
	
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async (services : any) => {
		services.logMessage = (...args : any) => {
			console.log(...args)
		}
		let result : any = await flowEventRunner.triggerEventOnNode("AssignNode", "onFire", {});
		console.log("result" , result);
		value = (result.end === "ok");
	});
	return value;
}

const testConnectionEventBasicNoEventFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"test",
				"value":"test",
				"tag":"test-tag",
				"events": [
					{
						"eventName" : "onFire"
					}
				]
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"tag": "test-tag",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"event" : "onFire"
			},
			{
				"id": "EndNode",
				"name": "EndNode",
				"taskType": "AssignTask",
				"assignToProperty":"end",
				"value":"ok"
			}	
		]
	}
	
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async (services : any) => {
		services.logMessage = (...args : any) => {
			console.log(...args)
		}
		let result : any = await flowEventRunner.executeNode("AssignNode", {});
		console.log("result" , result);
		value = (result.end !== "ok");
	});
	return value;
}



test('testConnectionTagBasicFlow', async () => {
	let value : boolean = await testDoesConnectionEmit();
	expect(value).toBe(true);
})

test('testConnectionTagBasicFlow', async () => {
	let value : boolean = await testConnectionTagBasicFlow();
	expect(value).toBe(true);
})

test('testConnectionTagNotFiringFlow', async () => {
	let value : boolean = await testConnectionTagNotFiringFlow();
	expect(value).toBe(true);
})

test('testConnectionEventBasicFlow', async () => {
	let value : boolean = await testConnectionEventBasicFlow();
	expect(value).toBe(true);
})

test('testConnectionEventBasicNoEventFlow', async () => {
	let value : boolean = await testConnectionEventBasicNoEventFlow();
	expect(value).toBe(true);
})

