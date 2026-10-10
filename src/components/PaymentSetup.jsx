import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { banks, networks, normalizePhone } from '../lib/paymentIntent';
import { formatNaira } from '../data/mockData';

export default function PaymentSetup({ initial, onReady, onClose }) {
  const dialog = useRef(null);
  const active = useRef(true);
  const busy = useRef(false);
  const [type, setType] = useState(initial.type === 'Choice' ? '' : initial.type);
  const [number, setNumber] = useState(initial.recipientNumber || initial.accountNumber || initial.phone || '');
  const [error, setError] = useState('');
  const [loadingBank, setLoadingBank] = useState('');
  const ambiguous = initial.type === 'Choice';
  const transfer = type === 'Transfer';
  const digits = number.replace(/[\s()+-]/g, '');
  const valid = transfer ? /^\d{10}$/.test(digits) : /^0[789]\d{9}$/.test(normalizePhone(digits));
  useEffect(() => {
    active.current = true;
    const element = dialog.current;
    element.showModal();
    element.querySelector('button')?.focus({ preventScroll: true });
    return () => { active.current = false; element.close(); };
  }, []);
  function chooseType(next) { setType(next); setError(''); }
  async function choose(value) {
    if (busy.current || !valid) return;
    setError('');
    const draft = { ...initial, type, recipientNumber: undefined, phone: '', provider: '', bank: '', accountNumber: '', recipientName: '', recipientQuery: '', beneficiaryId: '', candidates: [], accountResolutionId: '', accountNameSource: '', accountNameResolvedAt: 0, accountResolutionExpiresAt: 0, accountLookupError: '', phoneNotice: '', ...(ambiguous ? { assistantNotice: 'Check the amount and recipient before confirming.' } : {}) };
    if (!transfer) {
      const phone = normalizePhone(digits);
      onReady({ ...draft, provider: value, phone, phoneNotice: /^[789]\d{9}$/.test(digits) ? `Added the leading 0: ${phone}. Please check the number.` : '' });
      return;
    }
    busy.current = true; setLoadingBank(value);
    try {
      const { account } = await api('/accounts/resolve', { bank: value, accountNumber: digits });
      if (active.current) onReady({ ...draft, ...account });
    } catch (failure) { if (active.current) setError(failure.message); }
    finally { busy.current = false; if (active.current) setLoadingBank(''); }
  }
  return <dialog ref={dialog} aria-labelledby="payment-setup-title" onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl backdrop:bg-black/50">
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex justify-between items-center gap-3">
        <h2 id="payment-setup-title" className="text-xl font-bold text-gray-900">{!type ? 'What would you like to send?' : transfer ? "Choose the recipient's bank" : 'Choose the airtime network'}</h2>
        <button aria-label="Close payment choices" disabled={!!loadingBank} onClick={onClose} className="p-2 rounded-full bg-gray-100 disabled:opacity-40"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-sm text-gray-600">{formatNaira(Number(initial.amount) || 0)} to <span className="font-semibold break-all">{number}</span></p>
      {!type ? <>
        <p className="text-sm text-gray-500">This number could be a bank account or a phone number. Choose how to send it.</p>
        <div className="grid grid-cols-2 gap-3">{['Transfer', 'Airtime'].map(option => <button key={option} onClick={() => chooseType(option)} className="min-h-14 px-3 rounded-xl bg-primary text-white font-semibold">{option}</button>)}</div>
      </> : <>
        <label className="block text-sm font-medium text-gray-700">{transfer ? 'Account number' : 'Phone number'}
          <input value={number} onChange={event => { setNumber(event.target.value); setError(''); }} disabled={!!loadingBank} inputMode={transfer ? 'numeric' : 'tel'} className="w-full h-12 px-3 mt-1 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
        </label>
        {!valid && <p role="alert" className="text-sm text-amber-800">{transfer ? 'A bank account needs exactly 10 digits. Check the account number.' : 'Enter a Nigerian mobile number, with or without its leading 0.'}</p>}
        <p className="text-sm text-gray-500">{transfer ? 'Select the bank to look up the recipient name and open your review.' : 'Select the network to open your review.'}</p>
        <div className="grid grid-cols-2 gap-2">{(transfer ? banks : networks).map(option => <button key={option} disabled={!valid || !!loadingBank} onClick={() => choose(option)} className="min-h-12 p-3 border border-primary/30 text-primary bg-primary/5 rounded-xl font-semibold disabled:opacity-40">{option}</button>)}</div>
        {loadingBank && <p role="status" className="text-sm text-gray-500">Looking up the account name at {loadingBank}...</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error} Select the bank again to retry.</p>}
        {ambiguous && <button disabled={!!loadingBank} onClick={() => chooseType('')} className="text-sm text-primary font-semibold py-2">Change payment type</button>}
      </>}
      <p className="text-xs text-gray-500">Demo payments only. No real money moves or airtime is delivered.</p>
    </div>
  </dialog>;
}
