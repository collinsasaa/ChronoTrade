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
  isAuthModalOpen: boolean;
  authMode: 'signin' | 'signup';
  isLoading: boolean;
  error: string | null;

  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: 'signin' | 'signup') => void;
  
  signup: (fullName: string, email: string, pass: string) => Promise<boolean>;
  signin: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const TOKEN_KEY = 'chronotrade_jwt_token';
const USER_KEY = 'chronotrade_user_profile';
const CRED_KEY = 'chronotrade_user_credentials';

const getInitialState = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  let user: User | null = null;
  try {
    if (userRaw) user = JSON.parse(userRaw);
  } catch (e) {}

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return {
    token,
    user,
    isAuthenticated: Boolean(token && user)
  };
};

const initialState = getInitialState();

export const useAuthStore = create<AuthState>((set) => ({
  token: initialState.token,
  user: initialState.user,
  isAuthenticated: initialState.isAuthenticated,
  isAuthModalOpen: false,
  authMode: 'signin',
  isLoading: false,
  error: null,

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
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(CRED_KEY, JSON.stringify({ email, password, fullName }));
      
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
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(CRED_KEY, JSON.stringify({ email, password, fullName: user.full_name }));

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
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(CRED_KEY);
    delete axios.defaults.headers.common['Authorization'];
    set({ token: null, user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const credRaw = localStorage.getItem(CRED_KEY);

    let savedUser: User | null = null;
    let savedCred: { email?: string; password?: string; fullName?: string } | null = null;
    try {
      if (userRaw) savedUser = JSON.parse(userRaw);
      if (credRaw) savedCred = JSON.parse(credRaw);
    } catch (e) {}

    // Optimistically keep user authenticated if token + user profile exist locally
    if (token && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ token, user: savedUser, isAuthenticated: true });
    }

    if (!token) return;

    try {
      const res = await axios.get('/api/auth/me');
      set({ token, user: res.data, isAuthenticated: true });
      localStorage.setItem(USER_KEY, JSON.stringify(res.data));
    } catch (err: any) {
      // If server database restarted or token was invalidated, attempt background re-synchronization using saved session credentials
      if (savedCred && savedCred.email && savedCred.password) {
        try {
          const reSignin = await axios.post('/api/auth/signin', {
            email: savedCred.email,
            password: savedCred.password
          });
          const { access_token, user } = reSignin.data;
          localStorage.setItem(TOKEN_KEY, access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          set({ token: access_token, user, isAuthenticated: true });
          return;
        } catch (e1) {
          try {
            const reSignup = await axios.post('/api/auth/signup', {
              full_name: savedCred.fullName || savedUser?.full_name || 'Quant Analyst',
              email: savedCred.email,
              password: savedCred.password
            });
            const { access_token, user } = reSignup.data;
            localStorage.setItem(TOKEN_KEY, access_token);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            set({ token: access_token, user, isAuthenticated: true });
            return;
          } catch (e2) {}
        }
      }

      // If no valid local session credentials exist, perform clean logout
      if (!savedUser) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(CRED_KEY);
        delete axios.defaults.headers.common['Authorization'];
        set({ token: null, user: null, isAuthenticated: false });
      }
    }
  }
}));
