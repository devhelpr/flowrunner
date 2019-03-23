const uuidV4 = require('uuid/v4');

module.exports = {
	convert: function(humanFlowPackege : any) {
		let flowPackage = Object.assign({}, humanFlowPackege);

		flowPackage.flow.map(function (flowNode : any) {
			flowNode._id = flowNode.id;
			if (typeof flowNode._outputs !== "undefined") {
				flowNode._outputs.map(function (outputNode : any) {
					let connection : any = {};
					connection.id = uuidV4();
					connection._id = connection.id;
					connection.shapeType="line";
					connection.title =  "relatedTo";
					connection.startshapeid = flowNode.id;
					connection.endshapeid = outputNode;
					flowPackage.flow.push(connection);
				});
			}
			if (typeof flowNode._errors !== "undefined") {
				flowNode._errors.map(function (outputNode : any) {
					let connection : any = {};
					connection.id = uuidV4();
					connection._id = connection.id;
					connection.shapeType="line";
					connection.title =  "relatedTo";
					connection.startshapeid = flowNode.id;
					connection.endshapeid = outputNode;
					connection.followflow = "onfailure";
					flowPackage.flow.push(connection);
				});
			}
		});

		return flowPackage;
	}
}