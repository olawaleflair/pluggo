import { useState } from 'react';
import { CheckCircle, X, Loader2 } from 'lucide-react';
import { formatNaira } from '../data/mockData';

export default function PaymentModal({ isOpen, onClose, onConfirm, details }) {
  const [step, setStep] = useState('confirm'); // confirm | processing | success
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    setError('');
    setStep('processing');
    setTimeout(async () => {
      try {
        await onConfirm();
        setStep('success');
      } catch (confirmError) {
        setError(confirmError.message || 'Payment failed. Please try again.');
        setStep('confirm');
      }
    }, 1200);
  };

  const handleClose = () => {
    setStep('confirm');
    setError('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={step === 'processing' ? undefined : handleClose}
      />

      {/* Bottom sheet on mobile, centered modal on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-4">
        <div className="bg-white w-full rounded-t-3xl lg:rounded-2xl lg:max-w-md shadow-2xl overflow-hidden">

          {/* Drag handle — mobile only */}
          {step !== 'processing' && (
            <div className="lg:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
          )}

          {/* CONFIRM */}
          {step === 'confirm' && (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Confirm Payment</h3>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-3">
                {details.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">{formatNaira(details.amount)}</span>
                </div>
              </div>

              <div className="px-5 pt-4 pb-8 lg:pb-5 flex gap-3 border-t border-gray-100">
                <button
                  onClick={handleClose}
                  className="flex-1 h-14 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 h-14 rounded-2xl bg-primary text-white font-semibold active:scale-95 transition-transform"
                >
                  Pay {formatNaira(details.amount)}
                </button>
              </div>
            </>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="px-5 py-16 flex flex-col items-center">
              <Loader2 className="w-14 h-14 text-primary animate-spin mb-5" />
              <p className="text-lg font-bold text-gray-900">Processing Payment…</p>
              <p className="text-sm text-gray-400 mt-1">Please wait a moment</p>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="px-5 pt-6 pb-8 lg:pb-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <p className="text-xl font-bold text-gray-900">Payment Successful!</p>
              <p className="text-sm text-gray-400 mt-1 mb-5">Demo payment recorded. No real bill was paid.</p>

              <div className="bg-gray-50 rounded-2xl p-4 w-full space-y-2.5 mb-5">
                {details.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2.5 flex justify-between">
                  <span className="text-sm text-gray-400">Amount Paid</span>
                  <span className="text-sm font-bold text-primary">{formatNaira(details.amount)}</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full h-14 rounded-2xl bg-primary text-white font-bold active:scale-95 transition-transform"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
