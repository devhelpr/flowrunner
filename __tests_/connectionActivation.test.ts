import { FlowEventRunner } from "../src/FlowEventRunner";

jest.setTimeout(15000);



const testConnectionNotActivatingFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"test",
				"value":10,
				"tag":"test-tag"
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"tag": "test-tag",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"activationThreshold":15,
				"activationProperty": "test"
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
		value = (result.end === undefined);
	});
	return value;
}

const testConnectionActivatingFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"test",
				"value":20,
				"tag":"test-tag"
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"tag": "test-tag",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"activationThreshold":15,
				"activationProperty": "test"
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


const testConnectionNotByActivatingFunctionFlow = async () => {
	const flowEventRunner = new FlowEventRunner();
	flowEventRunner.registerActivationFuncion("test", (_connection : any, _payload : any) => {
		return false;
	});	
	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"test",
				"value":10,
				"tag":"test-tag"
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"tag": "test-tag",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"activationFunction":"test"
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
		value = (result.end === undefined);
	});
	return value;
}
/*
(1 / (1 + (2.718281828459045 ^ (-1 * x))))
*/
const testConnectionByActivatingSigmoidFunctionFlow = async () => {
	const flowEventRunner = new FlowEventRunner();
	flowEventRunner.registerActivationFuncion("sigmoid", (_connection : any, _payload : any) => {
		let x = 12;
		let result = 1/(1+Math.pow(Math.E, -x));
		console.log("sigmoid", result);

		return result >= 0.9;
	});

	const flowPackage = {
		flow : [			
			{
				"id": "AssignNode",
				"name": "AssignNode",
				"taskType": "AssignTask",
				"assignToProperty":"test",
				"value":10,
				"tag":"test-tag"
			},
			{
				"name": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"taskType": "connection",
				"shapeType": "Line",
				"startshapeid": "AssignNode",
				"endshapeid": "EndNode",
				"tag": "test-tag",
				"id": "connection-58b9342d-3468-46b5-85b3-e395236e70e8",
				"activationFunction":"sigmoid"
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
		console.log("result", result);
		value = (result.end === "ok");
	});
	return value;
}


test('testConnectionNotActivatingFlow', async () => {
	let value : boolean = await testConnectionNotActivatingFlow();
	expect(value).toBe(true);
});

test('testConnectionActivatingFlow', async () => {
	let value : boolean = await testConnectionActivatingFlow();
	expect(value).toBe(true);
});


test('testConnectionNotByActivatingFunctionFlow', async () => {
	let value : boolean = await testConnectionNotByActivatingFunctionFlow();
	expect(value).toBe(true);
});


test('testConnectionByActivatingSigmoidFunctionFlow', async () => {
	let value : boolean = await testConnectionByActivatingSigmoidFunctionFlow();
	expect(value).toBe(true);
});

