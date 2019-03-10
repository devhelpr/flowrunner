let FlowTaskPackageType = require("./FlowTaskPackageType.js");

class FlowTask {
	execute(node, services) {
		return true;
	}

	executeAsHTTPEndpoint(node, request, response) {
		// only called when PackageType is FlowTaskPackageType.HTTP_ENDPOINT_NODE 
	}

	getName() {
		return "FlowTask"
	}

	getFullName() {
		return "FlowTask"
	}

	getIcon() {
		return ""
	}

	getShape() {
		return "circle"
	}

	// used for filtering
	getTaskType() {
		// both/frontend/backend/abstract .. #thought: replace "both" by something else
		return ""
	}

	// needed? used for filtering
	getCategory() {
		return ""
	}

	// needed? used for filtering
	getController() {
		return "CanvasController"
	}

	// metadata for configurating stuff like url's etc
	// stored on flowgroup level specific for a controller inheriting from canvascontroller
	// - specific model is probably needed for this
	getConfigMetaData() {
		return []
	}

	// ??? needed ?? metadata used when executing a step
	// it's unique for each step (stored together with the Node's data in database)
	getStepParametersMetaData() {
		return []
	}

	// Wordt deze al gebruikt??? wellicht tbv "Register plugin on init flow" 
	//  - Registreren is nodig in frontendflowrunner voor reducers te registreren
	//      en in backend voor model definitions tbv database
	//     .. wordt voor HTTP_ENDPOINT_NODE in (Backend)FlowEventRunner wel gebruikt..
	getPackageType() {
		return FlowTaskPackageType.DEFAULT_NODE
	}

	getInfo() {
		return ""
	}

	getDefaultFollowFlow() {
		return ""
	}

	getDefaultRelationName() {
		return ""
	}

	getPayloadContract() {
		return []
	}

	// "minimal" , "strict"
	getPayloadContractMode() {
		return "minimal"
	}

	getDefaultColor() {
		return "#000000";
	}

	isAttachedToExternalObservable() {
		return false;
	}

	isAttachedToStoreChanges() {
		return false;
	}

	getDescription() {
		return "{{{title}}}";
	}


}

module.exports = FlowTask;