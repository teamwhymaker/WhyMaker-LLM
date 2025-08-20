import { useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  picture: string;
}

interface AuthStatus {
  authenticated: boolean;
  user?: User;
  loading: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): AuthStatus {
  const [authStatus, setAuthStatus] = useState({
    authenticated: false,
    loading: true,
    user: undefined as User | undefined,
  });

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        setAuthStatus({
          authenticated: data.authenticated,
          user: data.user,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to check auth status:', error);
        setAuthStatus({
          authenticated: false,
          loading: false,
          user: undefined,
        });
      }
    };

    checkAuthStatus();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthStatus({
        authenticated: false,
        loading: false,
        user: undefined,
      });
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return {
    ...authStatus,
    logout,
  };
}
