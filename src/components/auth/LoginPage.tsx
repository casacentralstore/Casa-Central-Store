import { useState } from 'react';
import { Shield, Lock, Mail, Eye, EyeOff, ArrowRight, UserCheck, KeyRound, AlertCircle, Sparkles } from 'lucide-react';
import { User, UserRole } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onOpenInviteSetup: (token?: string) => void;
}

const DEMO_ACCOUNTS: { role: UserRole; name: string; email: string; label: string; badge: string }[] = [
  { role: 'Admin', name: 'Store Administrator', email: 'ecommerce@casacentralstore.com', label: 'Administrator', badge: 'bg-purple-100 text-purple-900 border-purple-300' },
  { role: 'Manager', name: 'Carlos Rivera', email: 'carlos@casacentralstore.com', label: 'Manager', badge: 'bg-blue-100 text-blue-900 border-blue-300' },
  { role: 'Sales', name: 'Elena Gomez', email: 'elena@casacentralstore.com', label: 'Sales', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { role: 'Support', name: 'Marcus Vance', email: 'marcus@casacentralstore.com', label: 'Support (Sales Support & Logistics)', badge: 'bg-teal-100 text-teal-900 border-teal-300' },
  { role: 'Accounting', name: 'Sarah Jenkins', email: 'accounting@casacentralstore.com', label: 'Accounting', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
];

export function LoginPage({ onLogin, onOpenInviteSetup }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteTokenInput, setInviteTokenInput] = useState('');
  const [showInviteTokenBox, setShowInviteTokenBox] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email address and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      onLogin(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword('password123');
    setError(null);
  };

  const handleManualInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = inviteTokenInput.trim();
    if (!token) return;
    // Extract token if user pasted full URL
    const match = token.match(/invite=([^&]+)/);
    const cleanToken = match ? match[1] : token;
    onOpenInviteSetup(cleanToken);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-6 py-8 relative overflow-y-auto font-sans">

      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-tr from-amber-600 to-amber-400 text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 mb-3 border border-amber-300/40">
            CC
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white">
            CASA CENTRAL STORE
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-amber-400 mt-1">
            POS &amp; Operations Management
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Staff Login</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your authorized staff credentials to access the system.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('invitation link') && (
                  <button
                    type="button"
                    onClick={() => setShowInviteTokenBox(true)}
                    className="block mt-2 font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Enter Invitation Code to Set Password &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@casacentralstore.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowInviteTokenBox(!showInviteTokenBox)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                >
                  Need password setup?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Register &amp; ERP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Invitation setup drawer */}
          {showInviteTokenBox && (
            <div className="mt-5 p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Have an Invitation Link or Code?</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                Paste your invitation code or full link from the email you received to setup your password:
              </p>
              <form onSubmit={handleManualInviteSubmit} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Invite token or URL..."
                  value={inviteTokenInput}
                  onChange={e => setInviteTokenInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!inviteTokenInput.trim()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Setup
                </button>
              </form>
            </div>
          )}

          {/* Quick Staff Login Presets */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Fast Login / Demo Accounts</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">pwd: password123</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillQuickAccount(acc)}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-lg text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                      {acc.name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${acc.badge}`}>
                      {acc.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200">
                    Fill &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-slate-400 text-xs">
          Casa Central Store &bull; 405 32nd St, Union City, NJ 07087 &bull; (201) 867-0000
        </div>
      </div>
    </div>
  );
}
