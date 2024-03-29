import * as uuid from 'uuid';
import * as FlowTaskPackageType from '../FlowTaskPackageType';

import { IConnectionNode } from '../interfaces/ConnectionNode';
import { ActivationFunction } from '../interfaces/FunctionTypes';
import { INode } from '../interfaces/Node';

const uuidV4 = uuid.v4;
const parallelSessions: any = {};

export const doesConnectionEmit = (
  connectionNode: IConnectionNode,
  node: INode,
  payload: any,
  eventName?: string
) => {
  let result: boolean = true;

  if (connectionNode.event !== undefined && connectionNode.event !== '') {
    if (eventName !== undefined && connectionNode.event === eventName) {
      return true;
    }
    return false;
  } else if (connectionNode.tagPropertyFromPayload && connectionNode.tag) {
    result =
      connectionNode.tag === payload[connectionNode.tagPropertyFromPayload];
  }
  if (connectionNode.tag && payload.tag) {
    result = result && connectionNode.tag === payload.tag;

    // dont keep on passing tags via payload.. "oneshot"-only
    // so also dont pass tags on payload to functions

    delete payload.tag;
  }
  if (connectionNode.tag && node.tag) {
    result = result && connectionNode.tag === node.tag;
  }

  // TODO : check flowPath ... compare also using callstack?

  // QUESTION : instead of using flowPathPropertyFromPayload .. always use "flowPath" as name in payload?
  // .. why not both .. this allows more flexibility .. see above using tags

  // REQUIREMENT if a node.payload has a flowPath, then dont follow the
  //   connections without a flowPath when the payload contains a flowPath
  //   ... dont pass flowPath to functions (remember it in the callstack)
  if (connectionNode.flowPath) {
    if (!payload.flowPath) {
      return false;
    }
    result = result && connectionNode.flowPath === payload.flowPath;
  }

  if (
    connectionNode.activationThreshold &&
    !isNaN(connectionNode.activationThreshold)
  ) {
    if (
      connectionNode.activationProperty &&
      payload[connectionNode.activationProperty]
    ) {
      return (
        payload[connectionNode.activationProperty] >=
        connectionNode.activationThreshold
      );
    }

    return false;
  }

  if (connectionNode.activationFunction) {
    if (typeof connectionNode.activationFunction !== 'function') {
      return false;
    }
    return (connectionNode.activationFunction as ActivationFunction)(
      connectionNode,
      payload
    );
  }

  return result;
};

