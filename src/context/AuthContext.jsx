import React, { createContext, useContext, useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Проверяем текущего пользователя при загрузке
    setIsValid(!!pb.authStore.isValid);
    setUser(pb.authStore.model);
    setLoading(false);

    // Подписываемся на изменения authStore
    const unsubscribe = pb.authStore.onChange(() => {
      setIsValid(!!pb.authStore.isValid);
      setUser(pb.authStore.model);
    });

    return unsubscribe;
  }, []);

  const register = async (email, password, passwordConfirm, name) => {
    try {
      setError(null);
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
        name,
      });
      await login(email, password);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      setError(msg);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      await pb.collection('users').authWithPassword(email, password);
      setIsValid(true);
      setUser(pb.authStore.model);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      setError(msg);
      throw err;
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setIsValid(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isValid, loading, error, setError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
