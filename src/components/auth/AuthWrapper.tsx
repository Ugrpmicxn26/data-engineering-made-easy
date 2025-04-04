
import React, { useEffect } from "react";
import { useSessionAuth } from "@/utils/sessionStore";
import LoginForm from "./LoginForm";

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, user } = useSessionAuth();
  
  // For debugging authentication state
  useEffect(() => {
    console.log("Authentication state:", { isAuthenticated, user });
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;