export class EmitOutput {
  public static emitToOutputs(
    nodePluginInfo: any,
    nodeEmitter: any,
    nodeInfo: any,
    currentNodeInstance: any,
    currentCallStack: any,
    flowEventRunner: any,
    eventName?: string
  ) {
    let followFlow = '';

    if (
      typeof currentNodeInstance.payload.followFlow !== 'undefined' &&
      currentNodeInstance.payload.followFlow
    ) {
      currentNodeInstance.payload._forwardFollowFlow =
        currentNodeInstance.payload.followFlow;
    }

    if (
      nodePluginInfo.pluginInstance &&
      nodePluginInfo.pluginInstance.getPackageType() ===
        FlowTaskPackageType.FUNCTION_OUTPUT_NODE
    ) {
      // HANDLE FUNCTION OUTPUT/RESULT

      let newPayload = Object.assign({}, currentNodeInstance.payload);
      delete newPayload.followFlow;

      if (currentNodeInstance.resultProperties) {
        newPayload = {};
        currentNodeInstance.resultProperties.map((resultProperty: string) => {
          newPayload[resultProperty] =
            currentNodeInstance.payload[resultProperty];
          return true;
        });
      } else if (currentNodeInstance.resultProperty) {
        newPayload = {
          [currentNodeInstance.resultProperty]:
            newPayload[currentNodeInstance.resultProperty],
        };
      } else {
        newPayload = {};
      }

      if (currentCallStack.flowPath) {
        newPayload.flowPath = currentCallStack.flowPath;
      }

      if (currentCallStack.tag) {
        newPayload.tag = currentCallStack.tag;
      }

      /*
        DONT FIRE error nodes .. only return with resultProperty
        
        TODO : think if we need this under some circumstances
              .. it can have a need..

      */

      if (
        !currentNodeInstance.resultProperties &&
        !currentNodeInstance.resultProperty &&
        typeof currentNodeInstance.payload.followFlow !== 'undefined' &&
        currentNodeInstance.payload.followFlow
      ) {
        followFlow = currentNodeInstance.payload.followFlow;
        if (followFlow === 'isError') {
          if (
            currentCallStack &&
            typeof currentCallStack.error !== 'undefined'
          ) {
            const upperCallStack = currentCallStack.callStack;
            currentCallStack.error.map((outputNode: any) => {
              flowEventRunner.touchedNodes[outputNode.name] = true;
              nodeEmitter.emit(
                outputNode.endshapeid.toString(),
                { ...upperCallStack.newPayload, ...newPayload },
                upperCallStack
              );
              return true;
            });
          }
          return;
        }
      }

      if (typeof currentCallStack.outputs !== 'undefined') {
        const upperCallStack = currentCallStack.callStack;
        let nodeWasEmitted = false;
        currentCallStack.outputs.map((nodeOutput: any) => {
          if (
            doesConnectionEmit(
              nodeOutput,
              currentNodeInstance,
              newPayload,
              eventName
            )
          ) {
            nodeWasEmitted = true;

            flowEventRunner.touchedNodes[nodeOutput.name] = true;

            nodeEmitter.emit(
              nodeOutput.endshapeid.toString(),
              { ...currentCallStack.payload, ...newPayload },
              upperCallStack
            );
          }
          return true;
        });

        if (!nodeWasEmitted || currentCallStack.outputs.length === 0) {
          if (upperCallStack.outputs !== undefined) {
            upperCallStack.outputs.map((outputNode: any) => {
              flowEventRunner.touchedNodes[outputNode.name] = true;
              nodeEmitter.emit(
                outputNode.endshapeid.toString(),
                { ...upperCallStack.payload, ...newPayload },
                upperCallStack.callStack
              );
              return true;
            });
          }
        }
      }
    } else if (
      nodePluginInfo.pluginInstance &&
      nodePluginInfo.pluginInstance.getPackageType() ===
        FlowTaskPackageType.FUNCTION_NODE
    ) {
      // CALL FUNCTION NODE

      const newCallStack = {
        callStack: currentCallStack,
        callStackType: 'FUNCTION',
        error: nodeInfo.error,
        flowPath: currentNodeInstance.payload.flowPath,
        outputs: nodeInfo.outputs,
        payload: currentNodeInstance.payload,
        returnNodeId: currentNodeInstance.name,
        tag: currentNodeInstance.payload.tag,
      };

      if (currentNodeInstance.payload.flowPath) {
        delete currentNodeInstance.payload.flowPath;
      }

      if (currentNodeInstance.payload.tag) {
        delete currentNodeInstance.payload.tag;
      }

      // TODO : check if functionnode needs "doesConnectionFire"
      nodeEmitter.emit(
        currentNodeInstance.functionnodeid.toString(),
        currentNodeInstance.payload,
        newCallStack
      );
    } else {
      if (
        typeof currentNodeInstance.payload.followFlow !== 'undefined' &&
        currentNodeInstance.payload.followFlow
      ) {
        // Handle error flow
        followFlow = currentNodeInstance.payload.followFlow;

        if (followFlow === 'isError') {
          if (
            nodePluginInfo.pluginInstance &&
            nodePluginInfo.pluginInstance.getPackageType() !==
              FlowTaskPackageType.FORWARD_NODE
          ) {
            currentNodeInstance.payload.followFlow = undefined;
            delete currentNodeInstance.payload.followFlow;
          }
          EmitOutput.emitToError(
            nodePluginInfo,
            nodeEmitter,
            nodeInfo,
            currentNodeInstance,
            currentCallStack,
            flowEventRunner
          );
          return;
        }
      }

      if (
        nodePluginInfo.pluginInstance &&
        nodePluginInfo.pluginInstance.getPackageType() !==
          FlowTaskPackageType.FORWARD_NODE
      ) {
        currentNodeInstance.payload.followFlow = undefined;
      }

      delete currentNodeInstance.payload.errors;

      // Handle parallel sessions
      if (
        nodePluginInfo.pluginInstance &&
        nodePluginInfo.pluginInstance.getPackageType() ===
          FlowTaskPackageType.PARALLEL_NODE &&
        nodeInfo.outputs.length > 0
      ) {
        currentNodeInstance.payload._parallelSessionId = uuidV4();
        currentNodeInstance.payload._parallelCount = nodeInfo.outputs.length;

        parallelSessions[currentNodeInstance.payload._parallelSessionId] = {
          nodeCount: nodeInfo.outputs.length,
        };
      }

      if (
        nodePluginInfo.pluginInstance &&
        nodePluginInfo.pluginInstance.getPackageType() ===
          FlowTaskPackageType.PARALLEL_RESOLVE_NODE
      ) {
        const parallelSessionId =
          currentNodeInstance.payload._parallelSessionId;

        const parallelSessionCount =
          parallelSessions[parallelSessionId].nodeCount - 1;
        parallelSessions[parallelSessionId].nodeCount = parallelSessionCount;

        if (parallelSessions[parallelSessionId].payloads === undefined) {
          parallelSessions[parallelSessionId].payloads = [];
        }

        delete currentNodeInstance.payload._parallelSessionId;
        delete currentNodeInstance.payload._parallelCount;

        parallelSessions[parallelSessionId].payloads.push(
          Object.assign({}, currentNodeInstance.payload)
        );

        // TODO : test merge payloads
        // TODO : how handle emitError?
        // TODO : handle multiple parallel session (parallel session within parallel session)
        //        - use inputs as count instead of outputs?
        if (parallelSessionCount > 0) {
          return;
        }

        currentNodeInstance.payload = {};
        // currentNodeInstance.payload.payloads = parallelSessions[parallelSessionId].payloads;
        currentNodeInstance.payload = Object.assign(
          {},
          ...parallelSessions[parallelSessionId].payloads
        );
        delete parallelSessions[parallelSessionId];
      }

      let nodeWasEmitted = false;
      // CALL connected output nodes
      nodeInfo.outputs.map((nodeOutput: any) => {
        if (
          followFlow === '' ||
          (followFlow !== '' && nodeOutput.name === followFlow)
        ) {
          // QUESTION: Does this causes memory issues?
          const payload = { ...currentNodeInstance.payload };
          if (
            doesConnectionEmit(
              nodeOutput,
              currentNodeInstance,
              payload,
              eventName
            )
          ) {
            nodeWasEmitted = true;

            flowEventRunner.touchedNodes[nodeOutput.name] = true;

            // check if connection has controller
            // - controllers are only supported on direct connections from node to node
            //   ... so not yet on functions (although that would be useful as well)
            // -
            //
            if (nodeOutput.controllerName) {
              nodeEmitter.emitToController(
                nodeOutput.endshapeid.toString(),
                nodeOutput.controllerName,
                payload,
                currentCallStack
              );
            } else {
              nodeEmitter.emit(
                nodeOutput.endshapeid.toString(),
                payload,
                currentCallStack
              );
            }
          }
        }
        return true;
      });

      // call output nodes on callstack if node has no outputs
      if (
        !nodeWasEmitted ||
        (nodeInfo.outputs.length === 0 &&
          currentCallStack &&
          typeof currentCallStack.outputs !== 'undefined')
      ) {
        if (currentCallStack && currentCallStack.callStackType === 'FUNCTION') {
          // DONT call output node if in function... only fire function output node
          return;
        }
        if (currentCallStack) {
          let upperCallStack = currentCallStack.callStack;

          if (upperCallStack === undefined) {
            upperCallStack = {};
          }
          if (!!currentCallStack['_executeNode']) {
            upperCallStack['_executeNode'] = true;
          }

          const newPayload = Object.assign({}, currentNodeInstance.payload);
          delete newPayload.followFlow;
          if (currentCallStack.outputs) {
            currentCallStack.outputs.map((outputNode: any) => {
              flowEventRunner.touchedNodes[outputNode.name] = true;

              // todo : double check if this needs doesConnectionEmit
              nodeEmitter.emit(
                outputNode.endshapeid.toString(),
                newPayload,
                upperCallStack
              );
              return true;
            });
          }
        }
      }
    }
  }

