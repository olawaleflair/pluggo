import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn, startDemo } = useApp();
  const publicDemo = import.meta.env.VITE_PUBLIC_DEMO === 'true';
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signIn(formData);
      navigate('/');
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in.');
      setIsSubmitting(false);
    }
  };

  async function tryDemo() {
    setError(''); setIsSubmitting(true);
    try { await startDemo(); navigate('/'); }
    catch (failure) { setError(failure.message); setIsSubmitting(false); }
  }
  if (publicDemo) return <div className="min-h-screen auth-bg flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-md glass-panel rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
      <div className="flex items-center gap-3"><Wallet className="w-9 h-9 text-primary" /><span className="text-xl font-bold">PlugGo</span></div>
      <h1 className="text-2xl font-bold text-gray-900">Payments in your own words</h1>
      <p className="text-gray-600">Try a private demo wallet with NGN 157,000. Describe a transfer or airtime payment, review the details, then confirm with demo PIN 1234.</p>
      <button onClick={tryDemo} disabled={isSubmitting} className="w-full min-h-12 rounded-xl bg-primary text-white font-semibold disabled:opacity-50">{isSubmitting ? 'Starting your demo...' : 'Try demo'}</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-gray-500">All payments are simulated. No real money moves or airtime is delivered. Your session lasts 24 hours; saved details are removed after it expires.</p>
      <p className="text-xs text-gray-500">Payment text is sent to Groq for AI interpretation. Bank details are sent to our account lookup provider to retrieve the recipient name. You can use the fictional Thomas beneficiary without providing a real account.</p>
    </div>
  </div>;

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-2xl shadow-xl shadow-gray-200/50 p-6 lg:p-8 relative z-10 animate-slide-up">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-sm text-gray-500">Sign in to continue using PlugGo.</p>
          </div>
        </div>

        <p className="mb-4 rounded-lg bg-primary/10 p-3 text-sm">Portfolio demo · no real payments.<br />Email: olawale@example.com<br />Password: Password123!</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-600 mb-1.5">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-600 mb-1.5">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full h-11 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-sm text-gray-600 text-center">
          New here?{' '}
          <Link to="/signup" className="text-primary font-semibold hover:underline">Create an account</Link>
        </p>

      </div>
    </div>
  );
}
