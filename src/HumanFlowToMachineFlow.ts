import * as uuid from 'uuid';
const uuidV4 = uuid.v4;

export const HumanFlowToMachineFlow = {
  convert: (humanFlowPackege: any) => {
    const flowPackage = Object.assign({}, humanFlowPackege);

    flowPackage.flow.map((flowNode: any) => {
      flowNode.id = flowNode.id || uuidV4();
      flowNode._id = flowNode.id;
      flowNode.name = flowNode.name || flowNode.title.replace(/ /g, '');
      flowNode.shapeType = flowNode.shapeType || flowNode.taskType;
      
      if (flowNode.task !== undefined) {
        flowNode.shapeType = flowNode.task;
      }

      if (typeof flowNode._outputs !== 'undefined') {
        flowNode._outputs.map((outputNode: any) => {
          const connection: any = {};
          connection.id = uuidV4();
          connection._id = connection.id;
          connection.shapeType = 'line';
          connection.title = 'relatedTo';
          connection.name = 'relatedTo' + flowNode.name;
          connection.startshapeid = flowNode.id;
          connection.endshapeid = outputNode;
          flowPackage.flow.push(connection);
        });
      }
      if (typeof flowNode._errors !== 'undefined') {
        flowNode._errors.map((outputNode: any) => {
          const connection: any = {};
          connection.id = uuidV4();
          connection._id = connection.id;
          connection.shapeType = 'line';
          connection.title = 'relatedTo';
          connection.name = 'relatedTo' + flowNode.name;
          connection.startshapeid = flowNode.id;
          connection.endshapeid = outputNode;
          connection.followflow = 'onfailure';
          flowPackage.flow.push(connection);
        });
      }
    });

    return flowPackage;
  },
};
