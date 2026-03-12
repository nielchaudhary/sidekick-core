//document insertion
export interface IChat {
  sessionId: string;
  title: string;
  messages: IMessage[];
  ctime: Date; //on the whole conversation level
  model: string;
}

export enum RoleTypes {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface IMessage {
  contentId: string;
  role: RoleTypes;
  content: string;
  metadata?: IMessageMetadata;
  ctime: Date; //granular data on message level
  like: boolean;
  dislike: boolean;
  copied: boolean;
}

export interface IMessageMetadata {
  liked?: boolean;
  dislike?: boolean;
  copied?: boolean;
}
