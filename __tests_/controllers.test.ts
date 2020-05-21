
import { FlowEventRunner } from "../src/FlowEventRunner";
import { doesConnectionEmit } from '../src/helpers/EmitOutput';

jest.setTimeout(15000);


const testControllerConnectionBasicFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"inputcontroller",
				"value": 808
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"controllerName" : "inputcontroller",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8"
			},
			{
				"id": "AssignNode2",
				"name": "AssignNode2",
				"taskType": "AssignTask",
				"assignToProperty":"inputcontroller2",
				"value": 909
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e9",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode2",
				"endshapeid": "EndNode",
				"controllerName" : "inputcontroller2",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e9"
			},
			{
				"id": "EndNode",
				"name": "EndNode",
				"controllers": [
					{
						"name" : "inputcontroller",
						"defaultValue" : 303
					},
					{
						"name" : "inputcontroller2",
						"defaultValue" : 101
					}
				],
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
		value = (result.inputcontroller === 808) && (result.inputcontroller2 === 101);
	});
	return value;
}


test('testControllerConnectionBasicFlow', async () => {
	let value : boolean = await testControllerConnectionBasicFlow();
	expect(value).toBe(true);
})

