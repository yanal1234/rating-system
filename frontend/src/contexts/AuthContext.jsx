import { createContext, useCallback, useEffect, useState } from "react";

import {
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
} from "../services/auth";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch complete user data from the backend
  const checkAuth = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          await refreshAccessToken();

          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login and then fetch the complete profile
  const login = async (credentials) => {
    const response = await loginUser(credentials);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(response.user || null);
      throw error;
    }

    return response;
  };

  // Logout
  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isStaff: user?.role === "staff",
    isStudent: user?.role === "student",
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
