import { FlowEventRunner } from '..';
import { ActivationFunction } from './FunctionTypes';

export interface IServicesInterface {
  flowEventRunner: FlowEventRunner;
  pluginClasses: any;
  pluginTaskExtensions: any;
  logMessage(...args: any): any;
  registerModel(modelName: string, definition: any): any;
  getActivationFunction?(name: string): string | boolean | ActivationFunction;
}
