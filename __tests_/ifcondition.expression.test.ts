import { FlowEventRunner, HumanFlowToMachineFlow } from "../src";

const ifConditionCompiledExpressionFlow = async () => {
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
				"mode" : "compiled-expression",
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

test('ifConditionCompiledExpressionFlow', async () => {
	let value : boolean = await ifConditionCompiledExpressionFlow();
	expect(value).toBe(true);
})



