//document insertion
export interface IChat {
  sessionId: string;
  title: string;
  ctime: Date; //on the whole conversation level
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  messageCount: number;
}

export enum RoleTypes {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface IMessage {
  contentId: string;
  sessionId: string;
  role: RoleTypes;
  content: string;
  ctime: Date; //granular data on message level
  latencyMs?: number;
  meta?: IMessageMetadata;
}

export interface IMessageMetadata {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  liked?: boolean;
  dislike?: boolean;
  copied?: boolean;
}
