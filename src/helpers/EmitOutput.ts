import * as FlowTaskPackageType from '../FlowTaskPackageType';

export class EmitOutput {
  static emitToOutputs(
    nodePluginInfo: any,
    nodeEmitter: any,
    nodeInfo: any,
    currentNodeInstance: any,
    currentCallStack: any,
  ) {
    let followFlow = '';

    if (typeof currentNodeInstance.payload.followFlow !== 'undefined' && currentNodeInstance.payload.followFlow) {
      currentNodeInstance.payload._forwardFollowFlow = currentNodeInstance.payload.followFlow;
    }

    if (nodePluginInfo.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_OUTPUT_NODE) {
      // HANDLE FUNCTION OUTPUT/RESULT

      const newPayload = Object.assign({}, currentNodeInstance.payload);
      delete newPayload.followFlow;

      if (typeof currentNodeInstance.payload.followFlow !== 'undefined' && currentNodeInstance.payload.followFlow) {
        followFlow = currentNodeInstance.payload.followFlow;
        if (followFlow === 'isError') {
          if (typeof currentCallStack.error !== 'undefined') {
            const upperCallStack = currentCallStack.callStack;
            currentCallStack.error.map((outputNode: any) => {
              nodeEmitter.emit(outputNode.endshapeid.toString(), newPayload, upperCallStack);
            });
          }
          return;
        }
      }

      if (typeof currentCallStack.outputs !== 'undefined') {
        const upperCallStack = currentCallStack.callStack;
        currentCallStack.outputs.map((outputNode: any) => {
          nodeEmitter.emit(outputNode.endshapeid.toString(), newPayload, upperCallStack);
        });
      }
    } else if (nodePluginInfo.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_NODE) {
      // CALL FUNCTION NODE

      const newCallStack = {
        callStack: currentCallStack,
        callStackType: 'FUNCTION',
        error: nodeInfo.error,
        outputs: nodeInfo.outputs,
        returnNodeId: currentNodeInstance.id,
      };
      console.log('calling function', currentNodeInstance.functionnodeid.toString());

      nodeEmitter.emit(currentNodeInstance.functionnodeid.toString(), currentNodeInstance.payload, newCallStack);
    } else {
      if (typeof currentNodeInstance.payload.followFlow !== 'undefined' && currentNodeInstance.payload.followFlow) {
        // Handle error flow
        followFlow = currentNodeInstance.payload.followFlow;

        if (followFlow === 'isError') {
          if (nodePluginInfo.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE) {
            currentNodeInstance.payload.followFlow = undefined;
          }

          EmitOutput.emitToError(nodePluginInfo, nodeEmitter, nodeInfo, currentNodeInstance, currentCallStack);
          return;
        }
      }

      if (nodePluginInfo.pluginInstance.getPackageType() !== FlowTaskPackageType.FORWARD_NODE) {
        currentNodeInstance.payload.followFlow = undefined;
      }

      delete currentNodeInstance.payload.errors;

      console.log('nodeEvent.outputs', nodeInfo.outputs.length);

      // CALL connected output nodes
      nodeInfo.outputs.map((nodeOutput: any) => {
        if (followFlow === '' || (followFlow !== '' && nodeOutput.name === followFlow)) {
          console.log('before emit', nodeOutput.endshapeid.toString());

          nodeEmitter.emit(nodeOutput.endshapeid.toString(), currentNodeInstance.payload, currentCallStack);
        }
      });

      // call output nodes on callstack if node has no outputs
      if (nodeInfo.outputs.length == 0 && typeof currentCallStack.outputs !== 'undefined') {
        const upperCallStack = currentCallStack.callStack;
        const newPayload = Object.assign({}, currentNodeInstance.payload);
        delete newPayload.followFlow;
        currentCallStack.outputs.map((outputNode: any) => {
          nodeEmitter.emit(outputNode.endshapeid.toString(), newPayload, upperCallStack);
        });
      }
    }
  }

  static emitToError(nodeType: any, nodeEmitter: any, nodeEvent: any, currentNodeInstance: any, currentCallStack: any) {
    if (nodeType.pluginInstance.getPackageType() === FlowTaskPackageType.FUNCTION_OUTPUT_NODE) {
      const newPayload = Object.assign({}, currentNodeInstance.payload);

      if (typeof newPayload.followFlow !== 'undefined' && newPayload.followFlow) {
        newPayload._forwardFollowFlow = newPayload.followFlow;
      }

      // delete _payload._functionOutputs;
      // delete _payload._functionErrorOutputs;
      delete newPayload.followFlow;

      /* nodeInstance.payload._functionErrorOutputs.map((node) => {
		  nodeEmitter.emit(node.endshapeid.toString(), _payload, callStack)
		})
		*/

      const upperCallStack = currentCallStack.callStack;
      currentCallStack.error.map((currentNode: any) => {
        nodeEmitter.emit(currentNode.endshapeid.toString(), newPayload, upperCallStack);
      });
    } else {
      if (typeof currentNodeInstance.payload.followFlow !== 'undefined' && currentNodeInstance.payload.followFlow) {
        currentNodeInstance.payload._forwardFollowFlow = currentNodeInstance.payload.followFlow;
      }

      nodeEvent.error.map((currentNode: any) => {
        nodeEmitter.emit(currentNode.endshapeid.toString(), currentNodeInstance.payload, currentCallStack);
      });
    }
  }
}
