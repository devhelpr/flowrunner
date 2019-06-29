import { Observable, Subject } from '@reactivex/rxjs';
import * as Promise from 'promise';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class ObservableTask extends FlowTask {
  observable?: Subject<string>;

  public execute(node: any, services: any) {
    if (this.observable) {
      if (node.observeProperty && node.payload[node.observeProperty]) {
        this.observable.next(Object.assign({}, node.payload));
      }

      return this.observable;
    }
    return false;
  }

  public getObservable(node: any) {
    if (this.observable === undefined) {
      this.observable = new Subject<string>();
    }
    return this.observable;
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
