import * as moment from 'moment';
import * as Promise from 'promise';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';
import { conditionCheck } from './helpers/IfConditionHelpers';

export class IfConditionTask extends FlowTask {
  public execute(node: any) {
    // return new Promise((resolve: any, reject: any) => {
    const splitField1 = node.compareProperty.split('.');
    const splitField2 = node.withProperty.split('.');
    const errors = [];

    // console.log("splitField1", splitField1);
    // console.log("splitField2", splitField2);

    let field1 = node.payload[node.compareProperty];

    if (field1 === '[NOW]') {
      field1 = moment().toISOString();
    }

    let field2;

    if (splitField2.length <= 1) {
      if (node.withValue !== undefined && node.withValue !== '') {
        field2 = node.withValue;
      } else if (node.withProperty === '__TRUE__') {
        field2 = true;
      } else if (node.withProperty === '__EMPTY__') {
        field2 = '';
      } else if (node.withProperty === '[NOW]') {
        field2 = moment().toISOString();
      } else if (node.withProperty === '__ISISODATE__') {
        field2 = '__ISISODATE__';
      } else {
        field2 = node.payload[node.withProperty];
      }
    } else {
      let objectToCheck: any = null;
      splitField2.map((fieldName: any) => {
        if (objectToCheck) {
          objectToCheck = objectToCheck[fieldName];
        } else {
          objectToCheck = node.payload[fieldName];
        }
      });
      field2 = objectToCheck;
    }

    if (node.usingCondition === 'isNonEmptyProperty' && field1 !== undefined && field1 !== '') {
      return node.payload;
    } else if (conditionCheck(field1, field2, node.usingCondition, node.dataType)) {
      // console.log("conditionCheck: true", field1,field2,node.compareProperty,node.withProperty);
      return node.payload;
    } else {
      // console.log("conditionCheck: false", field1,field2,node.compareProperty,node.withProperty);

      errors.push({
        error: node.compareProperty + ' is not correct',
        name: node.compareProperty,
      });

      const payload = Object.assign({}, node.payload, {
        errors,
        followFlow: 'isError',
      });
      // resolve(node.payload);
      return payload;
    }
    // });
  }

  public getName() {
    return 'IfConditionTask';
  }

  public getFullName() {
    return 'IfCondition';
  }

  public getDescription() {
    return 'Node that succeeds depending on the condition';
  }

  public getIcon() {
    return 'ifthen';
  }

  public getShape() {
    return 'diamond';
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
      { name: 'compareProperty', defaultValue: '', valueType: 'string', required: true },
      { name: 'withProperty', defaultValue: '', valueType: 'string', required: false },
      { name: 'withValue', defaultValue: '', valueType: 'string', required: false },
      {
        defaultValue: '',
        enumText: ['equals', 'not-equals', 'smaller', 'bigger', 'smaller-or-equal', 'bigger-or-equal'],
        enumValues: ['equals', 'not-equals', 'smaller', 'bigger', 'smaller-or-equal', 'bigger-or-equal'],
        name: 'usingCondition',
        valueType: 'enum',
      },
      {
        defaultValue: '',
        enumText: ['string', 'number', 'date'],
        enumValues: ['string', 'number', 'date'],
        name: 'dataType',
        valueType: 'enum',
      },
      /*,
			{name:"thenFollowRelation", defaultValue:"", valueType:"string"},
			{name:"elseFollowRelation", defaultValue:"", valueType:"string"}

			// propertiesAreOfType
			*/
    ];
  }
}
