let indexOfFunction: any;

if (typeof Array.prototype.indexOf === 'function') {
  indexOfFunction = (haystack: any, needle: any) => {
    return haystack.indexOf(needle);
  };
} else {
  indexOfFunction = (haystack: any, needle: any) => {
    let i: number = 0;
    const length: number = haystack.length;
    let idx: number = -1;
    let found: boolean = false;

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

export const indexOf = (haystack: any, needle: any) => {
  return indexOfFunction(haystack, needle);
};
