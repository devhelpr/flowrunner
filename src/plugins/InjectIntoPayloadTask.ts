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
        */
        if (!!node.hasObjectVariables) {
          const data = this.replaceObjectVariables(JSON.stringify(node.object), node.payload);
          node.payload = Object.assign({}, node.payload, JSON.parse(data));
        } else {
          node.payload = Object.assign({}, node.payload, node.object);
        }
      }

      return node.payload;
    } catch (err) {
      services.logMessage(err);
    }
  }

  public replaceObjectVariables = (template: string, data: any) => {
    const matches = template.match(/"{.+?}"/g);
    if (matches) {
      matches.map((match: string) => {
        const matchValue = match.slice(2, -2);
        let value = data[matchValue];
        if (value === undefined) {
          value = '';
        }
        if (typeof value === 'string') {
          value = '"' + value + '"';
        } else if (Array.isArray(value)) {
          let newValue = '';

          value.map(item => {
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
