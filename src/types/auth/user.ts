export interface ISidekickUser {
  name: string;
  email?: string;
  contact?: string;
  ctime: Date;
  mtime: Date; //last modified time
  meta: IUserMeta;
}

export interface IUserMeta {}
