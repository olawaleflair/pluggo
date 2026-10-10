import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { waterProviders, formatNaira } from '../data/mockData';
import PaymentModal from '../components/PaymentModal';

export default function Water() {
  const { makePayment } = useApp();
  const [provider, setProvider] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [showModal, setShowModal] = useState(false);

  const selectedProvider = waterProviders.find((p) => p.id === provider);
  const isValid = provider && accountNumber.length >= 8 && Number(amount) >= 500;

  const handlePay = () => {
    if (isValid) setShowModal(true);
  };

  const confirmPayment = () => {
    return makePayment({
      type: 'Water',
      provider: selectedProvider.name,
      amount: Number(amount),
      details: `Account: ${accountNumber}`,
      customerId: accountNumber,
    });
  };

  const handleClose = () => {
    setShowModal(false);
    setProvider('');
    setAccountNumber('');
    setAmount('');
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pay Water Bill</h2>
        <p className="text-gray-500 mt-1">Pay your state water corporation bills</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Water Corporation</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-4 h-14 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900 bg-white"
          >
            <option value="">Select water corporation</option>
            {waterProviders.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
          <input
            type="text"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="Enter account number"
            className="w-full px-4 h-14 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900"
          />
          {accountNumber.length >= 8 && (
            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Customer: Emeka Obi</p>
              <p className="text-xs text-green-600">Address: 8 Marina Road, Lagos</p>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[1000, 2000, 3500, 5000, 7500, 10000].map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a.toString())}
                className={`h-12 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${
                  amount === a.toString()
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
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
          {isValid ? `Pay ${formatNaira(Number(amount))}` : 'Fill in all fields'}
        </button>
      </div>

      {selectedProvider && (
        <PaymentModal
          isOpen={showModal}
          onClose={handleClose}
          onConfirm={confirmPayment}
          details={{
            amount: Number(amount),
            items: [
              { label: 'Water Corporation', value: selectedProvider?.name || '' },
              { label: 'Account Number', value: accountNumber },
              { label: 'Customer', value: 'Emeka Obi' },
            ],
          }}
        />
      )}
    </div>
  );
}
