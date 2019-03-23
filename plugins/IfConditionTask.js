let FlowTask = require("@devhelpr/flowrunner").FlowTask;
let FlowTaskPackageType = require("@devhelpr/flowrunner").FlowTaskPackageType;
let Promise = require('promise');
let moment = require('moment');

import { conditionCheck } from "./helpers/IfConditionHelpers";

export class IfConditionTask extends FlowTask {
	execute(node) {
		return new Promise((resolve,reject) => {

			let splitField1 = node.compareProperty.split(".");
			let splitField2 = node.withProperty.split(".");
			let errors = [];
			
			//console.log("splitField1", splitField1);
			//console.log("splitField2", splitField2);
			
			let field1 = node.payload[node.compareProperty];

			if (field1 == "[NOW]") {
				field1 = moment().toISOString();
			} 

			let field2;
			
			if (splitField2.length <= 1) {
				if (node.withValue !== undefined && node.withValue != "") {
					field2 = node.withValue;
				} else
				if (node.withProperty == "__TRUE__") {
					field2 = true;
				} else
				if (node.withProperty == "__EMPTY__") {
					field2 = "";
				} else
				if (node.withProperty == "[NOW]") {
					field2 = moment().toISOString();
				} else
				if (node.withProperty == "__ISISODATE__") {
					field2 = "__ISISODATE__";
				} else {
					field2 = node.payload[node.withProperty];
				} 
			} else {
				let objectToCheck = null;
				splitField2.map((fieldName) => {
					if (objectToCheck) {
						objectToCheck = objectToCheck[fieldName]
					} else {
						objectToCheck = node.payload[fieldName];
					}
				})
				field2 = objectToCheck;
			}

			if (conditionCheck(field1,field2,node.usingCondition,node.dataType)) {
				//console.log("conditionCheck: true", field1,field2,node.compareProperty,node.withProperty);
				resolve(node.payload);
			} else {
				//console.log("conditionCheck: false", field1,field2,node.compareProperty,node.withProperty);

				errors.push({
					name:node.compareProperty,
					error:node.compareProperty+" is not correct"
				})

				node.payload = Object.assign({}, node.payload, {
					followFlow:"isError",
					errors:errors
				})
				resolve(node.payload);
			}
		})
	}

	getName() {
		return "IfConditionTask"
	}

	getFullName() {
		return "IfCondition"
	}

	getDescription() {
		return "Node that succeeds depending on the condition";
	}

	getIcon() {
		return "ifthen"
	}

	getShape() {
		return "diamond"
	}

	getTaskType() {
		return "both"
	}

	getPackageType() {
		return FlowTaskPackageType.DEFAULT_NODE
	}

	getCategory() {
		return "FlowCanvas"
	}

	getController() {
		return "FlowCanvasController"
	}

	getConfigMetaData() {
		return [
			{name:"compareProperty", defaultValue:"", valueType:"string", required: true},
			{name:"withProperty", defaultValue:"", valueType:"string", required: false},
			{name:"withValue", defaultValue:"", valueType:"string", required: false},
			{name:"usingCondition", defaultValue:"", valueType:"enum",
				enumValues:["equals","not-equals","smaller","bigger","smaller-or-equal","bigger-or-equal"],
				enumText:["equals","not-equals","smaller","bigger","smaller-or-equal","bigger-or-equal"]
			},
			{name:"dataType", defaultValue:"", valueType:"enum",
				enumValues:["string","number","date"],
				enumText:["string","number","date"]
			},
			/*,
			{name:"thenFollowRelation", defaultValue:"", valueType:"string"},
			{name:"elseFollowRelation", defaultValue:"", valueType:"string"}

			// propertiesAreOfType
			*/
		]
	}
}