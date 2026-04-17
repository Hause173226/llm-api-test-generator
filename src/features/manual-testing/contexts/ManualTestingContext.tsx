import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { RequestConfig, ResponseData, HttpMethod } from "../types";

interface ManualTestingState {
  requestConfig: RequestConfig;
  responseData: ResponseData | null;
  isLoading: boolean;
  error: Error | null;
  executionTarget: {
    suiteId: string | null;
    testCaseId: string | null;
  };
}

interface ManualTestingContextValue extends ManualTestingState {
  setRequestConfig: (config: RequestConfig) => void;
  updateRequestConfig: (updates: Partial<RequestConfig>) => void;
  setResponseData: (response: ResponseData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setExecutionTarget: (target: {
    suiteId: string | null;
    testCaseId: string | null;
  }) => void;
  resetRequest: () => void;
}

const ManualTestingContext = createContext<
  ManualTestingContextValue | undefined
>(undefined);

const createDefaultRequestConfig = (): RequestConfig => ({
  method: "GET" as HttpMethod,
  url: "",
  params: [],
  headers: [],
  body: {
    type: "none",
    content: "",
  },
  auth: {
    type: "none",
  },
  timeout: 30000,
});

interface ManualTestingProviderProps {
  children: ReactNode;
}

export const ManualTestingProvider: React.FC<ManualTestingProviderProps> = ({
  children,
}) => {
  const [requestConfig, setRequestConfigState] = useState<RequestConfig>(
    createDefaultRequestConfig(),
  );
  const [responseData, setResponseData] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [executionTarget, setExecutionTarget] = useState<{
    suiteId: string | null;
    testCaseId: string | null;
  }>({
    suiteId: null,
    testCaseId: null,
  });

  const setRequestConfig = useCallback((config: RequestConfig) => {
    setRequestConfigState(config);
  }, []);

  const updateRequestConfig = useCallback((updates: Partial<RequestConfig>) => {
    setRequestConfigState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const resetRequest = useCallback(() => {
    setRequestConfigState(createDefaultRequestConfig());
    setResponseData(null);
    setError(null);
  }, []);

  const value: ManualTestingContextValue = {
    requestConfig,
    responseData,
    isLoading,
    error,
    executionTarget,
    setRequestConfig,
    updateRequestConfig,
    setResponseData,
    setLoading,
    setError,
    setExecutionTarget,
    resetRequest,
  };

  return (
    <ManualTestingContext.Provider value={value}>
      {children}
    </ManualTestingContext.Provider>
  );
};

// Main hook - provides full context
export const useManualTesting = (): ManualTestingContextValue => {
  const context = useContext(ManualTestingContext);
  if (!context) {
    throw new Error(
      "useManualTesting must be used within ManualTestingProvider",
    );
  }
  return context;
};

// Specialized hook for request configuration
export const useRequestConfig = () => {
  const context = useContext(ManualTestingContext);
  if (!context) {
    throw new Error(
      "useRequestConfig must be used within ManualTestingProvider",
    );
  }
  return {
    requestConfig: context.requestConfig,
    setRequestConfig: context.setRequestConfig,
    updateRequestConfig: context.updateRequestConfig,
    executionTarget: context.executionTarget,
    setExecutionTarget: context.setExecutionTarget,
    resetRequest: context.resetRequest,
  };
};

// Specialized hook for response data
export const useResponseData = () => {
  const context = useContext(ManualTestingContext);
  if (!context) {
    throw new Error(
      "useResponseData must be used within ManualTestingProvider",
    );
  }
  return {
    responseData: context.responseData,
    isLoading: context.isLoading,
    error: context.error,
    setResponseData: context.setResponseData,
    setLoading: context.setLoading,
    setError: context.setError,
  };
};
