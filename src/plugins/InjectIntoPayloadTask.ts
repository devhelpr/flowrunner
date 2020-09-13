import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';
import { IServicesInterface } from '../interfaces/ServicesInterface';

export class InjectIntoPayloadTask extends FlowTask {
  public execute(node: any, services: IServicesInterface) {
    services.logMessage('RUNNING InjectIntoPayloadTask: ' + node.id + ' - ' + node.name);
    try {
      if (node.object !== undefined) {
        /*
          TODO : node.object can contain "{PROPERTYNAME}" and "[PROPERTYNAME]" variables which
            will be searched and replaced by properties from the payload
 
              - {PROPERTYNAME} is a single property
              - ?? [PROPERTYNAME] is an array property either as a string "a","b",... or as an array ["a","b",...]

              Is the above really necessary ? .. can this be done with only {} and typeof?

              - {values:A1:B1} .. extract range A1 to B1 from values property and replace as array
        */
        if (!!node.hasObjectVariables) {
          try {
            const data = this.replaceObjectVariables(node, JSON.stringify(node.object), node.payload);
            node.payload = Object.assign({}, node.payload, JSON.parse(data));
          } catch (err) {
            services.logMessage('InjectIntoPayloadTask inner exception', err);
          }
        } else {
          node.payload = Object.assign({}, node.payload, node.object);
        }
      }

      return node.payload;
    } catch (err) {
      services.logMessage(err);
    }
  }

  public replaceObjectVariables = (node: any, template: string, data: any) => {
    const matches = template.match(/"{.+?}"/g);
    if (matches) {
      matches.map((match: string) => {
        const matchValue = match.slice(2, -2);
        let value = '';

        const splitted = matchValue.split(':');
        if (splitted.length > 0 && splitted[0] === 'values') {
          if (splitted.length === 3) {
            const minRange = splitted[1].split(/(\d+)/);
            const maxRange = splitted[2].split(/(\d+)/);
            let transformObject: any;
            if (node.transformObject && node.transformObject.values) {
              transformObject = node.transformObject.values;
            }

            if (minRange.length >= 2 && maxRange.length >= 2) {
              let newValue = '';

              let loop = parseInt(minRange[1], 10) - 1;
              const max = parseInt(maxRange[1], 10) - 1;
              while (loop <= max) {
                let loopCell = (minRange[0] || 'A').charCodeAt(0) - 65;
                const maxCell = (maxRange[0] || 'A').charCodeAt(0) - 65;
                while (loopCell <= maxCell) {
                  if (newValue !== '') {
                    newValue += ',';
                  }

                  if (loop < data['values'].length && loopCell < data['values'][loop].length) {
                    let item;
                    const cellValue = data['values'][loop][loopCell];
                    item = Number(cellValue);
                    if (isNaN(item)) {
                      item = cellValue;
                    }

                    if (transformObject) {
                      const parse = this.replaceObjectVariables(node, JSON.stringify(transformObject), {
                        name: String.fromCharCode((loopCell % 26) + 65) + (loop + 1),
                        value: item,
                      });
                      item = JSON.parse(parse);
                    }

                    if (typeof item === 'object') {
                      newValue += JSON.stringify(item);
                    } else if (typeof item === 'string') {
                      newValue += '"' + item + '"';
                    } else {
                      newValue += item;
                    }
                  }

                  loopCell++;
                }
                loop++;
              }

              value = '[' + newValue + ']';
            }
          }
        } else if (splitted.length > 0 && splitted[0] === 'value' && splitted.length === 2) {
          if (splitted.length === 2) {
            const cellId = splitted[1].split(/(\d+)/);
            let transformObject: any;
            if (node.transformObject && node.transformObject.values) {
              transformObject = node.transformObject.values;
            }

            if (cellId.length >= 2 && cellId.length >= 2) {
              let newValue = '';

              const rowCell = parseInt(cellId[1], 10) - 1;
              const columnCell = (cellId[0] || 'A').charCodeAt(0) - 65;

              if (newValue !== '') {
                newValue += ',';
              }
              if (rowCell < data['values'].length && columnCell < data['values'][rowCell].length) {
                let item;
                const cellValue = data['values'][rowCell][columnCell];

                item = Number(cellValue);
                if (isNaN(item)) {
                  item = cellValue;
                }

                if (transformObject) {
                  item = JSON.parse(
                    this.replaceObjectVariables(node, JSON.stringify(transformObject), {
                      name: String.fromCharCode((columnCell % 26) + 65) + (rowCell + 1),
                      value: item,
                    }),
                  );
                }

                if (typeof item === 'object') {
                  newValue += JSON.stringify(item);
                } else if (typeof item === 'string') {
                  newValue += '"' + item + '"';
                } else {
                  newValue += item;
                }

                value = newValue;
              }
            }
          }
        } else {
          value = data[matchValue];
          if (value === undefined) {
            value = '';
          }
          if (typeof value === 'string') {
            value = '"' + value + '"';
          } else if (Array.isArray(value)) {
            let newValue = '';

            (value as string[]).map(item => {
              if (newValue !== '') {
                newValue += ',';
              }
              if (typeof item === 'string') {
                newValue += '"' + item + '"';
              } else {
                newValue += item;
              }
            });

            value = '[' + newValue + ']';
          }
        }

        const allOccurancesOfMatchRegex = new RegExp(match, 'g');
        template = template.replace(allOccurancesOfMatchRegex, value);
      });
    }
    return template;
  };

  public getName() {
    return 'InjectIntoPayloadTask';
  }

  public getFullName() {
    return 'InjectIntoPayload';
  }

  public getDescription() {
    return 'Node that adds properties of node.object into payload';
  }

  public getIcon() {
    return 'inject';
  }

  public getShape() {
    return 'rect';
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
    return [{ name: 'object', defaultValue: '', valueType: 'string', required: true }];
  }
}
