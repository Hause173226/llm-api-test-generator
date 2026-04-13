import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { signalRService } from "../services/signalrService";
import { AuthContext, useAuth } from "./AuthContext";
import toast from "react-hot-toast";

interface SignalRContextType {
  isConnected: boolean;
  subscribeToTestRun: (testRunId: string) => Promise<void>;
  unsubscribeFromTestRun: (testRunId: string) => Promise<void>;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

export const SignalRProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      // Connect to SignalR when user is authenticated
      const connectSignalR = async () => {
        try {
          await signalRService.connect();
          setIsConnected(true);
        } catch (error) {
          console.error("Failed to connect to SignalR:", error);
          setIsConnected(false);
        }
      };

      connectSignalR();

      // Setup global event listeners
      const handleTestRunStatusChanged = (data: any) => {
        console.log("Test Run Status Changed:", data);
        // You can dispatch events or update global state here
      };

      const handleNewNotification = (data: any) => {
        toast.success(data.message || "New notification received", {
          duration: 4000,
          position: "top-right",
        });
      };

      signalRService.on("TestRunStatusChanged", handleTestRunStatusChanged);
      signalRService.on("NewNotification", handleNewNotification);

      // Cleanup on unmount or logout
      return () => {
        signalRService.off("TestRunStatusChanged", handleTestRunStatusChanged);
        signalRService.off("NewNotification", handleNewNotification);
        signalRService.disconnect();
        setIsConnected(false);
      };
    }
  }, [isAuthenticated]);

  const subscribeToTestRun = async (testRunId: string) => {
    await signalRService.subscribeToTestRun(testRunId);
  };

  const unsubscribeFromTestRun = async (testRunId: string) => {
    await signalRService.unsubscribeFromTestRun(testRunId);
  };

  return (
    <SignalRContext.Provider
      value={{ isConnected, subscribeToTestRun, unsubscribeFromTestRun }}
    >
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = (): SignalRContextType => {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error("useSignalR must be used within SignalRProvider");
  }
  return context;
};
