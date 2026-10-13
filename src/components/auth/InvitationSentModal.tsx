import { useState } from 'react';
import { CheckCircle2, Copy, Check, ExternalLink, Mail, X, Shield, Clock } from 'lucide-react';
import { User, UserInvitation, SentEmail, UserRole } from '../../types/index.ts';

interface InvitationSentModalProps {
  user: User;
  invitation: UserInvitation;
  email?: SentEmail | null;
  onClose: () => void;
  onOpenSetupNow?: (token: string) => void;
}

export function InvitationSentModal({
  user,
  invitation,
  email,
  onClose,
  onOpenSetupNow,
}: InvitationSentModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'email'>('link');

  // Compute full URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = invitation.setup_url?.startsWith('http')
    ? invitation.setup_url
    : `${origin}/?invite=${invitation.token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getRoleBadgeStyle = (role: UserRole) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-linear-to-r from-emerald-600 to-teal-700 text-white flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Staff Invitation Dispatched</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Invitation and password setup email generated for staff member
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeStyle(user.role)}`}>
            {user.role === 'Admin' ? 'Administrator' : user.role}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-5 bg-white">
          <button
            onClick={() => setActiveTab('link')}
            className={`py-3 text-xs font-bold border-b-2 mr-6 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'link'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Invitation Link</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'email'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Preview</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'link' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Direct Password Setup Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={fullUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-300 rounded-lg text-slate-700 select-all focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopy}
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
                <div className="font-bold flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Token Validity</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  This personalized setup link expires in 7 days ({new Date(invitation.expires_at).toLocaleDateString()}).
                  When the staff member clicks the link, they will be prompted to set up their password.
                </p>
              </div>

              {onOpenSetupNow && (
                <div className="pt-2">
                  <button
                    onClick={() => onOpenSetupNow(invitation.token)}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open &amp; Test Setup Screen Now</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs bg-slate-100 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div>
                  <span className="font-bold text-slate-700">To:</span>{' '}
                  <span className="text-slate-900">{user.name} &lt;{user.email}&gt;</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Subject:</span>{' '}
                  <span className="text-slate-900">{email?.subject || `Invitation to join Casa Central Store POS as ${user.role}`}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-950 p-3">
                <div className="bg-white rounded-lg p-4 text-slate-900 text-xs shadow-inner">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 mb-3">
                    <div className="w-6 h-6 rounded bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                      CC
                    </div>
                    <span className="font-black text-slate-900 tracking-wide text-[11px]">
                      CASA CENTRAL STORE
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 mb-1">
                    Welcome to the Team, {user.name}!
                  </h4>
                  <p className="text-slate-600 mb-3 text-xs leading-relaxed">
                    An administrator has added you to <strong>Casa Central Store</strong> with the role of{' '}
                    <strong className="text-amber-700">{user.role === 'Admin' ? 'Administrator' : user.role}</strong>.
                  </p>

                  <div className="text-center my-4">
                    <span className="inline-block px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-2xs">
                      Set Up Your Password &rarr;
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                    Direct URL: <span className="font-mono text-slate-600">{fullUrl}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
