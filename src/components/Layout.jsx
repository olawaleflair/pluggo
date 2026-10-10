import { createElement, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Phone, Wifi, Zap, Tv, Globe, Droplets, Receipt,
  Wallet, ChevronRight, MoreHorizontal, X, LogOut, Send, Users, Bell,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../data/mockData';
import FundWalletModal from './FundWalletModal';

// Bottom nav — 5 primary tabs on mobile
const bottomTabs = [
  { path: '/',            label: 'Home',      icon: Home    },
  { path: '/airtime',     label: 'Airtime',   icon: Phone   },
  { path: '/data',        label: 'Data',      icon: Wifi    },
  { path: '/electricity', label: 'Electric',  icon: Zap     },
  { path: '__more__',     label: 'More',      icon: MoreHorizontal },
];

// Items shown in the "More" bottom sheet
const moreItems = [
  { path: '/transfer', label: 'Transfer', icon: Send, color: 'bg-emerald-100 text-emerald-600' },
  { path: '/beneficiaries', label: 'Beneficiaries', icon: Users, color: 'bg-blue-100 text-blue-600' },
  { path: '/cable',        label: 'Cable TV',      icon: Tv,      color: 'bg-red-100 text-red-600'    },
  { path: '/internet',     label: 'Internet',      icon: Globe,   color: 'bg-teal-100 text-teal-600'  },
  { path: '/water',        label: 'Water',         icon: Droplets,color: 'bg-cyan-100 text-cyan-600'  },
  { path: '/transactions', label: 'Transactions',  icon: Receipt, color: 'bg-purple-100 text-purple-600' },
];

// Full sidebar nav (desktop)
const sidebarItems = [
  { path: '/',            label: 'Dashboard',    icon: Home      },
  { path: '/transfer', label: 'Transfer', icon: Send },
  { path: '/beneficiaries', label: 'Beneficiaries', icon: Users },
  { path: '/airtime',     label: 'Airtime',      icon: Phone     },
  { path: '/data',        label: 'Data',         icon: Wifi      },
  { path: '/electricity', label: 'Electricity',  icon: Zap       },
  { path: '/cable',       label: 'Cable TV',     icon: Tv        },
  { path: '/internet',    label: 'Internet',     icon: Globe     },
  { path: '/water',       label: 'Water',        icon: Droplets  },
  { path: '/transactions',label: 'Transactions', icon: Receipt   },
];

const pageTitle = {
  '/transfer': 'Transfer money',
  '/beneficiaries': 'Beneficiaries',
  '/':            'Dashboard',
  '/airtime':     'Buy Airtime',
  '/data':        'Buy Data',
  '/electricity': 'Electricity',
  '/cable':       'Cable TV',
  '/internet':    'Internet',
  '/water':       'Water Bill',
  '/transactions':'Transactions',
};

export default function Layout({ children }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [fundWalletOpen, setFundWalletOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  async function restartDemo() { setResetting(true); setResetError(''); try { await resetDemo(); } catch (error) { setResetError(error.message); } finally { setResetting(false); } }
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, signOut, fundWallet, resetDemo }  = useApp();

  const isMoreActive = moreItems.some((i) => i.path === location.pathname);

  const handleTabPress = (path) => {
    if (path === '__more__') {
      setMoreOpen(true);
    } else {
      navigate(path);
    }
  };

  const handleMoreNavigate = (path) => {
    setMoreOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    setMoreOpen(false);
    setFundWalletOpen(false);
    navigate('/signin');
  };

  const handleFundWallet = async (amount) => {
    await fundWallet(amount);
  };

  return (
    <div className="min-h-screen bg-surface flex">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-64 bg-white/50 backdrop-blur-xl border-r border-gray-200/50 flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Plug<span className="text-primary">Go</span></span>
          </Link>
        </div>

        <div className="mx-4 mt-4 p-4 bg-gradient-to-br from-primary to-primary-dark rounded-xl text-white shadow-lg shadow-primary/20 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
          <p className="text-xs text-white/80 mb-1 relative z-10">Wallet Balance</p>
          <p className="text-2xl font-bold relative z-10">{formatNaira(user.walletBalance)}</p>
          <button
            onClick={() => setFundWalletOpen(true)}
            className="mt-3 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            + Fund Wallet
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map(({ path, label, icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all no-underline ${
                  active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {createElement(icon, { className: 'w-5 h-5' })}
                {label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-semibold text-sm">{user.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.phone}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-3 w-full h-10 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content column ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 glass-nav px-4 pt-safe">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-gray-900">
                Plug<span className="text-primary">Go</span>
              </span>
            </div>
            <button
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-controls="notification-panel"
              onClick={() => setNotificationsOpen(open => !open)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
          {notificationsOpen && <section id="notification-panel" aria-label="Notifications" className="absolute top-full right-4 left-4 sm:left-auto sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-4">
            <div className="flex justify-between items-center mb-2"><h2 className="font-semibold text-gray-900">Notifications</h2><button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
            <p className="text-sm text-gray-600">No new notifications.</p>
            <p className="text-xs text-gray-500 mt-1">Your demo payments are saved in your transaction history.</p>
            <Link to="/transactions" onClick={() => setNotificationsOpen(false)} className="inline-block text-sm font-semibold text-primary mt-3 py-2">View activity</Link>
          </section>}
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 glass-panel border-b-0 px-6 h-14 items-center shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900">
            {pageTitle[location.pathname] || 'PlugGo'}
          </h1>
        </header>

        {/* Page content — extra bottom padding on mobile for the nav bar */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          <p className="mb-4 rounded-lg bg-primary/10 px-3 py-2 text-xs sm:text-sm text-primary">Portfolio demo. All payments are simulated; no real money moves.</p>
          {user.demo && <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-xs text-gray-500"><span>Your private demo session lasts 24 hours.</span><button disabled={resetting} onClick={restartDemo} className="font-semibold text-primary py-2">{resetting ? 'Resetting...' : 'Reset demo'}</button>{resetError && <p role="alert" className="w-full text-red-700">{resetError}</p>}</div>}
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation bar ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-stretch h-16">
          {bottomTabs.map(({ path, label, icon }) => {
            const active = path === '__more__'
              ? isMoreActive
              : location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => handleTabPress(path)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-primary' : 'text-gray-400'
                }`}
              >
                {createElement(icon, {
                  className: `w-6 h-6 transition-transform ${active ? 'scale-110' : ''}`,
                })}
                <span className={`text-[10px] font-medium leading-tight ${active ? 'text-primary' : 'text-gray-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── "More" bottom sheet ── */}
      {moreOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-xl pb-safe animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-base font-semibold text-gray-900">More Services</span>
              <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 px-5 pb-6">
              {moreItems.map(({ path, label, icon, color }) => (
                <button
                  key={path}
                  onClick={() => handleMoreNavigate(path)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 active:scale-95 transition-transform"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    {createElement(icon, { className: 'w-5 h-5' })}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{label}</span>
                </button>
              ))}
            </div>
            <div className="px-5 pb-6">
              <button
                onClick={handleSignOut}
                className="w-full h-12 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      <FundWalletModal
        isOpen={fundWalletOpen}
        onClose={() => setFundWalletOpen(false)}
        onFund={handleFundWallet}
        currentBalance={user.walletBalance}
      />
    </div>
  );
}
