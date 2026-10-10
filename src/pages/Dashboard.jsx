import { useState } from 'react';
import FundWalletModal from '../components/FundWalletModal';
import QuickPayment from '../components/QuickPayment';
import { Link } from 'react-router-dom';
import { Phone, Wifi, Zap, Tv, Globe, Droplets, Send, Plus, UserPlus, Receipt, Wallet, ArrowDownLeft, TrendingUp, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira, billCategories } from '../data/mockData';

const iconMap = { Phone, Wifi, Zap, Tv, Globe, Droplets, Send };

const getStatusBadge = (status) => {
  if (status === 'success') return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Success</span>;
  if (status === 'pending') return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>;
  return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Failed</span>;
};

const getTypeIcon = (type) => {
  const map = { Airtime: Phone, Transfer: Send, Data: Wifi, Electricity: Zap, 'Cable TV': Tv, Internet: Globe, Water: Droplets };
  const Icon = map[type] || Phone;
  return <Icon className="w-4 h-4" />;
};

export default function Dashboard() {
  const { user, transactions, fundWallet } = useApp();
  const [fundOpen, setFundOpen] = useState(false);
  const recent = transactions.slice(0, 5);

  const totalSpent = transactions.filter(t => t.status === 'success' && t.type !== 'Wallet Funding').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-5 max-w-5xl animate-fade-in">
      <FundWalletModal isOpen={fundOpen} onClose={() => setFundOpen(false)} onFund={fundWallet} currentBalance={user.walletBalance} />
      {/* Welcome — hidden on mobile (top bar shows logo) */}
      <div className="hidden sm:block">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name} 👋</h2>
        <p className="text-gray-500 mt-1">Describe a payment, review the details and confirm.</p>
      </div>

      <section aria-label="Wallet balance" className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-primary/15 relative overflow-hidden">
        <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-14 -bottom-16 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex items-center justify-between mb-3">
          <span className="text-sm text-white/85 font-medium">Wallet balance</span>
          <Wallet className="w-5 h-5 text-white/80" />
        </div>
        <p className="relative text-4xl sm:text-5xl font-bold tracking-tight">{formatNaira(user.walletBalance)}</p>
        <p className="relative mt-3 text-xs text-white/80">Available to send or pay bills</p>
      </section>

      <nav aria-label="Wallet quick actions" className="grid grid-cols-4 gap-2 sm:gap-4">
        {[{ label: 'Add money', icon: Plus, onClick: () => setFundOpen(true) },
          { label: 'Send money', icon: Send, to: '/transfer' },
          { label: 'Add beneficiary', icon: UserPlus, to: '/beneficiaries' },
          { label: 'History', icon: Receipt, to: '/transactions' }].map(({ label, icon, to, onClick }) => {
          const Icon = icon;
          const content = <><span className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="w-5 h-5" /></span><span className="text-[11px] sm:text-sm font-semibold text-gray-700 leading-tight">{label}</span></>;
          const className = 'flex flex-col items-center gap-2 py-2 text-center rounded-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-primary active:scale-95 transition-transform';
          return to ? <Link key={label} to={to} className={className}>{content}</Link> : <button key={label} onClick={onClick} className={className}>{content}</button>;
        })}
      </nav>

      <QuickPayment />

      {/* Quick Actions — 3-col grid, larger touch targets */}
      <div>
        <div className="flex items-center justify-between mb-3 ml-1"><h3 className="text-base font-semibold text-gray-900">Pay bills</h3><Link to="/beneficiaries" className="text-sm text-primary font-semibold">Saved beneficiaries</Link></div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {billCategories.map((cat) => {
            const Icon = iconMap[cat.icon];
            return (
              <Link
                key={cat.id}
                to={`/${cat.id}`}
                className="flex flex-col items-center gap-2 py-3 px-2 bg-white rounded-2xl border border-gray-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 active:scale-95 transition-all duration-300 no-underline"
              >
                <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center">{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500">Total payments</span><ArrowDownLeft className="w-4 h-4 text-red-400" /></div>
          <p className="text-xl font-bold text-gray-900">{formatNaira(totalSpent)}</p>
          <p className="text-xs text-gray-400 mt-1">{transactions.length} transactions</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500">Cashback</span><TrendingUp className="w-4 h-4 text-green-400" /></div>
          <p className="text-xl font-bold text-gray-900">{formatNaira(1250)}</p>
          <p className="text-xs text-gray-400 mt-1">Sample figure</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3 ml-1">
          <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
          <Link to="/transactions" className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors no-underline">
            View All
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {recent.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.status === 'success' ? 'bg-green-50 text-green-600' : tx.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'}`}>
                {getTypeIcon(tx.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{tx.type} · {tx.provider}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {new Date(tx.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{tx.type === 'Wallet Funding' ? '+' : '-'}{formatNaira(tx.amount)}</p>
                {getStatusBadge(tx.status)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
