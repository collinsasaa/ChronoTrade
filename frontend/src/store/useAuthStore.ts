import { create } from 'zustand';
import axios from 'axios';

if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isAuthModalOpen: boolean;
  authMode: 'signin' | 'signup';
  isLoading: boolean;
  error: string | null;

  enterDemoMode: () => void;
  exitDemoMode: () => void;
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: 'signin' | 'signup') => void;
  
  signup: (fullName: string, email: string, pass: string) => Promise<boolean>;
  signin: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const TOKEN_KEY = 'chronotrade_jwt_token';

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isAuthenticated: false,
  isDemoMode: false,
  isAuthModalOpen: false,
  authMode: 'signin',
  isLoading: false,
  error: null,

  enterDemoMode: () => set({ isDemoMode: true }),
  exitDemoMode: () => set({ isDemoMode: false }),
  openAuthModal: (mode = 'signin') => set({ isAuthModalOpen: true, authMode: mode, error: null }),
  closeAuthModal: () => set({ isAuthModalOpen: false, error: null }),
  setAuthMode: (authMode) => set({ authMode, error: null }),

  signup: async (fullName, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post('/api/auth/signup', {
        full_name: fullName,
        email,
        password
      });
      const { access_token, user } = res.data;
      localStorage.setItem(TOKEN_KEY, access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isAuthModalOpen: false,
        isLoading: false
      });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || err.message || 'Signup failed',
        isLoading: false
      });
      return false;
    }
  },

  signin: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.post('/api/auth/signin', {
        email,
        password
      });
      const { access_token, user } = res.data;
      localStorage.setItem(TOKEN_KEY, access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isAuthModalOpen: false,
        isLoading: false
      });
      return true;
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || err.message || 'Signin failed',
        isLoading: false
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
    set({ token: null, user: null, isAuthenticated: false, isDemoMode: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const res = await axios.get('/api/auth/me');
      set({ token, user: res.data, isAuthenticated: true });
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      delete axios.defaults.headers.common['Authorization'];
      set({ token: null, user: null, isAuthenticated: false });
    }
  }
}));
