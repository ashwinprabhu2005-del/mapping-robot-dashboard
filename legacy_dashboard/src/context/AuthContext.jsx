import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('robomap_token');
    const storedUser = localStorage.getItem('robomap_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const loginUser = (tokenVal, userVal) => {
    localStorage.setItem('robomap_token', tokenVal);
    localStorage.setItem('robomap_user', JSON.stringify(userVal));
    setToken(tokenVal);
    setUser(userVal);
  };

  const logoutUser = () => {
    localStorage.removeItem('robomap_token');
    localStorage.removeItem('robomap_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loginUser, logoutUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
