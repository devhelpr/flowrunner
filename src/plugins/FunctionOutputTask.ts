import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class FunctionOutputTask extends FlowTask {
  public execute(node: any, services: any) {
    services.logMessage(
      'RUNNING FunctionOutputTask: ' + node.id + ' - ' + node.name
    );

    return new Promise((resolve: any, _reject: any) => {
      resolve(node.payload);
    });
  }

  public getName() {
    return 'FunctionOutputTask';
  }

  public getFullName() {
    return 'FunctionOutput';
  }

  public getDescription() {
    return 'Node that is the end for this function';
  }

  public getIcon() {
    return 'FunctionOutput';
  }

  public getShape() {
    return 'smallcircle';
  }

  public getDefaultColor() {
    return '#3d93dd';
  }

  public getTaskType() {
    return 'both';
  }

  public getPackageType() {
    return FlowTaskPackageType.FUNCTION_OUTPUT_NODE;
  }

  public getCategory() {
    return 'FlowCanvas';
  }

  public getController() {
    return 'FlowCanvasController';
  }
}
