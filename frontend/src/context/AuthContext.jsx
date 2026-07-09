import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data.data);
      localStorage.setItem('role', response.data.data.role);
      if (response.data.data.role === 'ADMIN' && !localStorage.getItem('storeId')) {
        const storesResponse = await api.get('/stores');
        if (storesResponse.data.data[0]) localStorage.setItem('storeId', storesResponse.data.data[0].id);
      } else if (response.data.data.role === 'FARMER') {
        localStorage.removeItem('storeId');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    const response = await api.post('/auth/login', { email: identifier, identifier, password });
    if (response.data.otpRequired) {
      return { otpRequired: true, identifier: response.data.identifier };
    }
    if (response.data.passwordSetupRequired) {
      return { passwordSetupRequired: true, userId: response.data.userId, username: response.data.username };
    }
    const { token, user } = response.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', user.role);
    setToken(token);
    setUser(user);
    if (user.role === 'ADMIN') {
      const storesResponse = await api.get('/stores');
      if (storesResponse.data.data[0]) localStorage.setItem('storeId', storesResponse.data.data[0].id);
    } else {
      localStorage.removeItem('storeId');
    }
    return user;
  };

  const requestFarmerOtp = async (identifier, _channel = 'PHONE', profile) => {
    const response = await api.post('/auth/farmer/otp/request', { identifier, channel: 'PHONE', profile });
    return response.data.data;
  };

  const verifyFarmerOtp = async (identifier, otp) => {
    const response = await api.post('/auth/farmer/otp/verify', { identifier, otp });
    const { token: nextToken, user: nextUser } = response.data.data;
    localStorage.setItem('token', nextToken);
    localStorage.setItem('role', nextUser.role);
    if (nextUser.role === 'ADMIN') {
      const storesResponse = await api.get('/stores');
      if (storesResponse.data.data[0]) localStorage.setItem('storeId', storesResponse.data.data[0].id);
    } else {
      localStorage.removeItem('storeId');
    }
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('storeId');
    localStorage.removeItem('role');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role: user?.role || localStorage.getItem('role'), loading, login, requestFarmerOtp, verifyFarmerOtp, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
