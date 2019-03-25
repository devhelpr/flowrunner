import * as Promise from 'promise';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class FunctionInputTask extends FlowTask {
  public execute(node: any) {
    console.log('RUNNING FunctionInputTask: ' + node.id + ' - ' + node.title);

    return new Promise((resolve: any, reject: any) => {
      resolve(node.payload);
    });
  }

  public getName() {
    return 'FunctionInputTask';
  }

  public getFullName() {
    return 'FunctionInput';
  }

  public getDescription() {
    return "Node that's the startpoint for this function";
  }

  public getIcon() {
    return 'FunctionInput';
  }

  public getShape() {
    return 'circle';
  }

  public getTaskType() {
    return 'both';
  }

  public getPackageType() {
    return FlowTaskPackageType.FUNCTION_INPUT_NODE;
  }

  public getCategory() {
    return 'FlowCanvas';
  }

  public getController() {
    return 'FlowCanvasController';
  }
}