  public static emitToError(
    nodeType: any,
    nodeEmitter: any,
    nodeInfo: any,
    currentNodeInstance: any,
    currentCallStack: any,
    flowEventRunner: any
  ) {
    if (
      nodeType.pluginInstance.getPackageType() ===
      FlowTaskPackageType.FUNCTION_OUTPUT_NODE
    ) {
      const newPayload = Object.assign({}, currentNodeInstance.payload);

      if (
        typeof newPayload.followFlow !== 'undefined' &&
        newPayload.followFlow
      ) {
        newPayload._forwardFollowFlow = newPayload.followFlow;
      }

      // delete _payload._functionOutputs;
      // delete _payload._functionErrorOutputs;
      delete newPayload.followFlow;

      const upperCallStack = currentCallStack.callStack;
      currentCallStack.error.map((currentNode: any) => {
        nodeEmitter.emit(
          currentNode.endshapeid.toString(),
          newPayload,
          upperCallStack
        );
        return true;
      });
    } else {
      if (
        typeof currentNodeInstance.payload.followFlow !== 'undefined' &&
        currentNodeInstance.payload.followFlow
      ) {
        currentNodeInstance.payload._forwardFollowFlow =
          currentNodeInstance.payload.followFlow;
      }

      nodeInfo.error.map((currentNode: any) => {
        flowEventRunner.touchedNodes[currentNode.name] = true;
        nodeEmitter.emit(
          currentNode.endshapeid.toString(),
          currentNodeInstance.payload,
          currentCallStack
        );
        return true;
      });

      if (
        nodeInfo.error.length === 0 &&
        currentCallStack &&
        typeof currentCallStack.error !== 'undefined'
      ) {
        let upperCallStack = currentCallStack.callStack;
        if (upperCallStack === undefined) {
          upperCallStack = {};
        }
        if (!!currentCallStack['_executeNode']) {
          upperCallStack['_executeNode'] = true;
        }
        const newPayload = Object.assign({}, currentNodeInstance.payload);
        delete newPayload.followFlow;
        currentCallStack.error.map((outputNode: any) => {
          flowEventRunner.touchedNodes[outputNode.name] = true;
          nodeEmitter.emit(
            outputNode.endshapeid.toString(),
            newPayload,
            upperCallStack
          );
          return true;
        });
      }
    }
  }
}
