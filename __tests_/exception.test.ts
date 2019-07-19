import { FlowEventRunner  } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";
import { FlowTask } from "../src/FlowTask";

jest.setTimeout(15000);


class ExceptionTask extends FlowTask {
	public execute() {
		throw new Error("Exception from ExceptionTask")
	}

	public getName() {
		return "ExceptionTask";
	}
}
const testBasicFlow = async () => {
	const flowEventRunner = new FlowEventRunner();
	flowEventRunner.registerTask("ExceptionTask", ExceptionTask);

	const humanFlowPackage = {
		flow : [
			{
				"taskType": "ExceptionTask",
				"name":"exception"
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	let value : boolean = false;
	await flowEventRunner.start(flowPackage).then(async () => {
		let result : any = await flowEventRunner.executeNode("exception", {});
		value = false;
	}).catch(() => {
		value = true;
	})
	return value;
}



test('testBasicFlow', async () => {
	// https://jestjs.io/docs/en/tutorial-async
	let value : boolean = await testBasicFlow();
	expect(value).toBe(true);
})
