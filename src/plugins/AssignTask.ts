import * as moment from 'moment';
import * as uuid from 'uuid';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';
import { IServicesInterface } from '../interfaces/ServicesInterface';

const uuidV4 = uuid.v4;

export class AssignTask extends FlowTask {
  public execute(node: any, services: IServicesInterface) {
    services.logMessage('RUNNING AssignTask: ' + node.id + ' - ' + node.name);
    try {
      node.payload = Object.assign({}, node.payload);

      if (node.assignAsPropertyFromObject !== undefined && node.assignAsPropertyFromObject !== '') {
        if (node.payload[node.assignAsPropertyFromObject] === undefined) {
          node.payload[node.assignAsPropertyFromObject] = {};
        }
      }

      if (node.value !== undefined && 
          (node.valueFromProperty === undefined || node.valueFromProperty == "")) {
        let value = node.value;
        if (value === '[UUID]') {
          value = uuidV4().toString();
        } else if (value === '[NOW]') {
          value = moment().toISOString();
        }

        if (node.assignAsPropertyFromObject !== undefined && node.assignAsPropertyFromObject !== '') {
          node.payload[node.assignAsPropertyFromObject][node.assignToProperty] = value;
        } else {
          node.payload[node.assignToProperty] = value;
        }
      } else if (node.valueFromProperty !== '') {
        if (node.readFromObject !== undefined && node.readFromObject !== '') {
          if (node.assignAsPropertyFromObject !== undefined && node.assignAsPropertyFromObject !== '') {
            node.payload[node.assignAsPropertyFromObject][node.assignToProperty] =
              node.payload[node.readFromObject][node.valueFromProperty];
          } else {
            node.payload[node.assignToProperty] = node.payload[node.readFromObject][node.valueFromProperty];
          }
        } else if (node.assignAsPropertyFromObject !== undefined && node.assignAsPropertyFromObject !== '') {
          node.payload[node.assignAsPropertyFromObject][node.assignToProperty] = node.payload[node.valueFromProperty];
        } else {
          node.payload[node.assignToProperty] = node.payload[node.valueFromProperty];
        }
      } else if (node.value === undefined || node.value === null || node.value === '' || !node.value) {
        if (node.assignAsPropertyFromObject !== undefined && node.assignAsPropertyFromObject !== '') {
          node.payload[node.assignAsPropertyFromObject][node.assignToProperty] = '';
        } else {
          node.payload[node.assignToProperty] = '';
        }
      }

      return node.payload;
    } catch (err) {
      services.logMessage(err);
    }
  }

  public getName() {
    return 'AssignTask';
  }

  public getFullName() {
    return 'Assign';
  }

  public getDescription() {
    return 'Node sets a property in the payload either from a static value or input payload';
  }

  public getIcon() {
    return 'assign';
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
    return [
      { name: 'assignToProperty', defaultValue: '', valueType: 'string', required: true },
      { name: 'assignAsPropertyFromObject', defaultValue: '', valueType: 'string', required: false },
      { name: 'value', defaultValue: '', valueType: 'string', required: false },
      { name: 'valueFromProperty', defaultValue: '', valueType: 'string', required: false },
      { name: 'readFromObject', defaultValue: '', valueType: 'string', required: false },
    ];
  }
}
