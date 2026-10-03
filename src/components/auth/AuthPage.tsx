import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Zap, Lock, AtSign, User as UserIcon, Eye, EyeOff, ArrowRight, Sun, Moon, Crown } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, signup, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bio, setBio] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isSignUp) {
      const res = await signup(username, password, displayName, bio);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      }
    } else {
      const res = await login(username, password);
      if (!res.success && res.error) {
        setErrorMsg(res.error);
      }
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center p-4 select-none relative transition-colors duration-150 ${
        isLight ? 'bg-neutral-50 text-neutral-900' : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-colors ${
            isLight
              ? 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 shadow-xs'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3 shadow-lg shadow-emerald-500/10">
            <Zap className="w-6 h-6 fill-emerald-500 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Glitch
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
            Live messaging across all devices.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 font-medium">
            <span>🔒 Permanent Accounts · Protected Usernames</span>
          </div>
        </div>

        {/* Auth Box */}
        <div
          className={`rounded-3xl border p-6 shadow-xl backdrop-blur-md transition-colors duration-150 ${
            isLight
              ? 'bg-white border-neutral-200 shadow-neutral-200/50'
              : 'bg-neutral-900/90 border-neutral-800'
          }`}
        >
          {/* Segmented Mode Control */}
          <div
            className={`flex p-1 rounded-xl mb-5 text-xs font-semibold ${
              isLight ? 'bg-neutral-100' : 'bg-neutral-950 border border-neutral-800/80'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                !isSignUp
                  ? isLight
                    ? 'bg-white text-neutral-900 shadow-xs font-bold'
                    : 'bg-neutral-800 text-white shadow-xs font-bold'
                  : isLight
                  ? 'text-neutral-500 hover:text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                isSignUp
                  ? isLight
                    ? 'bg-white text-neutral-900 shadow-xs font-bold'
                    : 'bg-neutral-800 text-white shadow-xs font-bold'
                  : isLight
                  ? 'text-neutral-500 hover:text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs leading-relaxed font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Username Input */}
            <div>
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                  isLight ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                Username
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  placeholder="e.g. glitch_user"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors font-mono ${
                    isLight
                      ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600'
                  }`}
                />
              </div>
            </div>

            {/* Display Name (Optional on Sign Up) */}
            {isSignUp && (
              <div>
                <label
                  className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                    isLight ? 'text-neutral-600' : 'text-neutral-400'
                  }`}
                >
                  Display Name (Optional)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className={`w-full rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                      isLight
                        ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                        : 'bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Custom Bio (User adds their own) */}
            {isSignUp && (
              <div>
                <label
                  className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                    isLight ? 'text-neutral-600' : 'text-neutral-400'
                  }`}
                >
                  Your Bio (Optional)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={2}
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-colors ${
                    isLight
                      ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600'
                  }`}
                />
              </div>
            )}

            {/* Password Input */}
            <div>
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                  isLight ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                    isLight
                      ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder:text-neutral-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {!isSignUp && (
              <div className="pt-2">
                <div className="relative flex py-1 items-center">
                  <div className={`flex-grow border-t ${isLight ? 'border-neutral-200' : 'border-neutral-800'}`} />
                  <span className={`flex-shrink mx-2 text-[10px] uppercase font-bold tracking-wider ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Owner Access
                  </span>
                  <div className={`flex-grow border-t ${isLight ? 'border-neutral-200' : 'border-neutral-800'}`} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('glitch');
                    setPassword('nack __123');
                  }}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isLight
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-900'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span>Fill Owner (@glitch - NAOL)</span>
                </button>
              </div>
            )}
          </form>
        </div>

        <div className={`text-center mt-6 text-[11px] font-mono ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
          <span>Glitch Messenger · No email required</span>
        </div>
      </div>
    </div>
  );
};
