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
        next: (data : any) => {
          if (typeof self.nodesListeners[nodeName] === 'object') {
            const length = self.nodesListeners[nodeName].length; 
            
            // TODO: fix this... feels hacky and not "as expected"
            //  .. see the emit method with its ...args parameter
            //  .. make that "as expected"

            //let payload = data.length > 0 && {...data[0]};
            //let callStack =  data.length > 1 && {...data[1]};
            //console.log("DATA:" , data, "PAYLOAD:", payload, "CALLSTACK: " , callStack);

            let _payload = {...data.payload};
            let _callstack = {...data.callstack};

            for (let i = 0; i < length; i++) {
              self.nodesListeners[nodeName][i](_payload, _callstack);
            }
            (_payload as any) = null;
            (_callstack as any) = null;
          }
        },
      });
    }
  };

  public removeListener = (nodeName: any) => {
    if (this.subjects[nodeName] && this.subscriptions[nodeName]) {
      this.subscriptions[nodeName].unsubscribe();
      this.subscriptions[nodeName] = null;
      delete this.subscriptions[nodeName];

      this.subjects[nodeName].complete();
      this.subjects[nodeName] = null;

      delete this.subjects[nodeName];
    }

    //if (typeof this.nodesListeners[nodeName] === 'object') {
    //  this.nodesListeners[nodeName] = [];
    //}
    this.nodesListeners[nodeName] = null;
    delete this.nodesListeners[nodeName];
  };

  public emit = (nodeName: any, payload: any, callstack : any) => {
    if (typeof this.subjects[nodeName] === 'object') {
      let subject$ = this.subjects[nodeName];
      let _payload = {...payload};
      let _callstack = {...callstack};

      subject$.next({payload: _payload, callstack: _callstack});

      subject$ = null;
      _payload = null;
      _callstack = null;

    }
  };

  public emitToController = (nodeName: any, controllerName: string, payload: any, currentCallstack: any) => {
    if (this.nodesControllers[nodeName] && this.nodesControllers[nodeName][controllerName]) {
      let value = payload[controllerName];
      let callStack = {...currentCallstack};
      //console.log ("callStack:", callStack, "currentCallstack", currentCallstack);
      this.nodesControllers[nodeName][controllerName].subject.next({
        currentCallstack: callStack,
        value: value,
      });
      callStack = null;
      value = null;
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
          hasValue: false,
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
            let _payload = payload;
            let _callstack = _payload.currentCallstack;
            if (_payload.value !== undefined) {
              controllerObservables[controller.name].value = _payload.value;
              controllerObservables[controller.name].hasValue = true;
              /*
                only emit .. 
                  - if all controllerObservables have a value
                then emit all value of all controllerObservables at once in a single payload
              */
              const sendPayload: any = {};
              let emitToNode = true;
              Object.keys(controllerObservables).map(key => {
                emitToNode = emitToNode && controllerObservables[key].hasValue;
                sendPayload[key] = _payload[key];
              });
              if (!!emitToNode) {
                this.emit(node.id.toString(), sendPayload, _callstack);
              }
            }

            _payload = null;
            _callstack = null;
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
