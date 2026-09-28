import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function getRoleDashboardPath(role: string | undefined): string {
  switch (role) {
    case 'CONTRACTOR':
      return '/contractor/dashboard';
    case 'WORKER MANAGEMENT':
      return '/worker-management/dashboard';
    case 'FIELD OFFICER':
      return '/field-officer/dashboard';
    case 'MINE MANAGER':
      return '/mine-manager/dashboard';
    case 'CORPORATE MANAGEMENT':
      return '/corporate/dashboard';
    default:
      return '/login';
  }
}

interface RoleRouteGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function RoleRouteGuard({ children, allowedRoles }: RoleRouteGuardProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-coal-950">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-cil-blue/20 flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 border-2 border-cil-blue border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-coal-400 text-sm">Validating Authorization...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const targetDashboard = getRoleDashboardPath(user.role);
    return <Navigate to={targetDashboard} replace />;
  }

  return <>{children}</>;
}
