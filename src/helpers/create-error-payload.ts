export const createErrorPayload = (
  nodeName: string,
  payload: any,
  error: string
) => {
  const errors = [];
  errors.push({
    error: error,
    name: nodeName,
  });

  return Object.assign({}, payload, {
    errors,
    followFlow: 'isError',
  });
};
