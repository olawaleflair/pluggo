import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { banks, networks, validatePayment } from '../lib/paymentIntent';
import { useAccountLookup } from '../hooks/useAccountLookup';
import AccountNameField from './AccountNameField';
import { accountNameDescription, paymentReceiptText } from '../lib/accountName';
import { formatNaira } from '../data/mockData';

export const paymentFieldClass = 'w-full h-12 px-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-900 bg-white';

export default function PaymentReview({ initial, onClose }) {
  const { user, beneficiaries, confirmPayment } = useApp();
  const dialog = useRef(null);
  const busy = useRef(false);
  const [draft, setDraft] = useState(initial);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('review');
  const [receipt, setReceipt] = useState(null);
  const transfer = draft.type === 'Transfer';
  const lookup = useAccountLookup(transfer ? draft.bank : '', transfer ? draft.accountNumber : '', initial);
  const reviewDraft = transfer ? { ...draft, recipientName: '', accountResolutionId: '', ...lookup.result } : draft;
  const validation = validatePayment(reviewDraft);
  const candidates = initial.candidates || [];
  const [needsChoice, setNeedsChoice] = useState(candidates.length > 1);
  const [editing, setEditing] = useState(() => !!validatePayment(initial) || (initial.candidates || []).length > 1);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    element.querySelector('[data-initial-focus="true"]')?.focus({ preventScroll: true });
    return () => element.close();
  }, []);
  function change(field, value) {
    setDraft(prev => ({ ...prev, [field]: value, ...(field === 'phone' ? { phoneNotice: '' } : {}), ...(transfer && ['bank', 'accountNumber'].includes(field) ? { beneficiaryId: '', recipientName: '', accountResolutionId: '' } : {}) }));
    setPin(''); setError(''); setRequestId(crypto.randomUUID());
  }
  function choose(id) {
    const item = beneficiaries.find(b => b.id === id);
    setDraft(prev => ({ ...prev, beneficiaryId: item?.id || '', bank: item?.bank || '', accountNumber: item?.accountNumber || '', recipientName: item?.recipientName || '' }));
    setNeedsChoice(false); setPin(''); setError(''); setRequestId(crypto.randomUUID());
  }
  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    if (needsChoice || validation) { setError(validation || 'Choose which beneficiary to pay.'); return; }
    if (Number(draft.amount) > user.walletBalance) { setError('Insufficient demo wallet balance. Fund your wallet first.'); return; }
    if (!/^\d{4}$/.test(pin)) { setError('Enter the four-digit demo PIN.'); return; }
    busy.current = true; setError(''); setStep('processing');
    try {
      const result = await confirmPayment({ ...reviewDraft, candidates: undefined, amount: Number(draft.amount), requestId, pin });
      setDraft(reviewDraft); setReceipt(result); setStep('success');
    } catch (failure) { setError(failure.message); setStep('review'); }
    finally { busy.current = false; setPin(''); }
  }
  function field(label, name, attributes = {}) {
    return <label className="block text-sm font-medium text-gray-700">{label}<input value={draft[name] || ''} onChange={e => change(name, e.target.value)} className={`${paymentFieldClass} mt-1`} required {...attributes} /></label>;
  }
  return (
    <dialog ref={dialog} aria-labelledby="payment-review-title" onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl p-0 border-0 shadow-2xl backdrop:bg-black/50">
      <div className="p-5 sm:p-6">
        <div className="flex justify-between items-center gap-3 mb-2">
          <h2 id="payment-review-title" className="text-xl font-bold text-gray-900">{step === 'success' ? 'Demo payment recorded' : `Review ${transfer ? 'transfer' : 'airtime payment'}`}</h2>
          <button aria-label="Close payment review" disabled={step === 'processing'} onClick={onClose} className="p-2 rounded-full bg-gray-100 disabled:opacity-40"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Simulated payment. No real money moves or service is delivered.</p>
        {step === 'processing' ? <div role="status" className="py-12 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />Recording your demo payment...</div> : step === 'success' ? (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <p className="text-center font-semibold">{formatNaira(receipt.amount)} {transfer ? `to ${draft.recipientName}` : `${receipt.provider} airtime for ${receipt.phone}`}</p>
            {transfer && <p className="text-sm text-gray-600">{paymentReceiptText(receipt.details)}</p>}
            <p className="text-sm text-gray-500 break-all">Reference: {receipt.reference}</p>
            <p className="text-sm text-gray-600">Demo wallet balance: {formatNaira(user.walletBalance)}. Saved in your transaction history.</p>
            <button autoFocus onClick={onClose} className="w-full h-12 bg-primary text-white rounded-xl font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {draft.assistantNotice && <p role="status" className="text-sm text-primary bg-primary/5 p-3 rounded-xl">{draft.assistantNotice}</p>}
            {transfer && !editing && lookup.loading && <p role="status" className="text-sm text-gray-500">Refreshing account name...</p>}
            {transfer && !editing && lookup.error && <AccountNameField lookup={lookup} />}
            {draft.phoneNotice && <p role="status" className="text-sm text-primary bg-primary/5 p-3 rounded-xl">{draft.phoneNotice}</p>}
            {!transfer && !draft.provider && <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-xl">Choose the network for this phone number. We will not guess it.</p>}
            <p className="text-sm text-gray-600">{validation || needsChoice ? 'Complete the missing details below, then review your payment.' : 'Your details are filled in. Check them, then enter your demo PIN.'}</p>
            {editing ? <>{transfer ? <>
              {candidates.length > 1 && <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-xl">More than one beneficiary matches "{initial.recipientQuery}". Choose the account you want.</p>}
              {initial.recipientQuery && candidates.length === 0 && <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-xl">No saved beneficiary matches "{initial.recipientQuery}". Choose one below or enter the recipient details.</p>}
              <label className="block text-sm font-medium text-gray-700">Saved beneficiary
                <select value={draft.beneficiaryId || ''} onChange={e => choose(e.target.value)} className={`${paymentFieldClass} mt-1`} data-initial-focus={needsChoice}>
                  <option value="">Enter a new recipient</option>
                  {(needsChoice ? candidates : beneficiaries).map(item => <option key={item.id} value={item.id}>{item.name} - {item.bank} - {item.accountNumber}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">Bank
                <select value={draft.bank || ''} onChange={e => change('bank', e.target.value)} className={`${paymentFieldClass} mt-1`} required><option value="">Choose bank</option>{banks.map(bank => <option key={bank}>{bank}</option>)}</select>
              </label>
              {field('Account number', 'accountNumber', { inputMode: 'numeric', pattern: '[0-9]{10}', maxLength: 10 })}
              <AccountNameField lookup={lookup} />
            </> : <>
              {field('Phone number', 'phone', { type: 'tel' })}
              <label className="block text-sm font-medium text-gray-700">Network<select value={draft.provider || ''} onChange={e => change('provider', e.target.value)} className={`${paymentFieldClass} mt-1`} required><option value="">Choose network</option>{networks.map(network => <option key={network}>{network}</option>)}</select></label>
            </>}
            {field('Amount (NGN)', 'amount', { type: 'number', inputMode: 'decimal', min: transfer ? '0.01' : '50', max: '1000000', step: '0.01' })}
            {!validation && !needsChoice && <button type="button" onClick={() => setEditing(false)} className="text-sm font-semibold text-primary py-2">Done editing</button>}
            </> : <>
              <dl className="space-y-2 bg-gray-50 rounded-xl p-4 text-sm">
                {(transfer ? [['Recipient', reviewDraft.recipientName], ['Bank', draft.bank], ['Account number', draft.accountNumber]] : [['Service', 'Airtime'], ['Network', draft.provider], ['Phone number', draft.phone]]).map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-gray-500">{label}</dt><dd className="font-semibold text-gray-900 text-right break-all">{value}</dd></div>)}
              </dl>
              {transfer && <p className="text-xs text-gray-500">{accountNameDescription(reviewDraft.accountNameSource)}</p>}
              <button type="button" onClick={() => { setEditing(true); setPin(''); }} className="text-sm font-semibold text-primary py-2">Edit details</button>
            </>}
            <div className="flex justify-between font-semibold border-t border-gray-100 pt-3"><span>Total</span><span className="text-primary">{formatNaira(Number(draft.amount) || 0)}</span></div>
            <label className="block text-sm font-medium text-gray-700">Demo PIN<input autoFocus={!validation && !needsChoice} data-initial-focus={!validation && !needsChoice} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }} className={`${paymentFieldClass} mt-1`} aria-describedby="demo-pin-help" required pattern="[0-9]{4}" /></label>
            <p id="demo-pin-help" className="text-xs text-gray-500">Use 1234. This is a shared demo PIN, not personal payment security.</p>
            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
            <div className="flex gap-3 pt-1"><button type="button" onClick={onClose} className="flex-1 h-12 border border-gray-200 rounded-xl font-semibold">Cancel</button><button disabled={!!validation || needsChoice || pin.length !== 4} className="flex-1 min-h-12 px-2 bg-primary text-white rounded-xl font-semibold disabled:opacity-40">Confirm demo payment</button></div>
          </form>
        )}
      </div>
    </dialog>
  );
}
