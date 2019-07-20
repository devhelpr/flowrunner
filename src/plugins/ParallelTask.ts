import * as Promise from 'promise';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class ParallelTask extends FlowTask {
  public execute(node: any, services: any) {
    services.logMessage('RUNNING ParallelTask: ' + node.id + ' - ' + node.name);

    return Object.assign({}, node.payload);
  }

  public getName() {
    return 'ParallelTask';
  }

  public getFullName() {
    return 'Parallel';
  }

  public getDescription() {
    return 'Node that sends out parallel outputs';
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
    return FlowTaskPackageType.PARALLEL_NODE;
  }

  public getCategory() {
    return 'FlowCanvas';
  }

  public getController() {
    return 'FlowCanvasController';
  }

  public getConfigMetaData() {
    return [];
  }
}
