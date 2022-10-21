import { FlowEventRunner, HumanFlowToMachineFlow } from "../src";

const ifConditionExpressionFlow = async () => {
	const flowEventRunner = new FlowEventRunner();

	const humanFlowPackage = {
		flow : [
			
			{
				"taskType": "AssignTask",
				"name":"assign",
				"assignToProperty":"test",
				"value":123,
				"subtype": "",
				"_outputs":["ifthen"]
			},
			{
				"taskType": "IfConditionTask",
				"mode" : "expression",
				"name":"ifthen",
				"expression":"test == 123",				
				"_outputs":["then"],
				"_errors":["else"]
			},
			{
				"taskType": "AssignTask",
				"name":"else",
				"assignToProperty":"error",
				"value":"test"
			},{
				"taskType": "AssignTask",
				"name":"then",
				"assignToProperty":"result",
				"value":"ok"
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
		value = (result.result === "ok");
	});
	return value;
}

test('ifConditionExpressionFlow', async () => {
	let value : boolean = await ifConditionExpressionFlow();
	expect(value).toBe(true);
})
