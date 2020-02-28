import * as Rx from '@reactivex/rxjs';
import { indexOf } from './IndexOf';

export class ReactiveEventEmitter {
  private events: any = {};
  private subjects: any = {};

  public on = (event: any, listener: any) => {
    if (typeof this.events[event] !== 'object') {
      this.events[event] = [];
    }

    this.events[event].push(listener);

    if (typeof this.subjects[event] !== 'object') {
      this.subjects[event] = new Rx.Subject();
      const self: any = this;
      this.subjects[event].subscribe({
        next: (data: any) => {
          if (typeof self.events[event] === 'object') {
            const length = self.events[event].length;

            for (let i = 0; i < length; i++) {
              self.events[event][i](...data);
            }
          }
        },
      });
    }
  };

  // public removeListener = (event: any, listener: any) => {
  public removeListener = (event: any) => {
    //let idx;
    
    if (this.subjects[event]) {      
      this.subjects[event].unsubscribe();
      this.subjects[event].complete();
      this.subjects[event] = undefined;
      delete this.subjects[event];
    }

    if (typeof this.events[event] === 'object') { 
      this.events[event] = [];
      /*     
      idx = indexOf(this.events[event], listener);

      if (idx > -1) {
        this.events[event].splice(idx, 1);
      }
      */
    }
  };

  public emit = (event: any, ...args: any) => {
    if (typeof this.subjects[event] === 'object') {
      const subject$ = this.subjects[event];

      subject$.next(args);
    }
  };
}
