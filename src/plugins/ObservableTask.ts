import { Observable, Subject } from '@reactivex/rxjs';
import * as Promise from 'promise';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class ObservableTask extends FlowTask {
  public execute(node: any, services: any) {
    if (node.observable) {
      if (!node.observeProperty || (node.observeProperty && node.payload[node.observeProperty])) {
        node.observable.next(Object.assign({}, node.payload));
      }

      return node.observable;
    }
    return false;
  }

  public getObservable(node: any) {
    if (node.observable === undefined) {
      node.observable = new Subject<string>();
    }
    return node.observable;
  }

  public isAttachedToExternalObservable() {
    return false;
  }

  public getDescription() {
    return 'Node that creates an observable';
  }

  public getName() {
    return 'ObservableTask';
  }

  public getFullName() {
    return 'Observable';
  }

  public getIcon() {
    return 'observable';
  }

  public getShape() {
    return 'smallcircle';
  }

  public getDefaultColor() {
    return '#00ff80ff';
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
    return [{ name: 'observeProperty', defaultValue: '', valueType: 'string', required: true }];
  }
}
