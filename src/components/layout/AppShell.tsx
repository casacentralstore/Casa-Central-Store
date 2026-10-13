import React, { useState, useEffect } from 'react';
import { TaxSettings, User } from '../../types/index.ts';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Users,
  Package,
  Truck,
  FileSpreadsheet,
  Landmark,
  BarChart3,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  KeyRound,
} from 'lucide-react';
import { GoogleSheetsBackupModal } from '../backup/GoogleSheetsBackupModal.tsx';
import { ChangePasswordModal } from '../auth/ChangePasswordModal.tsx';

interface AppShellProps {
  currentModule: string;
  onNavigate: (module: string) => void;
  users?: User[];
  currentUser: User;
  onSelectUser?: (user: User) => void;
  onLogout?: () => void;
  settings: TaxSettings;
  children: React.ReactNode;
}

const getRoleBadgeClass = (role?: string) => {
  switch (role) {
    case 'Admin':
    case 'Administrator':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Manager':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Sales':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Support':
    case 'Sales Support':
    case 'Logistics':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Accounting':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

export const AppShell: React.FC<AppShellProps> = ({
  currentModule,
  onNavigate,
  currentUser,
  onLogout,
  settings,
  children,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('casa_desktop_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleDesktopCollapse = () => {
    setDesktopCollapsed(prev => {
      const next = !prev;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('casa_desktop_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile nav on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Live' },
    { id: 'POS', label: 'POS Register', icon: ShoppingCart, badge: 'Core' },
    { id: 'Orders', label: 'Orders', icon: Receipt, badge: 'Core' },
    { id: 'Logistics', label: 'Logistics', icon: Truck, badge: 'Active' },
    { id: 'Invoices', label: 'Invoices', icon: FileSpreadsheet, badge: 'Active' },
    { id: 'Inventory', label: 'Inventory/Assets', icon: Package, badge: 'Active' },
    { id: 'Customers', label: 'Customers', icon: Users, badge: 'Core' },
    { id: 'Accounting', label: 'Accounting', icon: Landmark, badge: 'Active' },
    { id: 'Reports', label: 'Reports & Analytics', icon: BarChart3, badge: 'Active' },
    { id: 'Settings', label: 'Settings', icon: Settings, badge: 'Admin' },
  ];

  const handleSelectModule = (id: string) => {
    onNavigate(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex h-[100dvh] w-full min-w-0 max-w-full overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Drawer (Slide-over on < md) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col md:hidden transform transition-transform duration-250 ease-in-out shadow-2xl ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
              CC
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-white block">
                CASA CENTRAL
              </span>
              <span className="text-[10px] text-amber-400 font-medium tracking-wider uppercase block">
                Store Operations POS
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <nav className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                    isActive
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 shrink-0 space-y-3">
          <div className="space-y-1.5">
            <button
              onClick={() => {
                setIsPasswordModalOpen(true);
                setMobileNavOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700/70 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Change Password</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Account</span>
            </button>
            <button
              onClick={() => {
                setIsBackupModalOpen(true);
                setMobileNavOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold cursor-pointer border border-emerald-800/60 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Google Sheet Backup</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">5 Tabs</span>
            </button>
            {onLogout && (
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold cursor-pointer border border-rose-800/40 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Sign Out ({currentUser?.name})</span>
              </button>
            )}
          </div>

          <div>
            <p className="font-semibold text-slate-300">{settings?.company_name || 'Casa Central Store'}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              {settings?.company_address ? `${settings.company_address}, ${settings.company_city_state_zip}` : 'Union City, NJ'}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                DB Online
              </span>
              <span className="font-mono text-slate-400 font-medium">{timeStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Docked Sidebar (Hidden on mobile < md) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-slate-800 select-none z-20 bg-slate-900 text-slate-200 transition-all duration-200 ${
          desktopCollapsed ? 'w-18' : 'w-60 lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shrink-0">
              CC
            </div>
            {!desktopCollapsed && (
              <div className="min-w-0">
                <span className="font-black text-sm tracking-tight text-white block truncate">
                  CASA CENTRAL
                </span>
                <span className="text-[10px] text-amber-400 font-medium tracking-wider uppercase block truncate">
                  Store Operations
                </span>
              </div>
            )}
          </div>
          <button
            onClick={toggleDesktopCollapse}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {desktopCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Modules List */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectModule(item.id)}
                title={desktopCollapsed ? `${item.label} (${item.badge})` : undefined}
                className={`w-full flex items-center ${
                  desktopCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                } rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className={`flex items-center ${desktopCollapsed ? 'justify-center' : 'space-x-3'}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  {!desktopCollapsed && <span>{item.label}</span>}
                </div>
                {!desktopCollapsed && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                      isActive
                        ? 'bg-slate-950 text-amber-400'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Store Location Footer */}
        {!desktopCollapsed ? (
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 shrink-0">
            <p className="font-semibold text-slate-300 truncate">{settings?.company_name || 'Casa Central Store'}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              {settings?.company_address ? `${settings.company_address}, ${settings.company_city_state_zip}` : 'Union City, NJ'}
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                DB Online
              </span>
              <span className="font-mono text-slate-400 font-medium">{timeStr}</span>
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-slate-800 bg-slate-950/60 flex items-center justify-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Database Online"></span>
          </div>
        )}
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shadow-2xs shrink-0 z-10 gap-2">
          {/* Left: Mobile Menu Toggle & Module Label */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* Hamburger Button for mobile */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs font-bold text-slate-800 min-w-0">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] hidden xs:inline">
                Module:
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {currentModule}
              </span>
            </div>
          </div>

          {/* Right: Authenticated User & Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* User Badge: Clickable to change password */}
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs cursor-pointer transition-colors shadow-2xs group"
              title="Click to change your account password"
            >
              <div
                className="w-6 h-6 rounded-full bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-[11px] shadow-xs shrink-0 transition-colors"
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="hidden sm:flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 group-hover:text-amber-950 leading-none max-w-[110px] lg:max-w-[140px] truncate">
                  {currentUser?.name}
                </span>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeClass(
                    currentUser?.role
                  )}`}
                >
                  {currentUser?.role === 'Admin' ? 'Admin' : currentUser?.role}
                </span>
              </div>
            </button>

            {/* Change Password Header Button */}
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-950 text-xs font-bold rounded-lg border border-slate-200 hover:border-amber-300 transition-colors shadow-2xs cursor-pointer min-h-[36px]"
              title="Change your account password"
              aria-label="Change Password"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden xl:inline">Password</span>
            </button>

            {/* Google Sheets Master Backup Button */}
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg border border-emerald-300 transition-colors shadow-2xs cursor-pointer min-h-[36px]"
              title="Backup all orders, logistics, invoices, customers & inventory to Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden md:inline">Google Sheet Backup</span>
              <span className="md:hidden hidden sm:inline">Backup</span>
            </button>

            {/* Register / POS shortcut button */}
            {currentModule !== 'POS' && (
              <button
                onClick={() => onNavigate('POS')}
                className="px-2 sm:px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center space-x-1 min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5 sm:hidden" />
                <span className="hidden sm:inline">+ POS</span>
                <span className="sm:hidden font-black">POS</span>
              </button>
            )}

            {/* Sign Out Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer min-h-[36px]"
                title="Sign out of current account"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="hidden lg:inline">Sign Out</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main className="flex-1 overflow-hidden relative min-w-0 max-w-full">
          {children}
        </main>
      </div>

      {/* Google Sheets Backup Modal */}
      <GoogleSheetsBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};
