import { createContext, useEffect, useState } from "react";
import { subscribeToLoading } from "../services/loading";

export const LoadingContext = createContext(null);

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return subscribeToLoading(setIsLoading);
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};
