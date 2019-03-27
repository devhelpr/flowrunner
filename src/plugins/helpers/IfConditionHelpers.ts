import * as moment from 'moment';

export function conditionCheck(field1: any, field2: any, condition: any, dataType: any) {
  if (dataType === 'date') {
    console.log('smaller-or-equal', moment(field1), moment(field2));
  }

  let field2Values = [];
  if (
    typeof field2 !== 'undefined' &&
    field2 !== '' &&
    field2 !== null &&
    !(field2 instanceof Date) &&
    typeof field2 !== 'number' &&
    !(field2 === true) &&
    field2 !== '__ISDATE__'
  ) {
    field2Values = field2.split(',');
  }

  if (field2 === '__ISISODATE__') {
    const date = moment(field1, 'YYYY-MM-DD', true);
    return date.isValid();
  } else if (condition === 'equals') {
    if (field2 === '') {
      return field1 === '' || typeof field1 === 'undefined' || field1 === null;
    } else {
      if (field2Values.length > 1) {
        return field2Values.indexOf(field1) >= 0;
      } else {
        if (dataType === 'date') {
          return moment(field1).isSame(moment(field2));
        } else if (dataType === 'number') {
          return parseFloat(field1) === parseFloat(field2);
        } else {
          return field1 === field2;
        }
      }
    }
  }

  if (condition === 'not-equals') {
    if (field2 === '') {
      return field1 !== '' && typeof field1 !== 'undefined' && field1 !== null;
    } else {
      if (dataType === 'date') {
        return !moment(field1).isSame(moment(field2));
      } else if (dataType === 'number') {
        return parseFloat(field1) !== parseFloat(field2);
      } else {
        return field1 !== field2;
      }
    }
  }

  if (condition === 'smaller') {
    if (dataType === 'date') {
      return moment(field1).isBefore(moment(field2));
    } else if (dataType === 'number') {
      return parseFloat(field1) < parseFloat(field2);
    } else {
      return field1 < field2;
    }
  }

  if (condition === 'bigger') {
    if (dataType === 'date') {
      return moment(field1).isAfter(moment(field2));
    } else if (dataType === 'number') {
      return parseFloat(field1) > parseFloat(field2);
    } else {
      return field1 > field2;
    }
  }

  if (condition === 'smaller-or-equal') {
    if (dataType === 'date') {
      console.log('smaller-or-equal', moment(field1), moment(field2), moment(field1).isSameOrBefore(moment(field2)));
      return moment(field1).isSameOrBefore(moment(field2));
    } else if (dataType === 'number') {
      return parseFloat(field1) <= parseFloat(field2);
    } else {
      return field1 <= field2;
    }
  }

  if (condition === 'bigger-or-equal') {
    if (dataType === 'date') {
      return moment(field1).isSameOrAfter(moment(field2));
    } else if (dataType === 'number') {
      return parseFloat(field1) >= parseFloat(field2);
    } else {
      return field1 >= field2;
    }
  }
}
