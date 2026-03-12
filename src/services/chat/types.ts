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
  SYSTEM = 'system',
}

export interface IMessage {
  contentId: string;
  role: RoleTypes;
  content: string;
  ctime: Date; //granular data on message level
  like: boolean;
  dislike: boolean;
  copied: boolean;
}
