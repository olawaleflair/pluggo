import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { airtimeProviders, quickAmounts, formatNaira } from '../data/mockData';
import PaymentModal from '../components/PaymentModal';

export default function Airtime() {
  const { makePayment } = useApp();
  const [provider, setProvider] = useState(null);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [showModal, setShowModal] = useState(false);

  const isValid = provider && phone.length >= 11 && Number(amount) >= 50;

  const handlePay = () => {
    if (isValid) setShowModal(true);
  };

  const confirmPayment = () => {
    return makePayment({
      type: 'Airtime',
      provider: provider.name,
      amount: Number(amount),
      phone,
      customerId: phone,
    });
  };

  const handleClose = () => {
    setShowModal(false);
    setProvider(null);
    setPhone('');
    setAmount('');
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Buy Airtime</h2>
        <p className="text-gray-500 mt-1">Top up any Nigerian network instantly</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {/* Network Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Network</label>
          <div className="grid grid-cols-4 gap-3">
            {airtimeProviders.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  provider?.id === p.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{p.logo}</span>
                <span className="text-xs font-medium text-gray-700">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="08012345678"
            className="w-full px-4 h-14 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900"
          />
        </div>

        {/* Quick Amounts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a.toString())}
                className={`h-12 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${
                  amount === a.toString()
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {formatNaira(a)}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Or enter custom amount"
            className="w-full px-4 h-14 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900"
          />
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePay}
          disabled={!isValid}
          className={`w-full h-14 rounded-xl font-semibold text-white transition-all active:scale-[0.98] ${
            isValid
              ? 'bg-primary hover:bg-primary-dark active:scale-[0.98]'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {isValid ? `Buy ${formatNaira(Number(amount))} Airtime` : 'Fill in all fields'}
        </button>
      </div>

      <PaymentModal
        isOpen={showModal}
        onClose={handleClose}
        onConfirm={confirmPayment}
        details={{
          amount: Number(amount),
          items: [
            { label: 'Network', value: provider?.name || '' },
            { label: 'Phone Number', value: phone },
            { label: 'Type', value: 'Airtime Top-up' },
          ],
        }}
      />
    </div>
  );
}
