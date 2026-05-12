import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar    from './components/Navbar';
import Auth      from './pages/Auth';
import Generate  from './pages/Generate';
import Jobs      from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Gallery   from './pages/Gallery';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="page-loader">
      <div className="dots">
        <span className="dot" style={{ background: '#555' }} />
        <span className="dot" style={{ background: '#555' }} />
        <span className="dot" style={{ background: '#555' }} />
      </div>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={
            <Protected>
              <Navbar />
              <Generate />
            </Protected>
          } />
          <Route path="/gallery" element={
            <Protected>
              <Navbar />
              <Gallery />
            </Protected>
          } />
          <Route path="/jobs" element={
            <Protected>
              <Navbar />
              <Jobs />
            </Protected>
          } />
          <Route path="/jobs/:id" element={
            <Protected>
              <Navbar />
              <JobDetail />
            </Protected>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
