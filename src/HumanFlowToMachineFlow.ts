import * as uuid from 'uuid';
const uuidV4 = uuid.v4;

export const HumanFlowToMachineFlow = {
  convert: (humanFlowPackege: any) => {
    const flowPackage = Object.assign({}, humanFlowPackege);

    flowPackage.flow.map((flowNode: any) => {
      flowNode.title = flowNode.title || flowNode.name || flowNode.id;
      flowNode.name = flowNode.name || flowNode.title.replace(/ /g, '');
      flowNode.shapeType = flowNode.shapeType || flowNode.taskType;
      flowNode.id = flowNode.name;
      flowNode._id = flowNode.name;

      if (flowNode.task !== undefined) {
        flowNode.shapeType = flowNode.task;
      }

      if (typeof flowNode._outputs !== 'undefined') {
        flowNode._outputs.map((outputNodeName: any) => {
          const connection: any = {};
          connection.id = uuidV4();
          connection._id = connection.id;
          connection.shapeType = 'line';
          connection.title = 'connection';
          connection.name = 'outputsFrom_' + flowNode.name + "_to_" + outputNodeName + "_" + connection.id;
          connection.startshapeid = flowNode.name;
          connection.endshapeid = outputNodeName;
          flowPackage.flow.push(connection);
        });
      }
      if (typeof flowNode._errors !== 'undefined') {
        flowNode._errors.map((outputNodeName: any) => {
          const connection: any = {};
          connection.id = uuidV4();
          connection._id = connection.id;
          connection.shapeType = 'line';
          connection.title = 'connection';
          connection.name = 'sendsErrorFrom_' + flowNode.name + "_to_" + outputNodeName + "_" + connection.id;
          connection.startshapeid = flowNode.id;
          connection.endshapeid = outputNodeName;
          connection.followflow = 'onfailure';
          flowPackage.flow.push(connection);
        });
      }
    });

    return flowPackage;
  },
};
