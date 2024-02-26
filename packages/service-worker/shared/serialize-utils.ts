const serializeError = (error: Error) => {
  return JSON.stringify({
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
};

const deserializeError = (errorString: string) => {
  try {
    const { name, message, stack } = JSON.parse(errorString) as {
      name: string;
      message: string;
      stack: string;
    };
    const error = new Error(message);
    error.name = name;
    error.stack = stack;
    return error;
  } catch (e) {
    return new Error(errorString);
  }
};

export { serializeError, deserializeError };
