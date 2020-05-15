import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";

jest.setTimeout(15000);

const parallelBasicFlow = async () => {
	const flowEventRunner = new FlowEventRunner();
	const humanFlowPackage = {
		flow : [
			{
				"taskType": "ParallelTask",
				"name":"parallel",
				"_outputs":["console1","console2"]
			},
			{
				"taskType": "TraceConsoleTask",
				"name":"console1",
				"message":"test",
				"_outputs":["assign1"]
			},
			{
				"taskType": "AssignTask",
				"name":"assign1",
				"assignToProperty":"test1",
				"value":"test",
				"_outputs":["parallelresolve"]
			},
			{
				"taskType": "TraceConsoleTask",
				"name":"console2",
				"message":"test",
				"_outputs":["assign2"]
			},
			{
				"taskType": "AssignTask",
				"name":"assign2",
				"assignToProperty":"test2",
				"value":"test",
				"_outputs":["parallelresolve"]
			},
			{
				"taskType": "ParallelResolveTask",
				"name":"parallelresolve",
				"_outputs":[]
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("parallel", {});
		let counter = 0;
		let test1 = false;
		let test2 = false;
		//result.payloads.map((payload : any) => {
			if (result.test1 !== undefined && result.test1 === "test" && !test1) {
				test1 = true;
				counter++;
			}
			if (result.test2 !== undefined && result.test2 === "test" && !test2) {
				test2 = true;
				counter++;
			}
		//})
		value = counter === 2 && !!test1 && !!test2;
	});
	return value;
}


test('parallelBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await parallelBasicFlow();
	expect(value).toBe(true);
})
