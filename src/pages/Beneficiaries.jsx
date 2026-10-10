import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAccountLookup } from '../hooks/useAccountLookup';
import AccountNameField from '../components/AccountNameField';
import { accountNameDescription } from '../lib/accountName';
import { banks } from '../lib/paymentIntent';
import { paymentFieldClass } from '../components/PaymentReview';
const empty = { name: '', nickname: '', bank: '', accountNumber: '', recipientName: '' };
export default function Beneficiaries() {
  const { beneficiaries, saveBeneficiary, deleteBeneficiary } = useApp();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const lookup = useAccountLookup(form.bank, form.accountNumber);
  function change(name, value) { setForm(prev => ({ ...prev, [name]: value })); setError(''); setNotice(''); }
  async function save(event) {
    event.preventDefault(); if (busy || !lookup.result) return;
    setBusy(true); setError(''); setNotice('');
    try { await saveBeneficiary({ ...form, ...lookup.result }); setNotice('Beneficiary saved. Use the name or nickname in your dashboard payment request.'); setForm(empty); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await deleteBeneficiary(deleting); if (form.id === deleting) setForm(empty); setDeleting(null); setNotice('Beneficiary deleted. Existing transaction history is unchanged.'); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="max-w-2xl space-y-5">
    <div><h2 className="text-2xl font-bold text-gray-900">Beneficiaries</h2><p className="text-gray-500 mt-1">Save a recipient once, then transfer using a name or nickname.</p><p className="text-sm text-gray-500 mt-2">Account names are looked up automatically. All payments remain simulated.</p></div>
    <form onSubmit={save} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">{form.id ? 'Edit beneficiary' : 'Add beneficiary'}</h3>
      {[[ 'Display name', 'name', 'Thomas' ], [ 'Nickname (optional)', 'nickname', 'my wife' ]].map(([label, name, placeholder]) => <label key={name} className="block text-sm font-medium text-gray-700">{label}<input value={form[name]} onChange={e => change(name, e.target.value)} required={name !== 'nickname'} maxLength={80} placeholder={placeholder} disabled={busy} className={`${paymentFieldClass} mt-1`} /></label>)}
      <label className="block text-sm font-medium text-gray-700">Bank<select value={form.bank} onChange={e => change('bank', e.target.value)} required disabled={busy} className={`${paymentFieldClass} mt-1`}><option value="">Choose bank</option>{banks.map(bank => <option key={bank}>{bank}</option>)}</select></label>
      <label className="block text-sm font-medium text-gray-700">Account number<input value={form.accountNumber} onChange={e => change('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} required disabled={busy} inputMode="numeric" pattern="[0-9]{10}" placeholder="0123456789" className={`${paymentFieldClass} mt-1`} /></label>
      <AccountNameField lookup={lookup} />
      <div className="flex gap-3"><button disabled={busy || !lookup.result} className="flex-1 h-12 bg-primary text-white rounded-xl font-semibold disabled:opacity-40">{busy ? 'Saving...' : 'Save beneficiary'}</button>{form.id && <button type="button" disabled={busy} onClick={() => setForm(empty)} className="px-4 h-12 border rounded-xl">Cancel edit</button>}</div>
    </form>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    {notice && <p role="status" className="text-green-700 text-sm">{notice}</p>}
    <div className="space-y-3">
      {!beneficiaries.length && <p className="text-sm text-gray-500">No beneficiaries yet. Add one above to try a transfer by name.</p>}
      {beneficiaries.map(item => <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <p className="font-semibold text-gray-900">{item.name}{item.nickname ? ` (${item.nickname})` : ''}</p><p className="text-sm text-gray-600">{item.bank} - {item.accountNumber}</p><p className="text-xs text-gray-500">{item.recipientName} - {accountNameDescription(item.accountNameSource)}</p>
        <div className="flex gap-4"><button disabled={busy || !!item.sample} onClick={() => { setForm(item); setError(''); setNotice(''); }} className="text-primary font-semibold text-sm py-2">Edit {item.name}</button><button disabled={busy || !!item.sample} onClick={() => setDeleting(item.id)} className="text-red-600 font-semibold text-sm py-2">Delete {item.name}</button></div>
        {deleting === item.id && <div className="bg-red-50 rounded-lg p-3 text-sm space-y-2"><p>Delete this saved beneficiary?</p><div className="flex gap-4"><button disabled={busy} onClick={remove} className="font-semibold text-red-700 py-2">Confirm delete</button><button disabled={busy} onClick={() => setDeleting(null)} className="py-2">Keep beneficiary</button></div></div>}
      </div>)}
    </div>
  </div>;
}
