import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UsuarioAuth } from '../types';

interface AuthContextType {
  usuario: UsuarioAuth | null;
  token: string | null;
  login: (token: string, usuario: UsuarioAuth) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('focototal_token');
    const u = localStorage.getItem('focototal_usuario');
    if (t && u) {
      setToken(t);
      setUsuario(JSON.parse(u));
    }
  }, []);

  const login = (t: string, u: UsuarioAuth) => {
    localStorage.setItem('focototal_token', t);
    localStorage.setItem('focototal_usuario', JSON.stringify(u));
    setToken(t);
    setUsuario(u);
  };

  const logout = () => {
    localStorage.removeItem('focototal_token');
    localStorage.removeItem('focototal_usuario');
    setToken(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, isAdmin: usuario?.cargo === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
