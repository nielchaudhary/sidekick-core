import { v4 } from 'uuid';

export const isNullOrUndefined = (value: unknown) => {
  return value === null || value === undefined;
};

export const notNullOrUndefined = (value: unknown) => {
  return !isNullOrUndefined(value);
};

export const generateUserId = () => {
  return v4();
};
