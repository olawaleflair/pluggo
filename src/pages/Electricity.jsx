import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { electricityProviders, formatNaira } from '../data/mockData';
import PaymentModal from '../components/PaymentModal';

export default function Electricity() {
  const { makePayment } = useApp();
  const [provider, setProvider] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [showModal, setShowModal] = useState(false);

  const selectedProvider = electricityProviders.find((p) => p.id === provider);
  const isValid = provider && meterNumber.length >= 10 && Number(amount) >= 500;

  const handlePay = () => {
    if (isValid) setShowModal(true);
  };

  const confirmPayment = () => {
    return makePayment({
      type: 'Electricity',
      provider: selectedProvider.name,
      amount: Number(amount),
      details: `Meter: ${meterNumber} (${meterType})`,
      customerId: meterNumber,
    });
  };

  const handleClose = () => {
    setShowModal(false);
    setProvider('');
    setMeterNumber('');
    setAmount('');
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pay Electricity Bill</h2>
        <p className="text-gray-500 mt-1">Buy prepaid tokens or pay postpaid bills</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {/* Meter Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Meter Type</label>
          <div className="grid grid-cols-2 gap-3">
            {['prepaid', 'postpaid'].map((type) => (
              <button
                key={type}
                onClick={() => setMeterType(type)}
                className={`h-12 rounded-xl border-2 text-sm font-semibold capitalize transition-all active:scale-[0.98] ${
                  meterType === type
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Electricity Distribution Company</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-4 h-14 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900 bg-white"
          >
            <option value="">Select provider</option>
            {electricityProviders.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Meter Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Meter Number</label>
          <input
            type="text"
            inputMode="numeric"
            value={meterNumber}
            onChange={(e) => setMeterNumber(e.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder="Enter meter number"
            className="w-full px-4 h-14 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900"
          />
          {meterNumber.length >= 10 && (
            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Customer: John Adeyemi</p>
              <p className="text-xs text-green-600">Address: 15 Admiralty Way, Lekki</p>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount (min. {formatNaira(500)})</label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[1000, 2000, 5000, 10000, 15000, 20000].map((a) => (
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
              { label: 'Provider', value: selectedProvider?.name || '' },
              { label: 'Meter Type', value: meterType.charAt(0).toUpperCase() + meterType.slice(1) },
              { label: 'Meter Number', value: meterNumber },
              { label: 'Customer', value: 'John Adeyemi' },
            ],
          }}
        />
      )}
    </div>
  );
}
