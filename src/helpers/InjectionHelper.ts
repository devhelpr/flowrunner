import { FlowEventRunnerHelper } from './FlowEventRunnerHelper';

export class InjectionHelper {
  public static executeInjections(
    node: any,
    nodeInfo: any,
    injectionValues: any,
    payload: any,
    services: any,
    callStack: any,
    middleware: any
  ) {
    const injectionPromises: any = [];
    nodeInfo.injections.map((nodeInjection: any) => {
      const nodeInstance = Object.assign({}, nodeInjection.node);
      nodeInstance.payload = Object.assign({}, payload);

      const result = nodeInjection.pluginInstance.execute(
        nodeInstance,
        services,
        callStack
      );

      if (typeof result === 'object' && typeof result.then === 'function') {
        result
          .then((payloadResult: any) => {
            payloadResult.response = null;
            payloadResult.request = null;

            FlowEventRunnerHelper.callMiddleware(
              middleware,
              'injection',
              nodeInstance.id,
              nodeInstance.name,
              node.taskType,
              payloadResult,
              new Date()
            );

            for (const property in payloadResult) {
              if (
                typeof payloadResult[property] === 'undefined' ||
                payloadResult[property] === null
              ) {
                continue;
              }
              if (!payloadResult.hasOwnProperty(property)) {
                continue;
              }
              injectionValues[property] = payloadResult[property];
            }
          })
          .catch((err: any) => {
            throw new Error(err);
          });
      } else if (typeof result === 'object') {
        FlowEventRunnerHelper.callMiddleware(
          middleware,
          'injection',
          nodeInstance.id,
          nodeInstance.name,
          node.taskType,
          payload,
          new Date()
        );

        for (const property in result) {
          if (!result.hasOwnProperty(property)) {
            continue;
          }
          injectionValues[property] = result[property];
        }
      }

      injectionPromises.push(result);
      return true;
    });

    return injectionPromises;
  }
}
