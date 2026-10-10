import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';
const AppContext = createContext();
export function AppProvider({ children }) {
 const [user, setUser] = useState(null);
 const [transactions, setTransactions] = useState([]);
 const [beneficiaries, setBeneficiaries] = useState([]);
 const [lastPayment, setLastPayment] = useState(null);
 const [isInitializing, setIsInitializing] = useState(true);
 useEffect(() => {
  let active = true;
  async function restore() {
   try {
    if (!getToken()) return;
    const [session, history, saved] = await Promise.all([api('/auth/session'), api('/transactions'), api('/beneficiaries')]);
    if (active) { setUser(session.user); setTransactions(history.transactions); setBeneficiaries(saved.beneficiaries); }
   } catch { /* Leave login available if the session expired or the API is offline. */ }
   finally { if (active) setIsInitializing(false); }
  }
  restore();
  return () => { active = false; };
 }, []);
 async function authenticate(path, credentials) {
  const result = await api(path, credentials);
  setToken(result.token);
  const [history, saved] = await Promise.all([api('/transactions'), api('/beneficiaries')]);
  setUser(result.user); setTransactions(history.transactions); setBeneficiaries(saved.beneficiaries); setLastPayment(null);
  return { success: true };
 }
 async function signOut() {
  await api('/auth/signout', {});
  setToken(null); setUser(null); setTransactions([]); setBeneficiaries([]); setLastPayment(null);
 }
 async function makePayment(payment, path = '/payments') {
  const result = await api(path, payment);
  setUser(result.user); setTransactions(prev => [result.transaction, ...prev.filter(t => t.id !== result.transaction.id)]);
  setLastPayment(result.transaction); return result.transaction;
 }
 async function fundWallet(amount) {
  const result = await api('/wallet/fund', { amount });
  setUser(result.user); setTransactions(prev => [result.transaction, ...prev]);
  return result.user;
 }
 async function saveBeneficiary(item) {
  const result = await api('/beneficiaries/save', item); setBeneficiaries(result.beneficiaries); return result.beneficiary;
 }
 async function deleteBeneficiary(id) {
  const result = await api('/beneficiaries/delete', { id }); setBeneficiaries(result.beneficiaries);
 }
 return <AppContext.Provider value={{ user, transactions, beneficiaries, lastPayment, isInitializing,
  isAuthenticated: Boolean(user), signIn: credentials => authenticate('/auth/signin', credentials),
  signUp: credentials => authenticate('/auth/signup', credentials), signOut, makePayment, fundWallet,
  saveBeneficiary, deleteBeneficiary,
  startDemo: () => authenticate('/auth/demo', {}),
  resetDemo: async () => { const result = await api('/demo/reset', {}); setUser(result.user); setTransactions(result.transactions); setBeneficiaries(result.beneficiaries); setLastPayment(null); },
  preparePayment: text => api('/payment-drafts', { text }),
  confirmPayment: payment => makePayment(payment, '/payments/confirm') }}>
  {children}
 </AppContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);
