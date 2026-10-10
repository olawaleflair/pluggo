import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { banks } from '../lib/paymentIntent';

export function useAccountLookup(bank, accountNumber, initial = null) {
  const key = `${bank}:${accountNumber}`;
  const cached = useRef(initial?.accountResolutionId ? initial : null);
  const [state, setState] = useState(() => {
    const result = initial?.accountResolutionId && initial.accountResolutionExpiresAt > Date.now() ? initial : null;
    return { key: result ? `${result.bank}:${result.accountNumber}` : '', result, error: '' };
  });
  const [attempt, setAttempt] = useState(0);
  const valid = banks.includes(bank) && /^\d{10}$/.test(accountNumber || '');
  useEffect(() => {
    if (!banks.includes(bank) || !/^\d{10}$/.test(accountNumber || '')) return;
    const target = `${bank}:${accountNumber}`;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const previous = cached.current;
      if (previous?.bank === bank && previous.accountNumber === accountNumber && previous.accountResolutionExpiresAt > Date.now()) {
        setState({ key: target, result: previous, error: '' });
        return;
      }
      try {
        const { account } = await api('/accounts/resolve', { bank, accountNumber }, { signal: controller.signal });
        if (active) { cached.current = account; setState({ key: target, result: account, error: '' }); }
      } catch (error) { if (active && error.name !== 'AbortError') setState({ key: target, result: null, error: error.message }); }
    }, 350);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [bank, accountNumber, attempt]);
  useEffect(() => {
    if (!state.result) return;
    const id = state.result.accountResolutionId;
    const timer = setTimeout(() => {
      if (cached.current?.accountResolutionId === id) cached.current = null;
      setState(previous => previous.result?.accountResolutionId === id ? { key: previous.key, result: null, error: '' } : previous);
      setAttempt(value => value + 1);
    }, Math.max(0, state.result.accountResolutionExpiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [state.result]);
  // Ignore a response for an account the user has already changed.
  const result = valid && state.key === key ? state.result : null;
  const error = valid && state.key === key ? state.error : '';
  // A seeded draft also contains amount/type. Only account fields may flow back.
  const account = result ? Object.fromEntries(['bank', 'accountNumber', 'recipientName', 'accountNameSource', 'accountNameResolvedAt', 'accountResolutionId', 'accountResolutionExpiresAt'].map(field => [field, result[field]])) : null;
  return { result: account, error, loading: valid && !result && !error,
    retry: () => { cached.current = null; setState({ key, result: null, error: '' }); setAttempt(value => value + 1); } };
}
