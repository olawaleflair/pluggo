import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Airtime from './pages/Airtime';
import Data from './pages/Data';
import Electricity from './pages/Electricity';
import CableTV from './pages/CableTV';
import Internet from './pages/Internet';
import Water from './pages/Water';
import Transactions from './pages/Transactions';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Transfer from './pages/Transfer';
import Beneficiaries from './pages/Beneficiaries';

function ProtectedAppLayout() {
  const { isAuthenticated, isInitializing } = useApp();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useApp();
  if (isInitializing) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={import.meta.env.VITE_PUBLIC_DEMO === 'true' ? <Navigate to="/signin" replace /> : <SignUp />} />
          </Route>

          <Route element={<ProtectedAppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/airtime" element={<Airtime />} />
            <Route path="/data" element={<Data />} />
            <Route path="/electricity" element={<Electricity />} />
            <Route path="/cable" element={<CableTV />} />
            <Route path="/internet" element={<Internet />} />
            <Route path="/water" element={<Water />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/beneficiaries" element={<Beneficiaries />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
