export const isNullOrUndefined = (value: unknown) => {
  return value === null || value === undefined;
};

export const notNullOrUndefined = (value: unknown) => {
  return !isNullOrUndefined(value);
};
