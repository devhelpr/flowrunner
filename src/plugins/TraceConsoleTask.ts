import * as Promise from 'promise';
import { FlowTask } from '../FlowTask';

export class TraceConsoleTask extends FlowTask {
  public execute(node: any, services: any, callStack: any) {
    console.log('RUNNING: ' + node.id + ' - ' + node.title);

    if (node.message !== undefined && node.message !== '') {
      console.log('LOGMESSAGE:', node.message);
    } else {
      console.log(node.payload);
    }

    return new Promise((resolve: any, reject: any) => {
      resolve(node.payload);
    });
  }

  public getName() {
    return 'TraceConsoleTask';
  }

  public getFullName() {
    return 'Log to console';
  }

  public getIcon() {
    return 'console';
  }

  public getShape() {
    return 'rect';
  }

  public getTaskType() {
    // both/frontend/backend/mobileapp
    return 'both';
  }

  public getCategory() {
    return 'FlowCanvas';
  }

  public getController() {
    return 'FlowCanvasController';
  }

  public getConfigMetaData() {
    return [{ name: 'message', defaultValue: '', valueType: 'string' }];
  }
}
