'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Ticket, LogOut } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const token = Cookies.get('access_token');
  const userString = Cookies.get('user');
  let user = null;
  try {
    user = userString ? JSON.parse(userString) : null;
  } catch(e) {}

  const handleLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user');
    router.push('/login');
  };

  return (
    <nav className="bg-white border-b border-brand-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <Link href={token ? '/dashboard' : '/'} className="flex items-center gap-2">
              <Ticket className="w-8 h-8 text-accent" />
              <span className="font-bold text-xl tracking-tight text-brand-900">MisterTicket</span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            {token ? (
              <>
                <Link href="/dashboard" className="text-brand-600 hover:text-accent font-medium transition-colors">Inicio</Link>
                <Link href="/eventos" className="text-brand-600 hover:text-accent font-medium transition-colors">Eventos</Link>
                <div className="flex items-center gap-3 border-l border-brand-200 pl-6 ml-2">
                  <span className="text-brand-800 font-semibold">{user?.username || 'Usuario'}</span>
                  <button onClick={handleLogout} className="text-brand-500 hover:text-red-500 transition-colors" title="Cerrar Sesión">
                    <LogOut className="w-5 h-5"/>
                  </button>
                </div>
              </>
            ) : (
              <Link href="/login" className="btn-primary py-1.5 text-sm">Ingresar</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
