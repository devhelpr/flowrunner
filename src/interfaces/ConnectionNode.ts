export interface IConnectionNode {
  tag?: string;
  weight?: number;
  tagPropertyFromPayload?: string;
  tags?: string[];
  activationFunction?: string;
  activationThreshold?: number;

  flowPath?: string;
  flowPathPropertyFromPayload?: string;

  event? : string;
}
