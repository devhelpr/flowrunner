export class FlowEventRunnerHelper {
  public static callMiddleware = (middleware: any, result: any, id: any, title: any, nodeType: any, payload: any) => {
    const cleanPayload = Object.assign({}, payload);

    cleanPayload.request = undefined;
    cleanPayload.response = undefined;

    middleware.map((middlewareFunction: any) => {
      middlewareFunction(result, id, title, nodeType, cleanPayload);
    });

    return;
  };

  public static getNodeInjections = (injections: any, nodeList: any) => {
    const nodeInjections: any = [];
    if (injections.length > 0) {
      console.log('INJECTIONS getNodeInjections', injections);
    }
    injections.map((nodeRelation: any) => {
      console.log('nodeRelation injection', nodeRelation.startshapeid);

      nodeList.map((node: any) => {
        if (node.id === nodeRelation.startshapeid) {
          nodeInjections.push(node);

          console.log('getNodeInjections', node);
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
        o.endshapeid === injectIntoNodeId && o.shapeType === 'line' && o.followflow === 'injectConfigIntoPayload',
    );

    nodeInjections.map((nodeRelation: any) => {
      nodeList.map((node: any) => {
        if (node.id === nodeRelation.startshapeid) {
          const nodeType = nodeTypes[node.shapeType];
          if (typeof nodeType !== 'undefined') {
            const nodeInstance = Object.assign({}, node);
            nodeInstance.payload = {};

            injections.push({ pluginInstance: nodeType.pluginInstance, node });
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

  public static registerNode(node: any, nodePluginInfoMap : any, services : any, flowNodeRegisterHooks: any) {
    services.logMessage('REGISTRATE ' + node.name);

    const nodePluginInfo = nodePluginInfoMap[node.shapeType];
    const nodeInstance = Object.assign({}, node);

    if (typeof nodePluginInfo !== 'undefined') {
      flowNodeRegisterHooks.map((hook: any) => {
        if (hook(node, nodePluginInfo.pluginInstance)) {
          return;
        }
      });

      const result = nodePluginInfo.pluginInstance.execute(nodeInstance, services, {});
      if (typeof result === 'object' && typeof result.then === 'function') {
        result.then((payload: any) => {
          services.registerModel(node.modelname, payload.modelDefinition);
        });
      }
    }
  }
}
