import * as FlowTaskPackageType from './FlowTaskPackageType';

export class FlowTask {
  public execute(node: any, services?: any, callStack?: any): any {
    return true;
  }

  public executeAsHTTPEndpoint(node: any, request: any, response: any) {
    // only called when PackageType is FlowTaskPackageType.HTTP_ENDPOINT_NODE
  }

  public getName() {
    return 'FlowTask';
  }

  public getFullName() {
    return 'FlowTask';
  }

  public getIcon() {
    return '';
  }

  public getShape() {
    return 'circle';
  }

  // used for filtering
  public getTaskType() {
    // both/frontend/backend/abstract .. #thought: replace "both" by something else
    return '';
  }

  // needed? used for filtering
  public getCategory() {
    return '';
  }

  // needed? used for filtering
  public getController() {
    return 'CanvasController';
  }

  // metadata for configurating stuff like url's etc
  // stored on flowgroup level specific for a controller inheriting from canvascontroller
  // - specific model is probably needed for this
  public getConfigMetaData(): any {
    return [];
  }

  // ??? needed ?? metadata used when executing a step
  // it's unique for each step (stored together with the Node's data in database)
  public getStepParametersMetaData() {
    return [];
  }

  // Wordt deze al gebruikt??? wellicht tbv "Register plugin on init flow"
  //  - Registreren is nodig in frontendflowrunner voor reducers te registreren
  //      en in backend voor model definitions tbv database
  //     .. wordt voor HTTP_ENDPOINT_NODE in (Backend)FlowEventRunner wel gebruikt..
  public getPackageType() {
    return FlowTaskPackageType.DEFAULT_NODE;
  }

  public getInfo() {
    return '';
  }

  public getDefaultFollowFlow() {
    return '';
  }

  public getDefaultRelationName() {
    return '';
  }

  public getPayloadContract() {
    return [];
  }

  // "minimal" , "strict"
  public getPayloadContractMode() {
    return 'minimal';
  }

  public getDefaultColor() {
    return '#000000';
  }

  public isAttachedToExternalObservable() {
    return false;
  }

  public isAttachedToStoreChanges() {
    return false;
  }

  public isSampling() {
    return false;
  }

  public isThrottling() {
    return false;
  }

  public getDescription() {
    return '{{{title}}}';
  }
}
