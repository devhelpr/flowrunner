import * as Rx from '@reactivex/rxjs';

/* Polyfill indexOf. */
let indexOf: any;

if (typeof Array.prototype.indexOf === 'function') {
  indexOf = (haystack: any, needle: any) => {
    return haystack.indexOf(needle);
  };
} else {
  indexOf = (haystack: any, needle: any) => {
    var i = 0,
      length = haystack.length,
      idx = -1,
      found = false;

    while (i < length && !found) {
      if (haystack[i] === needle) {
        idx = i;
        found = true;
      }

      i++;
    }

    return idx;
  };
}

class ReactiveEventEmitter {
  private events: any = {};
  private subjects: any = {};

  public on = (event: any, listener: any) => {
    if (typeof this.events[event] !== 'object') {
      this.events[event] = [];
    }

    this.events[event].push(listener);

    if (typeof this.subjects[event] !== 'object') {
      this.subjects[event] = new Rx.Subject();
      let self: any = this;
      this.subjects[event].subscribe({
        next: (data: any) => {
          if (typeof self.events[event] === 'object') {
            //let listeners = this.events[event].slice();
            let length = self.events[event].length;

            for (let i = 0; i < length; i++) {
              self.events[event][i](...data);
            }
          }
        },
      });
    }
  };

  public removeListener = (event: any, listener: any) => {
    var idx;

    if (typeof this.events[event] === 'object') {
      idx = indexOf(this.events[event], listener);

      if (idx > -1) {
        this.events[event].splice(idx, 1);
      }
    }
  };

  public emit = (event: any, ...args: any) => {
    if (typeof this.subjects[event] === 'object') {
      let subject$ = this.subjects[event];

      subject$.next(args);
    }
  };
}

export class EventEmitterHelper {
  static getEventEmitter() {
    return new ReactiveEventEmitter();
  }
}
