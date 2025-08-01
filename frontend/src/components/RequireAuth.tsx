import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <p>Loading...</p>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;