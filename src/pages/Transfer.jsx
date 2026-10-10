import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { banks, validatePayment } from '../lib/paymentIntent';
import { useAccountLookup } from '../hooks/useAccountLookup';
import AccountNameField from '../components/AccountNameField';
import PaymentReview, { paymentFieldClass } from '../components/PaymentReview';
const empty = { type: 'Transfer', beneficiaryId: '', bank: '', accountNumber: '', recipientName: '', amount: '' };
export default function Transfer() {
  const { beneficiaries } = useApp();
  const [form, setForm] = useState(empty);
  const [review, setReview] = useState(null);
  const lookup = useAccountLookup(form.bank, form.accountNumber);
  const resolvedForm = { ...form, recipientName: '', ...lookup.result };
  const validation = validatePayment(resolvedForm);
  function change(name, value) { setForm(prev => ({ ...prev, [name]: value, ...(name !== 'amount' ? { beneficiaryId: '' } : {}) })); }
  function choose(id) {
    const item = beneficiaries.find(b => b.id === id);
    setForm(prev => ({ ...prev, beneficiaryId: id, bank: item?.bank || '', accountNumber: item?.accountNumber || '', recipientName: item?.recipientName || '' }));
  }
  return <div className="max-w-lg space-y-5">
    <div><h2 className="text-2xl font-bold text-gray-900">Transfer money</h2><p className="text-gray-500 mt-1">Try a simulated transfer from your demo wallet.</p></div>
    <form onSubmit={e => { e.preventDefault(); if (!validation) setReview(resolvedForm); }} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <label className="block text-sm font-medium text-gray-700">Saved beneficiary<select value={form.beneficiaryId} onChange={e => choose(e.target.value)} className={`${paymentFieldClass} mt-1`}><option value="">Enter a new recipient</option>{beneficiaries.map(item => <option key={item.id} value={item.id}>{item.name} - {item.bank} - {item.accountNumber}</option>)}</select></label>
      <Link to="/beneficiaries" className="text-sm text-primary font-semibold">Manage beneficiaries</Link>
      <label className="block text-sm font-medium text-gray-700">Bank<select value={form.bank} onChange={e => change('bank', e.target.value)} className={`${paymentFieldClass} mt-1`} required><option value="">Choose bank</option>{banks.map(bank => <option key={bank}>{bank}</option>)}</select></label>
      <label className="block text-sm font-medium text-gray-700">Account number<input value={form.accountNumber} onChange={e => change('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" pattern="[0-9]{10}" required className={`${paymentFieldClass} mt-1`} /></label>
      <AccountNameField lookup={lookup} />
      <label className="block text-sm font-medium text-gray-700">Amount (NGN)<input type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" value={form.amount} onChange={e => change('amount', e.target.value)} required className={`${paymentFieldClass} mt-1`} /></label>
      <button disabled={!!validation} className="w-full h-12 rounded-xl bg-primary text-white font-semibold disabled:opacity-40">Review transfer</button>
    </form>
    {review && <PaymentReview initial={review} onClose={() => setReview(null)} />}
  </div>;
}
