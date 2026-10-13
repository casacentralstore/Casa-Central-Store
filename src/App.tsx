import { useState, useEffect } from 'react';
import { TaxSettings, User } from './types/index.ts';
import { api, setActiveUserId, clearAuthSession } from './services/api.ts';
import { AppShell } from './components/layout/AppShell.tsx';
import { PosScreen } from './components/pos/PosScreen.tsx';
import { OrdersList } from './components/orders/OrdersList.tsx';
import { CustomersList } from './components/customers/CustomersList.tsx';
import { InventoryList } from './components/inventory/InventoryList.tsx';
import { LogisticsBoard } from './components/logistics/LogisticsBoard.tsx';
import { InvoicesList } from './components/invoices/InvoicesList.tsx';
import { AccountingDashboard } from './components/accounting/AccountingDashboard.tsx';
import { ReportsDashboard } from './components/reports/ReportsDashboard.tsx';
import { DashboardOverview } from './components/dashboard/DashboardOverview.tsx';
import { SettingsPage } from './components/settings/SettingsPage.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { SetupPasswordPage } from './components/auth/SetupPasswordPage.tsx';

export default function App() {
  const [currentModule, setCurrentModule] = useState<string>('POS');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [posInitialOrderId, setPosInitialOrderId] = useState<string | null>(null);

  // Invite Token Setup State
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get('invite');
    if (fromParam) return fromParam;
    const hashMatch = window.location.hash.match(/invite=([^&]+)/);
    return hashMatch ? hashMatch[1] : null;
  });

  const loadInitialData = async () => {
    try {
      const [usersData, settingsData] = await Promise.all([
        api.getUsers(),
        api.getSettings(),
      ]);
      setUsers(usersData);
      setSettings(settingsData);

      // Verify active authentication session
      try {
        const me = await api.getMe();
        if (me && me.active) {
          setCurrentUser(me);
          setActiveUserId(me.id);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Failed to load initial configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveUserId(user.id);
    loadInitialData();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      clearAuthSession();
      setCurrentUser(null);
    }
  };

  const handleSetupComplete = (user: User) => {
    setInviteToken(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setCurrentUser(user);
    setActiveUserId(user.id);
    loadInitialData();
  };

  const handleCancelInvite = () => {
    setInviteToken(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleEditOrderInPos = (orderId: string) => {
    setPosInitialOrderId(orderId);
    setCurrentModule('POS');
  };

  const handleNewOrder = () => {
    setPosInitialOrderId(null);
    setCurrentModule('POS');
  };

  // If visiting via invitation link, render SetupPasswordPage
  if (inviteToken) {
    return (
      <SetupPasswordPage
        token={inviteToken}
        onComplete={handleSetupComplete}
        onCancel={handleCancelInvite}
      />
    );
  }

  // Initial Boot Loading
  if (loading || !settings) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg animate-pulse">
            CC
          </div>
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wider text-slate-100">
              CASA CENTRAL STORE
            </h1>
            <p className="text-xs text-amber-400 mt-0.5">Initializing Authentication &amp; System Services...</p>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated: Show Login Screen
  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLoginSuccess}
        onOpenInviteSetup={token => setInviteToken(token || 'manual')}
      />
    );
  }

  // Authenticated: Render Main App Shell
  return (
    <AppShell
      currentModule={currentModule}
      onNavigate={mod => {
        if (mod === 'POS') setPosInitialOrderId(null);
        setCurrentModule(mod);
      }}
      users={users}
      currentUser={currentUser}
      onLogout={handleLogout}
      settings={settings}
    >
      {currentModule === 'Dashboard' && (
        <DashboardOverview
          onNavigate={mod => setCurrentModule(mod)}
          onNewOrder={handleNewOrder}
        />
      )}
      {currentModule === 'POS' && (
        <PosScreen
          settings={settings}
          users={users}
          currentUser={currentUser}
          initialOrderId={posInitialOrderId}
          onNavigateToOrders={() => setCurrentModule('Orders')}
        />
      )}
      {currentModule === 'Orders' && (
        <OrdersList
          settings={settings}
          users={users}
          currentUser={currentUser}
          onEditInPos={handleEditOrderInPos}
          onNewOrder={handleNewOrder}
        />
      )}
      {currentModule === 'Customers' && (
        <CustomersList
          currentUser={currentUser}
          onOpenOrder={orderId => handleEditOrderInPos(orderId)}
        />
      )}
      {currentModule === 'Inventory' && (
        <InventoryList
          settings={settings}
          currentUser={currentUser}
        />
      )}
      {currentModule === 'Logistics' && (
        <LogisticsBoard
          currentUser={currentUser}
          onOpenOrder={orderId => handleEditOrderInPos(orderId)}
        />
      )}
      {currentModule === 'Invoices' && (
        <InvoicesList
          settings={settings}
          currentUser={currentUser}
          onOpenOrder={orderId => handleEditOrderInPos(orderId)}
        />
      )}
      {currentModule === 'Accounting' && (
        <AccountingDashboard />
      )}
      {currentModule === 'Reports' && (
        <ReportsDashboard />
      )}
      {currentModule === 'Settings' && (
        <SettingsPage
          settings={settings}
          users={users}
          currentUser={currentUser}
          onRefreshSettings={loadInitialData}
        />
      )}
    </AppShell>
  );
}
