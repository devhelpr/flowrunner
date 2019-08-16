import { FlowEventRunner } from "..";

export interface IServicesInterface {
  flowEventRunner : FlowEventRunner;
  pluginClasses: any;
  logMessage(...args: any): any;
  registerModel(modelName: string, definition: any): any;
}
