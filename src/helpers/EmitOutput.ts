import * as uuid from 'uuid';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

const uuidV4 = uuid.v4;
const parallelSessions: any = {};

export class EmitOutput {
  public static emitToOutputs(
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

      // Handle parallel sessions
      if (
        nodePluginInfo.pluginInstance.getPackageType() === FlowTaskPackageType.PARALLEL_NODE &&
        nodeInfo.outputs.length > 0
      ) {
        currentNodeInstance.payload._parallelSessionId = uuidV4();
        currentNodeInstance.payload._parallelCount = nodeInfo.outputs.length;

        parallelSessions[currentNodeInstance.payload._parallelSessionId] = {
          nodeCount: nodeInfo.outputs.length,
        };
      }

      if (nodePluginInfo.pluginInstance.getPackageType() === FlowTaskPackageType.PARALLEL_RESOLVE_NODE) {
        const parallelSessionId = currentNodeInstance.payload._parallelSessionId;

        const parallelSessionCount = parallelSessions[parallelSessionId].nodeCount - 1;
        parallelSessions[parallelSessionId].nodeCount = parallelSessionCount;

        if (parallelSessions[parallelSessionId].payloads === undefined) {
          parallelSessions[parallelSessionId].payloads = [];
        }

        delete currentNodeInstance.payload._parallelSessionId;
        delete currentNodeInstance.payload._parallelCount;

        parallelSessions[parallelSessionId].payloads.push(Object.assign({}, currentNodeInstance.payload));

        // TODO : test merge payloads
        // TODO : how handle emitError?
        // TODO : handle multiple parallel session (parallel session within parallel session)
        //        - use inputs as count instead of outputs?
        if (parallelSessionCount > 0) {
          return;
        }

        currentNodeInstance.payload = {};
        currentNodeInstance.payload.payloads = parallelSessions[parallelSessionId].payloads;

        delete parallelSessions[parallelSessionId];
      }

      // CALL connected output nodes
      nodeInfo.outputs.map((nodeOutput: any) => {
        if (followFlow === '' || (followFlow !== '' && nodeOutput.name === followFlow)) {
          nodeEmitter.emit(nodeOutput.endshapeid.toString(), currentNodeInstance.payload, currentCallStack);
        }
      });

      // call output nodes on callstack if node has no outputs
      if (nodeInfo.outputs.length === 0 && typeof currentCallStack.outputs !== 'undefined') {
        const upperCallStack = currentCallStack.callStack;
        const newPayload = Object.assign({}, currentNodeInstance.payload);
        delete newPayload.followFlow;
        currentCallStack.outputs.map((outputNode: any) => {
          nodeEmitter.emit(outputNode.endshapeid.toString(), newPayload, upperCallStack);
        });
      }
    }
  }

  public static emitToError(
    nodeType: any,
    nodeEmitter: any,
    nodeInfo: any,
    currentNodeInstance: any,
    currentCallStack: any,
  ) {
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

      nodeInfo.error.map((currentNode: any) => {
        nodeEmitter.emit(currentNode.endshapeid.toString(), currentNodeInstance.payload, currentCallStack);
      });

      if (nodeInfo.error.length === 0 && typeof currentCallStack.error !== 'undefined') {
        const upperCallStack = currentCallStack.callStack;
        const newPayload = Object.assign({}, currentNodeInstance.payload);
        delete newPayload.followFlow;
        currentCallStack.error.map((outputNode: any) => {
          nodeEmitter.emit(outputNode.endshapeid.toString(), newPayload, upperCallStack);
        });
      }
    }
  }
}
