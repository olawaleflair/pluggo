import { paymentReceiptText } from '../lib/accountName';
import { useState } from 'react';
import { Phone, Wifi, Zap, Tv, Globe, Droplets, Search, Filter, Clock, Copy, Check, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatNaira } from '../data/mockData';

const typeIconMap = { Transfer: Send, Airtime: Phone, Data: Wifi, Electricity: Zap, 'Cable TV': Tv, Internet: Globe, Water: Droplets };
const typeColorMap = { Transfer: 'bg-emerald-100 text-emerald-600', Airtime: 'bg-blue-100 text-blue-600', Data: 'bg-purple-100 text-purple-600', Electricity: 'bg-yellow-100 text-yellow-600', 'Cable TV': 'bg-red-100 text-red-600', Internet: 'bg-teal-100 text-teal-600', Water: 'bg-cyan-100 text-cyan-600' };

export default function Transactions() {
  const { transactions } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [copiedRef, setCopiedRef] = useState(null);

  const types = ['all', ...new Set(transactions.map((t) => t.type))];

  const filtered = transactions.filter((t) => {
    const matchesSearch = t.provider.toLowerCase().includes(search.toLowerCase()) ||
      t.reference.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase()) ||
      (t.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.phone || '').includes(search);
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const copyRef = (ref) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
        <p className="text-gray-500 mt-1">View simulated transfers, bill payments and wallet funding</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipient, account, provider or reference"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900 bg-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filterType === type
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          filtered.map((tx) => {
            const Icon = typeIconMap[tx.type] || Phone;
            const colorClass = typeColorMap[tx.type] || 'bg-gray-100 text-gray-600';
            return (
              <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{tx.type} - {tx.provider}</p>
                        {tx.details && <p className="text-xs text-gray-500 mt-0.5">{paymentReceiptText(tx.details)}</p>}
                        {tx.phone && <p className="text-xs text-gray-500 mt-0.5">{tx.phone}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{tx.type === 'Wallet Funding' ? '+' : '-'}{formatNaira(tx.amount)}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'success' ? 'bg-green-100 text-green-700' :
                          tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(tx.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <button
                        onClick={() => copyRef(tx.reference)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
                      >
                        {copiedRef === tx.reference ? (
                          <><Check className="w-3 h-3 text-green-500" /><span className="text-green-500">Copied!</span></>
                        ) : (
                          <><Copy className="w-3 h-3" />{tx.reference}</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-center text-sm text-gray-400 mt-4">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
