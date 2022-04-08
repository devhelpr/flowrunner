import { BehaviorSubject, Subject } from 'rxjs';
import { interval } from 'rxjs';
import { sampleTime, throttle } from 'rxjs/operators';

export interface IReactiveEventEmitterOptions {
  isThrottling: boolean;
  isSampling: boolean;
  sampleInterval?: number;
  throttleInterval?: number;
}
/*

  TODO :
    - add support for blocking flow until condition is met
    - only run node's within lock Context

    - use special rxjs observable which should be used together with buffer or something similar
          https://www.learnrxjs.io/learn-rxjs/operators/transformation/buffer


*/
export class ReactiveEventEmitter {
  public isPaused: boolean = false;
  public doPauseEverything : boolean = true;
  public sample: number = 30;
  public throttle: number = 30;

  private nodesListeners: any = {};
  private subjects: any = {};
  private subscriptions: any = {};

  private nodesControllers: any = {};

  private pausingSubject = new Subject<any>();

  public suspendUntilLock = (_lockID: string) => {};

  public liftLock = (_lockID: string) => {};

  public pauseFlowrunner = () => {
    this.isPaused = true;
  };

  public resumeFlowrunner = () => {
    this.isPaused = false;
    this.pausingSubject.next(true);
  };

  public stepToNextNode = () => {
    this.pausingSubject.next(true);
  };

  public on = (
    nodeName: any,
    listener: any,
    options?: IReactiveEventEmitterOptions
  ) => {
    if (typeof this.nodesListeners[nodeName] !== 'object') {
      this.nodesListeners[nodeName] = [];
    }

    this.nodesListeners[nodeName].push(listener);

    if (typeof this.subjects[nodeName] !== 'object') {
      const subject: any = new Subject();
      this.subjects[nodeName] = subject;

      const self: any = this;

      let subjectToSubscribe: any = this.subjects[nodeName];
      if (options) {
        if (options.isThrottling) {
          subjectToSubscribe = subjectToSubscribe.pipe(
            throttle(_val =>
              interval(options.throttleInterval || this.throttle)
            )
          );
        }
        if (options.isSampling) {
          subjectToSubscribe = subjectToSubscribe.pipe(
            sampleTime(options.sampleInterval || this.sample)
          );
        }
      }

      this.subscriptions[nodeName] = subjectToSubscribe.subscribe({
        next: (data: any) => {
          if (typeof self.nodesListeners[nodeName] === 'object') {
            const length = self.nodesListeners[nodeName].length;

            // TODO: fix this... feels hacky and not "as expected"
            //  .. see the emit method with its ...args parameter
            //  .. make that "as expected"

            // let payload = data.length > 0 && {...data[0]};
            // let callStack =  data.length > 1 && {...data[1]};
            // console.log("DATA:" , data, "PAYLOAD:", payload, "CALLSTACK: " , callStack);

            let payloadInstance = { ...data.payload };
            let callstackInstance = { ...data.callstack };

            for (let i = 0; i < length; i++) {
              self.nodesListeners[nodeName][i](
                payloadInstance,
                callstackInstance
              );
            }
            (payloadInstance as any) = null;
            (callstackInstance as any) = null;
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

    // if (typeof this.nodesListeners[nodeName] === 'object') {
    //  this.nodesListeners[nodeName] = [];
    // }
    this.nodesListeners[nodeName] = null;
    delete this.nodesListeners[nodeName];
  };

  private emitToSubject = (nodeName: any, payload: any, callstack: any) => {
    if (typeof this.subjects[nodeName] === 'object') {
      let subject$ = this.subjects[nodeName];
      let payloadInstance = { ...payload };
      let callstackInstance = { ...callstack };

      subject$.next({ payload: payloadInstance, callstack: callstackInstance });

      subject$ = null;
      payloadInstance = null;
      callstackInstance = null;
    }
  }

  private pauseSubscriptions: any = {};

  public emit = (nodeName: any, payload: any, callstack: any) => {
    if (!!this.isPaused && (this.doPauseEverything || 
        (!this.doPauseEverything && callstack['_executeNode'] === undefined))) {

      // TODO : fix pausing and suspending properly .. this is BUGGY!
      if (!this.pauseSubscriptions[nodeName]) {
        const pausingSubscription = this.pausingSubject.subscribe({
          next: () => {
            if (!this.isPaused) {
              this.pauseSubscriptions[nodeName].unsubscribe();
              delete this.pauseSubscriptions[nodeName];
            }
            this.emitToSubject(nodeName, payload, callstack);
          }
        });
        this.pauseSubscriptions[nodeName] = pausingSubscription;
      }

      // if in executeNode.. then finish that run of the flow before pausing

      // naive solution to pause the flow
      // .. should we also pause observables? it looks like these are also paused already !?
      return;
    }

    this.emitToSubject(nodeName, payload, callstack);
  };

  public emitToController = (
    nodeName: any,
    controllerName: string,
    payload: any,
    currentCallstack: any
  ) => {
    if (
      this.nodesControllers[nodeName] &&
      this.nodesControllers[nodeName][controllerName]
    ) {
      let value = payload[controllerName];
      let callStack = { ...currentCallstack };
      // console.log ("callStack:", callStack, "currentCallstack", currentCallstack);
      this.nodesControllers[nodeName][controllerName].subject.next({
        currentCallstack: callStack,
        value,
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
          error: (_err: any) => {
            // this.services.logMessage('Controller: Error', node.name, controller.name, err);
          },
          next: (payload: any) => {
            let payloadInstance = payload;
            let callstackInstance = payloadInstance.currentCallstack;
            if (payloadInstance.value !== undefined) {
              controllerObservables[controller.name].value =
                payloadInstance.value;
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
                sendPayload[key] = payloadInstance[key];
                return true;
              });
              if (!!emitToNode) {
                this.emit(node.id.toString(), sendPayload, callstackInstance);
              }
            }

            payloadInstance = null;
            callstackInstance = null;
          },
        };

        subject.subscribe(observerSubscription);
      }
      return true;
    });

    if (node.controllers.length > 0) {
      this.nodesControllers[node.name] = controllerObservables;
    }
  }

  public getNodeControllerValue(nodeName: string, controllerName: string) {
    if (
      this.nodesControllers[nodeName] &&
      this.nodesControllers[nodeName][controllerName]
    ) {
      return this.nodesControllers[nodeName][controllerName].value;
    }
    return;
  }
}
