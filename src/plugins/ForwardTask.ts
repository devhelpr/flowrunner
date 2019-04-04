import * as Promise from 'promise';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class ForwardTask extends FlowTask {
  public execute(node: any) {
    console.log('RUNNING ForwardTask: ' + node.id + ' - ' + node.title);

    return true;
  }

  public getName() {
    return 'ForwardTask';
  }

  public getFullName() {
    return 'Forward';
  }

  public getDescription() {
    return 'Node that forwards the event to the attached nodes';
  }

  public getIcon() {
    return 'forward';
  }

  public getShape() {
    return 'smallcircle';
  }

  public getDefaultColor() {
    return '#eeeeee80';
  }

  public getTaskType() {
    return 'both';
  }

  public getPackageType() {
    return FlowTaskPackageType.FORWARD_NODE;
  }

  public getCategory() {
    return 'FlowCanvas';
  }

  public getController() {
    return 'FlowCanvasController';
  }
}
