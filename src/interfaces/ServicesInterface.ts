export interface ServicesInterface {
  logMessage(...args : any): any;
  pluginClasses: any;
  registerModel(modelName: string, definition: any): any;
}
