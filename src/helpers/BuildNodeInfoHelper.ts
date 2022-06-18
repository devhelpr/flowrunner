import { IServicesInterface } from '../interfaces/ServicesInterface';
import { FlowEventRunnerHelper } from './FlowEventRunnerHelper';

export interface INodeInfo {
  dontAutostart: boolean;
  error?: any[];
  injections: any;
  inputs: any[];
  manuallyToFollowNodes: any;
  name: string;
  nodeId: string;
  outputs?: any[];
  pluginInstance: any;
  title: string;
  isAnnotation: boolean;
  subscription?: any;
}

export class BuildNodeInfoHelper {
  public static build(
    nodeList: any[],
    node: any,
    nodePluginInfoMap: any,
    services: IServicesInterface
  ): INodeInfo {
    return {
      dontAutostart: node.dontAutostart,
      error: nodeList.filter(
        (o: any) =>
          o.startshapeid === node.id.toString() &&
          o.taskType === 'connection' &&
          o.followflow === 'onfailure'
      ),
      // TODO : hier direct de nodes uitlezen en de variabelen die geinjecteerd moeten
      // worden toevoegen
      injections: FlowEventRunnerHelper.getInjections(
        node.id.toString(),
        nodeList,
        nodePluginInfoMap
      ),
      inputs: nodeList.filter(
        (o: any) =>
          o.endshapeid === node.id.toString() &&
          o.taskType === 'connection' &&
          o.followflow !== 'followManually' &&
          o.followflow !== 'injectConfigIntoPayload'
      ),
      manuallyToFollowNodes: FlowEventRunnerHelper.getManuallyToFollowNodes(
        nodeList.filter(
          (o: any) =>
            o.startshapeid === node.id.toString() &&
            o.taskType === 'connection' &&
            o.followflow === 'followManually'
        ),
        nodeList
      ),
      name: node.name,
      nodeId: node.id,
      outputs: nodeList
        .filter(
          (o: any) =>
            o.startshapeid === node.id.toString() &&
            o.taskType === 'connection' &&
            o.followflow !== 'onfailure' &&
            o.followflow !== 'followManually' &&
            o.followflow !== 'injectConfigIntoPayload'
        )
        .map(connection => {
          // todo check activationFunction and attach it here
          if (connection.activationFunction && services.getActivationFunction) {
            connection.activationFunction = services.getActivationFunction(
              connection.activationFunction
            );
          }
          return connection;
        }),
      pluginInstance: undefined,
      title: node.title,
      isAnnotation: false,
    };
  }
}
