
import React from "react";

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  // Simply render children without authentication check
  return <>{children}</>;
};

export default AuthWrapper;
