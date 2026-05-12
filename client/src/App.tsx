import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar    from './components/Navbar';
import Auth      from './pages/Auth';
import Generate  from './pages/Generate';
import Jobs      from './pages/Jobs';
import JobDetail from './pages/JobDetail';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex gap-1">
        <span className="pulse-dot w-1.5 h-1.5 bg-neutral-600 rounded-full block" />
        <span className="pulse-dot w-1.5 h-1.5 bg-neutral-600 rounded-full block" />
        <span className="pulse-dot w-1.5 h-1.5 bg-neutral-600 rounded-full block" />
      </div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={
            <Protected><Layout><Generate /></Layout></Protected>
          } />
          <Route path="/jobs" element={
            <Protected><Layout><Jobs /></Layout></Protected>
          } />
          <Route path="/jobs/:id" element={
            <Protected><Layout><JobDetail /></Layout></Protected>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
