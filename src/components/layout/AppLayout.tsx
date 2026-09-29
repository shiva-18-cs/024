import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-coal-950">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-cil-blue/20 flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 border-2 border-cil-blue border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-coal-400 text-sm">Initializing CoalGuard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-coal-950">
      <Sidebar />
      <TopNav />
      <main
        className="min-h-screen pt-14"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <div className="p-5">
          {children}
        </div>
      </main>
    </div>
  );
}
