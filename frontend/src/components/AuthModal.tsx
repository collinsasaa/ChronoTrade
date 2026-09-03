import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogIn, UserPlus, X, Mail, Lock, User as UserIcon, RefreshCw, ShieldCheck, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authMode,
    setAuthMode,
    signin,
    signup,
    isLoading,
    error
  } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup') {
      await signup(fullName, email, password);
    } else {
      await signin(email, password);
    }
  };

  const isDuplicateAccountError = error && (error.toLowerCase().includes('already exists') || error.toLowerCase().includes('sign in'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Quant Terminal Auth</h3>
              <p className="text-[10px] text-slate-400 font-mono">Secure Access to Institutional Trading Engine</p>
            </div>
          </div>

          <button
            onClick={closeAuthModal}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 relative z-10">
          <button
            type="button"
            onClick={() => setAuthMode('signin')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMode === 'signin'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              authMode === 'signup'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>

        {/* Error / Prompt Banner */}
        {error && (
          <div className={`p-3.5 rounded-xl border text-xs font-mono relative z-10 flex flex-col gap-2 ${
            isDuplicateAccountError
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isDuplicateAccountError ? 'text-amber-400' : 'text-rose-400'}`} />
              <span>{error}</span>
            </div>

            {isDuplicateAccountError && (
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="self-start mt-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In to Existing Account
              </button>
            )}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {authMode === 'signup' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Satoshi Nakamoto"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="quant@chronotrade.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : authMode === 'signup' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Quant Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Terminal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
