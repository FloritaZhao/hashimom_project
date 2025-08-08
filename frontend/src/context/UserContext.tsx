import React, { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api';
import { useQueryClient } from '@tanstack/react-query';

interface User {
  user_id: number;
  nickname: string;
  email?: string;
  profileImage?: string;
}

interface UserContextValue {
  user: User | null;
  login: (nickname: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: { nickname?: string; profileImage?: string }) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if session is still valid on app start
    const validateSession = async () => {
      try {
        // First check if there's a stored user in localStorage
        const stored = localStorage.getItem('user');
        if (stored) {
          // Validate that the session is still active on the backend
          const sessionUser = await api.checkSession();
          // Add stored profile image and email from localStorage
          const storedProfileImage = localStorage.getItem(`profileImage_${sessionUser.user_id}`);
          const storedUser = JSON.parse(stored);
          const userWithExtras = {
            ...sessionUser,
            email: storedUser.email || sessionUser.nickname, // Use stored email or fallback to nickname
            profileImage: storedProfileImage || undefined
          };
          setUser(userWithExtras);
          localStorage.setItem('user', JSON.stringify(userWithExtras));
        }
      } catch (error) {
        // Session expired or invalid, clear localStorage
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const loginUser = async (nickname: string, email: string) => {
    const res = await api.login(nickname, email);
    // Check for stored profile image
    const storedProfileImage = localStorage.getItem(`profileImage_${res.user_id}`);
    const userWithExtras = {
      ...res,
      email: email, // Use the actual provided email
      profileImage: storedProfileImage || undefined
    };
    setUser(userWithExtras);
    // Clear any previous user's cached queries to avoid cross-user data
    try { queryClient.clear(); } catch {}
  };

  const logoutUser = async () => {
    await api.logout();
    setUser(null);
    try { queryClient.clear(); } catch {}
  };

  const updateProfile = (updates: { nickname?: string; profileImage?: string }) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    // Store profile image separately
    if (updates.profileImage) {
      localStorage.setItem(`profileImage_${user.user_id}`, updates.profileImage);
    }
  };

  return (
    <UserContext.Provider value={{ user, login: loginUser, logout: logoutUser, updateProfile, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}