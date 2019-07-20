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
				"_outputs":["parallelresolve"]
			},
			{
				"taskType": "TraceConsoleTask",
				"name":"console2",
				"message":"test",
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
		value = true;
	});
	return value;
}


test('parallelBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await parallelBasicFlow();
	expect(value).toBe(true);
})
