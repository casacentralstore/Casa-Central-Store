import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  X,
  Shield,
  Sparkles,
  RefreshCw,
  Check,
} from 'lucide-react';
import { User } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  targetUser?: User | null; // If set and different from currentUser, Admin reset mode
  onSuccess?: (message: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetUser,
  onSuccess,
}) => {
  const isTargetOther = Boolean(targetUser && targetUser.id !== currentUser.id);
  const activeTarget = targetUser || currentUser;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset form when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(null);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, targetUser]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMinLength = newPassword.length >= 6;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const hasMixedChars = /[0-9]/.test(newPassword) && /[a-zA-Z]/.test(newPassword);
  const canSubmit = isMinLength && isMatch && (isTargetOther || currentPassword.length > 0) && !loading;

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isTargetOther && !currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!isMinLength) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (!isTargetOther && currentPassword === newPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      if (isTargetOther) {
        // Admin resetting staff member password
        const res = await api.resetUserPassword(activeTarget.id, newPassword);
        setSuccess(res.message || `Password for ${activeTarget.name} updated successfully.`);
        if (onSuccess) onSuccess(res.message);
      } else {
        // User changing own password
        const res = await api.changePassword({
          userId: currentUser.id,
          currentPassword,
          newPassword,
        });
        setSuccess(res.message || 'Your password has been changed successfully.');
        if (onSuccess) onSuccess(res.message);
      }

      // Auto-close after 1.8 seconds on success
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[95dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="change-password-title" className="text-sm sm:text-base font-bold text-white truncate">
                {isTargetOther ? 'Reset Staff Password' : 'Change Your Password'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {isTargetOther
                  ? `Setting credentials for ${activeTarget.name}`
                  : `Account: ${currentUser.email}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Target Profile Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shrink-0">
                {activeTarget.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block truncate">{activeTarget.name}</span>
                <span className="text-[10px] text-slate-500 font-mono truncate block">{activeTarget.email}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase shrink-0">
              {activeTarget.role}
            </span>
          </div>

          {/* Feedback Messages */}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{success}</div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Current Password (only needed if changing own password) */}
            {!isTargetOther && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-medium text-xs bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Generator for Admin Reset */}
            {isTargetOther && (
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] text-slate-500 font-medium">Administrator Reset Mode</span>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="inline-flex items-center space-x-1 text-[11px] text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Generate Password</span>
                </button>
              </div>
            )}

            {/* New Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  New Password <span className="text-rose-500">*</span>
                </label>
                {!isTargetOther && (
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Generate Strong</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-medium text-xs bg-white text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-medium text-xs bg-white text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                    isMinLength ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {isMinLength ? <Check className="w-2.5 h-2.5" /> : '•'}
                </span>
                <span className={isMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                  At least 6 characters
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                    isMatch ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {isMatch ? <Check className="w-2.5 h-2.5" /> : '•'}
                </span>
                <span className={isMatch ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                  Passwords match
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                    hasMixedChars ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {hasMixedChars ? <Check className="w-2.5 h-2.5" /> : '•'}
                </span>
                <span className={hasMixedChars ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                  Letters and numbers recommended
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />}
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Updating...' : isTargetOther ? 'Reset Password' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
