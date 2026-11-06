let activeRequests = 0;

const listeners = new Set();

const notify = () => {
  const isLoading = activeRequests > 0;

  listeners.forEach((listener) => listener(isLoading));
};

export const startLoading = () => {
  activeRequests += 1;
  notify();
};

export const stopLoading = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  notify();
};

export const subscribeToLoading = (listener) => {
  listeners.add(listener);

  listener(activeRequests > 0);

  return () => {
    listeners.delete(listener);
  };
};
