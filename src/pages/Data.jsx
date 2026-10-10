import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { airtimeProviders, dataPlans, formatNaira } from '../data/mockData';
import PaymentModal from '../components/PaymentModal';

export default function Data() {
  const { makePayment } = useApp();
  const [provider, setProvider] = useState(null);
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const plans = provider ? dataPlans[provider.id] || [] : [];
  const isValid = provider && phone.length >= 11 && plan;

  const handlePay = () => {
    if (isValid) setShowModal(true);
  };

  const confirmPayment = () => {
    return makePayment({
      type: 'Data',
      provider: provider.name,
      amount: plan.price,
      details: `${plan.size} - ${plan.duration}`,
      phone,
      customerId: phone,
    });
  };

  const handleClose = () => {
    setShowModal(false);
    setProvider(null);
    setPhone('');
    setPlan(null);
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Buy Data</h2>
        <p className="text-gray-500 mt-1">Get data bundles at the best prices</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {/* Network Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Network</label>
          <div className="grid grid-cols-4 gap-3">
            {airtimeProviders.map((p) => (
              <button
                key={p.id}
                onClick={() => { setProvider(p); setPlan(null); }}
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

        {/* Data Plans */}
        {provider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Plan</label>
            <div className="space-y-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p)}
                  className={`w-full flex items-center justify-between p-4 min-h-[56px] rounded-xl border-2 transition-all active:scale-[0.98] ${
                    plan?.id === p.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{p.size}</p>
                    <p className="text-xs text-gray-500">{p.duration}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatNaira(p.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
          {isValid ? `Buy ${plan.size} for ${formatNaira(plan.price)}` : 'Select network and plan'}
        </button>
      </div>

      {plan && (
        <PaymentModal
          isOpen={showModal}
          onClose={handleClose}
          onConfirm={confirmPayment}
          details={{
            amount: plan.price,
            items: [
              { label: 'Network', value: provider?.name || '' },
              { label: 'Phone Number', value: phone },
              { label: 'Data Plan', value: `${plan.size} - ${plan.duration}` },
            ],
          }}
        />
      )}
    </div>
  );
}
