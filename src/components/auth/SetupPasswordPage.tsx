import { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight, User as UserIcon } from 'lucide-react';
import { User, UserInvitation, UserRole } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface SetupPasswordPageProps {
  token: string;
  onComplete: (user: User) => void;
  onCancel: () => void;
}

export function SetupPasswordPage({ token, onComplete, onCancel }: SetupPasswordPageProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitedUser, setInvitedUser] = useState<User | null>(null);
  const [invitation, setInvitation] = useState<UserInvitation | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const verifyToken = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getInvite(token);
        if (isMounted) {
          setInvitedUser(res.user);
          setInvitation(res.invitation);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Invitation is invalid or has expired.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'Admin':
      case 'Administrator':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Manager':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Sales':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Support':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'Accounting':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const isLengthValid = password.length >= 6;
  const isMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLengthValid) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!isMatch) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.setupPassword(token, password);
      onComplete(res.user);
    } catch (err: any) {
      setError(err.message || 'Failed to setup password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-6 py-8 relative overflow-y-auto font-sans">

      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

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
            Account Activation &amp; Setup
          </p>
        </div>

        {loading ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 backdrop-blur-xl">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-200">Verifying your invitation link...</p>
            <p className="text-xs text-slate-500 mt-1">Checking secure authorization token</p>
          </div>
        ) : error && !invitedUser ? (
          <div className="bg-slate-900/90 border border-rose-900/60 rounded-2xl p-8 text-center backdrop-blur-xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center mx-auto mb-3 text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Invitation Link Expired or Invalid</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {error}
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                Return to Login Screen
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            <div className="mb-5">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Verified Staff Invitation</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Welcome, {invitedUser?.name}!
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Create your password to activate your staff profile and log into the Casa Central Store system.
              </p>
            </div>

            {/* Profile summary banner */}
            <div className="mb-5 p-3.5 bg-slate-800/70 border border-slate-700/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-700 text-amber-400 flex items-center justify-center font-bold text-sm">
                  {invitedUser?.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{invitedUser?.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{invitedUser?.email}</div>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(invitedUser?.role)}`}>
                {invitedUser?.role === 'Admin' ? 'Administrator' : invitedUser?.role}
              </span>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Create New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Requirement Checkpoints */}
              <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isLengthValid ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={isLengthValid ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                    At least 6 characters long
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isMatch ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={isMatch ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                    Passwords match
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isLengthValid || !isMatch}
                className="w-full py-3 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Activate Account &amp; Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-300 font-semibold cursor-pointer transition-colors"
              >
                Back to Sign In
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
