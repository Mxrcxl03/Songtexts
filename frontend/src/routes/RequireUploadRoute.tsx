import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router';
import UserService from '../services/user.service';
import type { User } from '../types/user';

export const RequireUploadRoute = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden'>('loading');

  useEffect(() => {
    let alive = true;
    UserService.getCurrentUser()
      .then((user: User | null) => {
        if (!alive) return;
        if (user?.role === 'ADMIN' || user?.uploadApproved) {
          setState('ok');
        } else {
          setState('forbidden');
        }
      })
      .catch(() => alive && setState('forbidden'));

    return () => {
      alive = false;
    };
  }, []);

  if (state === 'loading') return <p>Laedt...</p>;
  if (state === 'forbidden') return <Navigate to="/profile" replace />;
  return children;
};
