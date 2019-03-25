import * as Promise from 'promise';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class FunctionCallTask extends FlowTask {
  public execute(node: any) {
    console.log('RUNNING FunctionCallTask: ' + node.id + ' - ' + node.title);

    return new Promise((resolve: any, reject: any) => {
      resolve(node.payload);
    });
  }

  public getName() {
    return 'FunctionCallTask';
  }

  public getFullName() {
    return 'FunctionCall';
  }

  public getDescription() {
    return 'Node that calls a function node';
  }

  public getIcon() {
    return 'functioncall';
  }

  public getShape() {
    return 'circle';
  }

  public getTaskType() {
    return 'both';
  }

  public etPackageType() {
    return FlowTaskPackageType.FUNCTION_NODE;
  }

  public getCategory() {
    return 'FlowCanvas';
  }

  public getController() {
    return 'FlowCanvasController';
  }

  public getConfigMetaData() {
    return [
      { name: 'functionnodeid', defaultValue: '', valueType: 'enum', required: true, optionsViaController: true },
    ];
  }
}
