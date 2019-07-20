export interface IServicesInterface {
  pluginClasses: any;
  logMessage(...args: any): any;
  registerModel(modelName: string, definition: any): any;
}
