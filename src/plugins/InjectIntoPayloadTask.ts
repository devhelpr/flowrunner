import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';
import { IServicesInterface } from '../interfaces/ServicesInterface';

export class InjectIntoPayloadTask extends FlowTask {
  public execute(node: any, services: IServicesInterface) {
    services.logMessage('RUNNING InjectIntoPayloadTask: ' + node.id + ' - ' + node.name);
    try {
      if (node.object !== undefined) {
        node.payload = Object.assign({}, node.payload, node.object);
      }
      
      return node.payload;
    } catch (err) {
      services.logMessage(err);
    }
  }

  public getName() {
    return 'InjectIntoPayloadTask';
  }

  public getFullName() {
    return 'InjectIntoPayload';
  }

  public getDescription() {
    return 'Node that adds properties of node.object into payload';
  }

  public getIcon() {
    return 'inject';
  }

  public getShape() {
    return 'rect';
  }

  public getTaskType() {
    return 'both';
  }

  public getPackageType() {
    return FlowTaskPackageType.DEFAULT_NODE;
  }

  public getCategory() {
    return 'FlowCanvas';
  }

  public getController() {
    return 'FlowCanvasController';
  }

  public getConfigMetaData() {
    return [
      { name: 'object', defaultValue: '', valueType: 'string', required: true }
    ];
  }
}
