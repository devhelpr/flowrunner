import { FlowEventRunnerHelper } from './FlowEventRunnerHelper';

export class BuildNodeInfoHelper {
  public static build(nodeList: any[], node: any, nodePluginInfoMap: any) {
    return Object.assign(
      {},
      {
        error: nodeList.filter(
          (o: any) =>
            o.startshapeid === node.id.toString() && o.taskType === 'connection' && o.followflow === 'onfailure',
        ),
        // TODO : hier direct de nodes uitlezen en de variabelen die geinjecteerd moeten
        // worden toevoegen
        injections: FlowEventRunnerHelper.getInjections(node.id.toString(), nodeList, nodePluginInfoMap),
        inputs: nodeList.filter(
          (o: any) =>
            o.endshapeid === node.id.toString() &&
            o.taskType === 'connection' &&
            o.followflow !== 'followManually' &&
            o.followflow !== 'injectConfigIntoPayload',
        ),
        manuallyToFollowNodes: FlowEventRunnerHelper.getManuallyToFollowNodes(
          nodeList.filter(
            (o: any) =>
              o.startshapeid === node.id.toString() && o.taskType === 'connection' && o.followflow === 'followManually',
          ),
          nodeList,
        ),
        name: node.name,
        nodeId: node.id,
        outputs: nodeList.filter(
          (o: any) =>
            o.startshapeid === node.id.toString() &&
            o.taskType === 'connection' &&
            o.followflow !== 'onfailure' &&
            o.followflow !== 'followManually' &&
            o.followflow !== 'injectConfigIntoPayload',
        ),
        title: node.title,
      },
    );
  }
}
