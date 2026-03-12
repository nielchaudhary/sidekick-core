//document insertion
export interface IChat {
  sessionId: string;
  messages: IMessage[];
  ctime: Date; //on the whole conversation level
}

export enum RoleTypes {
  USER = 'user',
  SYSTEM = 'system',
}

export interface IMessage {
  messageId: string;
  role: RoleTypes;
  message: string;
  ctime: Date; //granular data on message level
  like: boolean;
  dislike: boolean;
  copied: boolean;
}
