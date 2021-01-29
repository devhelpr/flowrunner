import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class ParallelResolveTask extends FlowTask {
  public execute(node: any, services: any) {
    services.logMessage(
      'RUNNING ParallelResolveTask: ' + node.id + ' - ' + node.name
    );

    return true;
  }

  public getName() {
    return 'ParallelResolveTask';
  }

  public getFullName() {
    return 'ParallelResolve';
  }

  public getDescription() {
    return 'Node that waits until all parallel outputs resolved';
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
    return FlowTaskPackageType.PARALLEL_RESOLVE_NODE;
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
