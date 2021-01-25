import * as Promise from 'promise';
import { Observable } from 'rxjs';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class ObserverTask extends FlowTask {
  public execute(node: any, services: any) {
    const counter = 0;
    const observable = Observable.create((observer: any) => {
      try {
        if (node.observe !== undefined && node.observe !== '') {
          const observableSubscription = services.getObservable(node.observe);

          if (observableSubscription !== undefined && observableSubscription !== false) {
            const observerSubscription: any = {
              complete: () => {
                services.logMessage('ObserverTask: Completed observable for ', node.name);
              },
              error: (err: any) => {
                observer.error(err);
              },
              next: (payload: any) => {
                if (payload !== undefined && payload.data !== undefined) {
                  observer.next(payload.data);
                } else {
                  observer.next({});
                }
              },
            };

            observableSubscription.subscribe(observerSubscription);
          } else {
            observer.error('ObserverTask: Error - observable not found', node.observe);
          }
        } else {
          observer.error('ObserverTask: Error - nothing to observe');
        }
      } catch (err) {
        observer.error(err);
      }
    });

    return observable;
  }

  public isAttachedToExternalObservable() {
    return true;
  }

  public getDescription() {
    return 'Node that is subscribed to a reactive observable: {{{observe}}}';
  }

  public getName() {
    return 'ObserverTask';
  }

  public getFullName() {
    return 'Observer';
  }

  public getIcon() {
    return 'observer';
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
    return [{ name: 'observe', defaultValue: '', valueType: 'string', required: true }];
  }
}
