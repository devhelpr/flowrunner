import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";
import { doesConnectionEmit } from '../src/helpers/EmitOutput';

jest.setTimeout(15000);

const testDoesConnectionEmit = () => {
	expect(doesConnectionEmit(
		{
			tag: "test"
		},
		{
			tag: "test", 
			id : "test",
			name :"test",
			taskType :"test"
		}, {})).toBe(true);
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

test('testConnectionTagBasicFlow', async () => {
	let value : boolean = await testConnectionTagBasicFlow();
	expect(value).toBe(true);
})

test('testConnectionTagNotFiringFlow', async () => {
	let value : boolean = await testConnectionTagNotFiringFlow();
	expect(value).toBe(true);
})