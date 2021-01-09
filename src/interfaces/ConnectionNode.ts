import { ActivationFunction } from './FunctionTypes';

export interface IConnectionNode {
  id: string;
  name: string;
  tag?: string;
  weight?: number;
  tagPropertyFromPayload?: string;
  tags?: string[];
  activationFunction?: boolean | string | ActivationFunction;
  activationThreshold?: number;
  activationProperty?: string;

  flowPath?: string;
  flowPathPropertyFromPayload?: string;

  event?: string;
}
