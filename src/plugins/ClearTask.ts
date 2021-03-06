import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class ClearTask extends FlowTask {
  public execute(node: any, services: any) {
    services.logMessage('RUNNING ClearTask: ' + node.id + ' - ' + node.name);

    const properties: any = {};

    if (node.keepProperties !== undefined && node.keepProperties !== '') {
      node.keepProperties.split(',').map((propertyItem: any) => {
        const propertyName = propertyItem.trim();
        if (propertyName !== '') {
          if (node.payload[propertyName] !== undefined) {
            properties[propertyName] = node.payload[propertyName];
          }
        }
        return true;
      });
    }

    return Object.assign({}, properties);
  }

  public getName() {
    return 'ClearTask';
  }

  public getFullName() {
    return 'Clear';
  }

  public getDescription() {
    return 'Node that clears the payload';
  }

  public getIcon() {
    return 'clear';
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
    return [{ name: 'keepProperties', defaultValue: '', valueType: 'string' }];
  }
}
