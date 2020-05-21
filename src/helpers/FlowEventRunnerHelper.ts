export class FlowEventRunnerHelper {
  public static callMiddleware = (
    middleware: any,
    result: any,
    id: any,
    title: any,
    nodeType: any,
    payload: any,
    dateTime: Date,
  ) => {
    const cleanPayload = Object.assign({}, payload);

    cleanPayload.request = undefined;
    cleanPayload.response = undefined;

    middleware.map((middlewareFunction: any) => {
      middlewareFunction(result, id, title, nodeType, cleanPayload, dateTime);
    });

    return;
  };

  public static getNodeInjections = (injections: any, nodeList: any) => {
    const nodeInjections: any = [];
    injections.map((nodeRelation: any) => {
      nodeList.map((node: any) => {
        if (node.id === nodeRelation.startshapeid) {
          nodeInjections.push(node);
        }
      });
    });

    return nodeInjections;
  };

  public static getManuallyToFollowNodes = (manuallyToFollowNodes: any, nodeList: any) => {
    return nodeList.filter((node: any) => {
      return typeof manuallyToFollowNodes.find((o: any) => o.endshapeid === node.id.toString()) !== 'undefined';
    });
  };

  public static getInjections = (injectIntoNodeId: any, nodeList: any, nodeTypes: any) => {
    const injections: any = [];

    const nodeInjections = nodeList.filter(
      (o: any) =>
        o.endshapeid === injectIntoNodeId && o.taskType === 'connection' && o.followflow === 'injectConfigIntoPayload',
    );

    nodeInjections.map((nodeRelation: any) => {
      nodeList.map((node: any) => {
        if (node.id === nodeRelation.startshapeid) {
          const nodeType = nodeTypes[node.taskType];
          if (typeof nodeType !== 'undefined') {
            const nodeInstance = Object.assign({}, node);
            nodeInstance.payload = {};
            
            const pluginInstance = new nodeType.pluginClass();

            injections.push({ pluginInstance: pluginInstance, node });
            /*
						  let result = nodeType.pluginInstance.execute(nodeInstance, _services);
	  
						  if (typeof result == "object" && typeof result.then == "function") {
							  result.then((payload) => {
								  
								  for (var key in payload) {
									  if (!payload.hasOwnProperty(key)) {
										  continue;
									  }
									  injections[key] = payload[key];
								  }	
							  })
							  .catch((err) => {
								  console.log("injection promise failed",err)
							  })
						  } else if (typeof result == "object") {
							  for (var key in result) {
								  if (!result.hasOwnProperty(key)) {
									  continue;
								  }
								  injections[key] = result[key];
							  }
						  }
						  */
          }
        }
      });
    });

    return injections;
  };

  public static registerNode(node: any, pluginInstance: any, services: any, flowNodeRegisterHooks: any) {
    services.logMessage('REGISTRATE ' + node.name);

    const nodeInstance = Object.assign({}, node);

    if (pluginInstance !== undefined) {
      flowNodeRegisterHooks.map((hook: any) => {
        if (hook(node, pluginInstance)) {
          return;
        }
      });

      const result = pluginInstance.execute(nodeInstance, services, {});
      if (typeof result === 'object' && typeof result.then === 'function') {
        result.then((payload: any) => {
          services.registerModel(node.modelname, payload.modelDefinition);
        });
      }
    }
  }
}
