import { FlowEventRunner } from "../src/FlowEventRunner";
import { HumanFlowToMachineFlow } from "../src/HumanFlowToMachineFlow";
import * as Rx from '@reactivex/rxjs';

test('testObservableFlow', done => {

	const flowEventRunner = new FlowEventRunner();
	const humanFlowPackage = {
		flow : [			
			{
				"taskType": "AssignTask",
				"name":"assign",
				"assignToProperty":"test",
				"value":"test1234",
				"subtype": "",
				"_outputs":["observable"]
			},
			{
				"taskType": "ObservableTask",
				"name":"observable",
				"observeProperty":"test",
				"subtype": "",
				"_outputs":[]
			}
		]
	}

	const flowPackage = HumanFlowToMachineFlow.convert(humanFlowPackage);
	flowEventRunner.start(flowPackage).then((services) => {
		console.log("started");

		let observable = flowEventRunner.getObservableNode("observable");
		if (observable !== false) {
			console.log("observable found");
			try {
				(observable as unknown as Rx.Observable<string>).subscribe({
					next: (data: any) => {
						console.log(data);
						if (data.test) {
							expect(data.test).toBe("test1234");
							done();
						}
					},
				});
				console.log("is subscribed to observable");
				flowEventRunner.executeNode("assign", {});
			} catch (err) {
				console.log(err);
				expect(false).toBe(true);
				done();	
		}
			
		} else {
			expect(false).toBe(true);
			done();
		}
				
	});

})