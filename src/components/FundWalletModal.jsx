import { useState } from 'react';
import { CheckCircle, Loader2, Wallet, X } from 'lucide-react';
import { formatNaira } from '../data/mockData';

const quickFundAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

export default function FundWalletModal({ isOpen, onClose, onFund, currentBalance }) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('form'); // form | processing | success
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const parsedAmount = Number(amount);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleFund = async () => {
    if (!isValidAmount) return;
    setError('');
    setStep('processing');
    try {
      await onFund(parsedAmount);
      setStep('success');
    } catch (fundError) {
      setError(fundError.message || 'Unable to fund wallet.');
      setStep('form');
    }
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    setStep('form');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={step === 'processing' ? undefined : handleClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-4">
        <div className="bg-white w-full rounded-t-3xl lg:rounded-2xl lg:max-w-md shadow-2xl overflow-hidden">
          {step === 'form' && (
            <>
              <div className="lg:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Fund Wallet</h3>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Balance</span>
                  <span className="text-lg font-bold text-primary">{formatNaira(currentBalance || 0)}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Choose amount</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {quickFundAmounts.map((value) => (
                      <button
                        key={value}
                        onClick={() => setAmount(String(value))}
                        className={`h-11 rounded-xl border text-sm font-semibold transition-all ${
                          Number(amount) === value
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 text-gray-700'
                        }`}
                      >
                        {formatNaira(value)}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter custom amount"
                    className="w-full px-4 h-14 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-900"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}
              </div>

              <div className="px-5 pt-4 pb-8 lg:pb-5 flex gap-3 border-t border-gray-100">
                <button
                  onClick={handleClose}
                  className="flex-1 h-14 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFund}
                  disabled={!isValidAmount}
                  className="flex-1 h-14 rounded-2xl bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fund Wallet
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="px-5 py-16 flex flex-col items-center">
              <Loader2 className="w-14 h-14 text-primary animate-spin mb-5" />
              <p className="text-lg font-bold text-gray-900">Funding Wallet...</p>
              <p className="text-sm text-gray-400 mt-1">Please wait a moment</p>
            </div>
          )}

          {step === 'success' && (
            <div className="px-5 pt-6 pb-8 lg:pb-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <p className="text-xl font-bold text-gray-900">Wallet Funded</p>
              <p className="text-sm text-gray-400 mt-1 mb-5">Your balance has been updated.</p>

              <div className="bg-gray-50 rounded-2xl p-4 w-full space-y-2.5 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount Added</span>
                  <span className="font-semibold text-gray-800">{formatNaira(parsedAmount)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2.5 flex justify-between text-sm">
                  <span className="text-gray-400">New Balance</span>
                  <span className="font-bold text-primary">{formatNaira(currentBalance || 0)}</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full h-14 rounded-2xl bg-primary text-white font-bold flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
