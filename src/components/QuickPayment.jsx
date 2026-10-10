import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import PaymentReview from './PaymentReview';
import PaymentSetup from './PaymentSetup';
import { needsPaymentSetup } from '../lib/paymentIntent';

export default function QuickPayment() {
  const { user, preparePayment } = useApp();
  const [text, setText] = useState('');
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const [mode, setMode] = useState('loading');
  useEffect(() => {
    let active = true;
    api('/payment-assistant').then(result => { if (active) setMode(result.mode); }).catch(() => { if (active) setMode('unknown'); });
    return () => { active = false; };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try { const result = await preparePayment(text); setDraft(result.draft); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); busy.current = false; }
  }
  return <section className="bg-primary/5 rounded-2xl border border-primary/20 p-4 sm:p-5">
    <div className="flex items-center gap-2 mb-1"><MessageSquare className="w-4 h-4 text-primary shrink-0" /><h3 className="text-base font-bold text-gray-900">What would you like to do?</h3></div>
    <p id="payment-request-help" className="text-xs text-gray-500 mb-3">Transfers and airtime, in your own words.</p>
    <p className="text-xs text-gray-500 mb-3">{mode === 'ai' ? 'AI helps fill your payment form. Your request is sent to our AI provider. Payments remain simulated.' : mode === 'local' ? 'Local parser active. AI is not connected yet.' : mode === 'loading' ? 'Checking payment assistant...' : 'Describe one payment, then check the details.'}</p>
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="payment-request" className="sr-only">Describe your payment</label>
      <div className="flex gap-2 items-start">
        <textarea id="payment-request" rows={1} maxLength={500} value={text} disabled={loading} onChange={e => { setText(e.target.value); setError(''); }} placeholder="Send 5k to OPay 0000000000" aria-describedby="payment-request-help" className="flex-1 min-w-0 min-h-12 rounded-xl border border-gray-200 bg-white p-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y text-gray-900" />
        <button aria-label="Review payment" disabled={!text.trim() || loading} className="h-12 w-12 sm:w-auto sm:px-4 shrink-0 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"><span className="hidden sm:inline">{loading ? 'Preparing...' : 'Review'}</span><ArrowRight className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} /></button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
    <p className="text-xs text-gray-500 mt-3">You can also use a saved beneficiary: Send 5k to Thomas{user.demo ? ", or send 5k to my wife" : ""}.</p>
    {draft && (needsPaymentSetup(draft) ? <PaymentSetup initial={draft} onReady={setDraft} onClose={() => setDraft(null)} /> : <PaymentReview initial={draft} onClose={() => setDraft(null)} />)}
  </section>;
}
