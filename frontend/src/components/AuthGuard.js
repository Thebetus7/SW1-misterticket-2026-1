'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function AuthGuard({ children, allowedRoles = [] }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = Cookies.get('access_token');
    const userString = Cookies.get('user');

    if (!token || !userString) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(userString);
      const roles = user.roles || [];
      const isAdmin = roles.includes('admin') || user.is_superuser;

      if (isAdmin) {
        setAuthorized(true);
        return;
      }

      const hasRequiredRole = allowedRoles.length === 0 || allowedRoles.some(role => roles.includes(role));

      if (!hasRequiredRole) {
        // Redirigir a su panel por defecto según su rol, o al home si no tiene
        if (roles.includes('promotor')) {
          router.replace('/eventos');
        } else {
          router.replace('/');
        }
      } else {
        setAuthorized(true);
      }
    } catch (e) {
      router.replace('/login');
    }
  }, [router, allowedRoles]);

  // Durante la hidratación (SSR a Cliente), no renderizamos nada para evitar
  // el error "Hydration failed" y el parpadeo constante.
  if (!mounted) {
    return null;
  }

  return authorized ? <>{children}</> : null;
}
