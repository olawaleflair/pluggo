import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { cableTvProviders, formatNaira } from '../data/mockData';
import PaymentModal from '../components/PaymentModal';

export default function CableTV() {
  const { makePayment } = useApp();
  const [provider, setProvider] = useState(null);
  const [plan, setPlan] = useState(null);
  const [smartcard, setSmartcard] = useState('');
  const [showModal, setShowModal] = useState(false);

  const plans = provider ? provider.plans : [];
  const isValid = provider && plan && smartcard.length >= 10;

  const handlePay = () => {
    if (isValid) setShowModal(true);
  };

  const confirmPayment = () => {
    return makePayment({
      type: 'Cable TV',
      provider: provider.name,
      amount: plan.price,
      details: `${plan.name} - 1 month`,
      customerId: smartcard,
    });
  };

  const handleClose = () => {
    setShowModal(false);
    setProvider(null);
    setPlan(null);
    setSmartcard('');
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Cable TV Subscription</h2>
        <p className="text-gray-500 mt-1">Renew DStv, GOtv, or StarTimes</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Provider</label>
          <div className="grid grid-cols-3 gap-3">
            {cableTvProviders.map((p) => (
              <button
                key={p.id}
                onClick={() => { setProvider(p); setPlan(null); }}
                className={`h-14 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95 ${
                  provider?.id === p.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Smartcard Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Smartcard / IUC Number</label>
          <input
            type="text"
            inputMode="numeric"
            value={smartcard}
            onChange={(e) => setSmartcard(e.target.value.replace(/\D/g, '').slice(0, 12))}
            placeholder="Enter smartcard number"
            className="w-full px-4 h-14 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900"
          />
          {smartcard.length >= 10 && (
            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">Customer: Funke Olatunji</p>
            </div>
          )}
        </div>

        {/* Plans */}
        {provider && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Plan</label>
            <div className="space-y-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlan(p)}
                  className={`w-full flex items-center justify-between p-4 min-h-[52px] rounded-xl border-2 transition-all active:scale-[0.98] ${
                    plan?.id === p.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">{p.name}</span>
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
          {isValid ? `Subscribe ${plan.name} for ${formatNaira(plan.price)}` : 'Select provider and plan'}
        </button>
      </div>

      {plan && provider && (
        <PaymentModal
          isOpen={showModal}
          onClose={handleClose}
          onConfirm={confirmPayment}
          details={{
            amount: plan.price,
            items: [
              { label: 'Provider', value: provider.name },
              { label: 'Plan', value: plan.name },
              { label: 'Smartcard', value: smartcard },
              { label: 'Customer', value: 'Funke Olatunji' },
            ],
          }}
        />
      )}
    </div>
  );
}
