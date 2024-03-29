import {
  createExpressionTree,
  executeExpressionTree,
  ExpressionNode,
  extractValueParametersFromExpressionTree,
} from '@devhelpr/expressionrunner';
import { FlowTask } from '../FlowTask';
import * as FlowTaskPackageType from '../FlowTaskPackageType';
import { conditionCheck } from './helpers/IfConditionHelpers';
import {
  compileExpression,
  runExpression,
} from '@devhelpr/expression-compiler';

export class IfConditionTask extends FlowTask {
  expression?: string = undefined;
  expressionTree?: ExpressionNode = undefined;
  compiledExpression?: any = undefined;
  public execute(node: any, services: any) {
    if (
      services &&
      services.pluginTaskExtensions &&
      services.pluginTaskExtensions.IfConditionTask &&
      services.pluginTaskExtensions.IfConditionTask.mode &&
      services.pluginTaskExtensions.IfConditionTask.mode[node.mode]
    ) {
      return services.pluginTaskExtensions.IfConditionTask.mode[node.mode](
        node,
        services
      );
    } else if (node && node.mode === 'compiled-expression') {
      if (
        !this.compiledExpression ||
        this.expression === undefined ||
        this.expression !== node.expression
      ) {
        this.compiledExpression = compileExpression(node.expression);
      }

      let payload: any = {};

      // force string properties to number
      if (node.forceNumeric === true) {
        for (const property in node.payload) {
          if (node.payload.hasOwnProperty(property)) {
            if (typeof node.payload[property] == 'string') {
              payload[property] = parseFloat(node.payload[property]) || 0;
            } else {
              payload[property] = node.payload[property];
            }
          }
        }
      } else {
        payload = node.payload;
      }
      const result = runExpression(this.compiledExpression, payload);
      if (result || (node.checkExpressionResultAsNumeric && result === 1)) {
        return node.payload;
      }
      const errors = [];
      errors.push({
        error: 'Expression failed',
        name: node.name,
      });

      payload = Object.assign({}, node.payload, {
        errors,
        followFlow: 'isError',
      });
      // resolve(node.payload);
      return payload;
    } else if (node && node.mode === 'expression') {
      let tree: ExpressionNode | undefined = undefined;
      if (
        !this.expressionTree ||
        this.expression === undefined ||
        this.expression !== node.expression
      ) {
        tree = createExpressionTree(node.expression);
      } else {
        tree = this.expressionTree;
      }

      if (!tree) {
        return false;
      }

      const params = extractValueParametersFromExpressionTree(tree);
      let valuesFoundInPayload = true;
      if (
        node.shouldAllParamsBeInPayload === undefined ||
        node.shouldAllParamsBeInPayload === true
      ) {
        params.forEach(param => {
          if (node.payload[param] === undefined) {
            valuesFoundInPayload = false;
          }
        });
      }
      if (!valuesFoundInPayload) {
        return false;
      }

      let payload: any = {};

      // force string properties to number
      if (node.forceNumeric === true) {
        for (const property in node.payload) {
          if (node.payload.hasOwnProperty(property)) {
            if (typeof node.payload[property] == 'string') {
              payload[property] = parseFloat(node.payload[property]) || 0;
            } else {
              payload[property] = node.payload[property];
            }
          }
        }
      } else {
        payload = node.payload;
      }
      const result = executeExpressionTree(tree, payload);
      if (result || (node.checkExpressionResultAsNumeric && result === 1)) {
        return node.payload;
      } else {
        const errors = [];
        errors.push({
          error: 'Expression failed',
          name: node.name,
        });

        const payload = Object.assign({}, node.payload, {
          errors,
          followFlow: 'isError',
        });
        // resolve(node.payload);
        return payload;
      }
    }

    // return new Promise((resolve: any, reject: any) => {
    //const splitField1 = node.compareProperty.split('.');
    const splitField2 = node.withProperty.split('.');
    const errors = [];

    // console.log("splitField1", splitField1);
    // console.log("splitField2", splitField2);

    let field1 = node.payload[node.compareProperty];

    /*if (field1 === '[NOW]') {
      field1 = moment().toISOString();
    }
    */

    let field2;

    if (splitField2.length <= 1) {
      if (node.withValue !== undefined && node.withValue !== '') {
        field2 = node.withValue;
      } else if (node.withProperty === '__TRUE__') {
        field2 = true;
      } else if (node.withProperty === '__EMPTY__') {
        field2 = '';
        //} else if (node.withProperty === '[NOW]') {
        //  field2 = moment().toISOString();
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
        return true;
      });
      field2 = objectToCheck;
    }

    if (
      node.dontTriggerOnEmptyValues &&
      (field1 === '' ||
        field2 === '' ||
        field1 === undefined ||
        field2 === undefined)
    ) {
      return false;
    }

    if (
      node.usingCondition === 'isNonEmptyProperty' &&
      field1 !== undefined &&
      field1 !== ''
    ) {
      return node.payload;
    } else if (
      conditionCheck(field1, field2, node.usingCondition, node.dataType)
    ) {
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
      {
        name: 'compareProperty',
        defaultValue: '',
        valueType: 'string',
        required: true,
      },
      {
        name: 'withProperty',
        defaultValue: '',
        valueType: 'string',
        required: false,
      },
      {
        name: 'withValue',
        defaultValue: '',
        valueType: 'string',
        required: false,
      },
      {
        defaultValue: '',
        enumText: [
          'equals',
          'not-equals',
          'smaller',
          'bigger',
          'smaller-or-equal',
          'bigger-or-equal',
        ],
        enumValues: [
          'equals',
          'not-equals',
          'smaller',
          'bigger',
          'smaller-or-equal',
          'bigger-or-equal',
        ],
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
