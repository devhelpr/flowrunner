import { BehaviorSubject, Subject } from '@reactivex/rxjs';

export class ReactiveEventEmitter {
  private nodesListeners: any = {};
  private subjects: any = {};
  private subscriptions: any = {};

  private nodesControllers: any = {};

  public on = (nodeName: any, listener: any) => {
    if (typeof this.nodesListeners[nodeName] !== 'object') {
      this.nodesListeners[nodeName] = [];
    }

    this.nodesListeners[nodeName].push(listener);

    if (typeof this.subjects[nodeName] !== 'object') {
      this.subjects[nodeName] = new Subject();
      const self: any = this;
      this.subscriptions[nodeName] = this.subjects[nodeName].subscribe({
        next: (data: any) => {
          if (typeof self.nodesListeners[nodeName] === 'object') {
            const length = self.nodesListeners[nodeName].length;

            for (let i = 0; i < length; i++) {
              self.nodesListeners[nodeName][i](...data);
            }
          }
        },
      });
    }
  };

  public removeListener = (nodeName: any) => {
    if (this.subjects[nodeName] && this.subscriptions[nodeName]) {
      this.subscriptions[nodeName].unsubscribe();
      this.subscriptions[nodeName] = undefined;

      this.subjects[nodeName].complete();
      this.subjects[nodeName] = undefined;

      delete this.subjects[nodeName];
    }

    if (typeof this.nodesListeners[nodeName] === 'object') {
      this.nodesListeners[nodeName] = [];
    }
  };

  public emit = (nodeName: any, ...args: any) => {
    if (typeof this.subjects[nodeName] === 'object') {
      const subject$ = this.subjects[nodeName];

      subject$.next(args);
    }
  };

  public emitToController = (nodeName: any, controllerName: string, payload: any, currentCallstack: any) => {
    if (this.nodesControllers[nodeName] && this.nodesControllers[nodeName][controllerName]) {
      this.nodesControllers[nodeName][controllerName].subject.next({
        currentCallstack,
        value: payload[controllerName],
      });
    }
  };

  public registerNodeControllers(node: any) {
    const controllerObservables: any = {};

    node.controllers.map((controller: any) => {
      if (controller.name) {
        const subject = new BehaviorSubject<any>({
          name: controller.name,
          value: controller.defaultValue || 0,
        });
        controllerObservables[controller.name] = {
          subject,
          value: controller.defaultValue || 0,
        };
        const observerSubscription: any = {
          complete: () => {
            // this.services.logMessage('Controller: Completed for ', node.name, controller.name);
          },
          error: (err: any) => {
            // this.services.logMessage('Controller: Error', node.name, controller.name, err);
          },
          next: (payload: any) => {
            controllerObservables[controller.name].value = payload.value;
            this.emit(node.id.toString(), { [controller.name]: payload[controller.name] }, payload.currentCallstack);
          },
        };

        subject.subscribe(observerSubscription);
      }
    });

    if (node.controllers.length > 0) {
      this.nodesControllers[node.name] = controllerObservables;
    }
  }

  public getNodeControllerValue(nodeName: string, controllerName: string) {
    if (this.nodesControllers[nodeName] && this.nodesControllers[nodeName][controllerName]) {
      return this.nodesControllers[nodeName][controllerName].value;
    }
    return;
  }
}
