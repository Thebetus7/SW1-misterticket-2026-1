'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { Ticket, LogOut, User as UserIcon, Users, Calendar, Home } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tokenVal = Cookies.get('access_token');
    const userString = Cookies.get('user');
    setToken(tokenVal);
    if (userString) {
      try {
        setUser(JSON.parse(userString));
      } catch(e) {}
    }
  }, []);

  const roles = user?.roles || [];
  const isAdmin = roles.includes('admin') || user?.is_superuser;
  const isPromotor = roles.includes('promotor');

  const handleLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user');
    setToken(null);
    setUser(null);
    router.push('/');
  };

  return (
    <nav className="bg-white border-b border-brand-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href={mounted && token ? (isAdmin ? '/dashboard' : '/eventos') : '/'} className="flex items-center gap-2">
              <Ticket className="w-8 h-8 text-accent" />
              <span className="font-bold text-xl tracking-tight text-brand-900">MisterTicket</span>
            </Link>

            {mounted && token && pathname !== '/' && (
              <div className="hidden md:flex items-center gap-6 ml-4">
                {isAdmin && (
                  <Link 
                    href="/dashboard" 
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      pathname === '/dashboard' ? 'text-accent border-b-2 border-accent py-5' : 'text-brand-600 hover:text-accent'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    Inicio
                  </Link>
                )}
                {(isAdmin || isPromotor) && (
                  <Link 
                    href="/eventos" 
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      pathname === '/eventos' ? 'text-accent border-b-2 border-accent py-5' : 'text-brand-600 hover:text-accent'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Eventos
                  </Link>
                )}
                {(isAdmin || isPromotor) && (
                  <Link 
                    href="/verificadores" 
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      pathname === '/verificadores' ? 'text-accent border-b-2 border-accent py-5' : 'text-brand-600 hover:text-accent'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Verificadores
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            {mounted && token ? (
              pathname === '/' ? (
                <Link 
                  href={isAdmin ? '/dashboard' : '/eventos'} 
                  className="btn-primary py-1.5 px-4 text-sm font-semibold tracking-wide shadow-sm"
                >
                  Principal
                </Link>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-brand-800 font-semibold focus:outline-none hover:text-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
                      {user?.username?.substring(0, 2) || 'US'}
                    </div>
                    <span className="hidden sm:inline">{user?.username || 'Usuario'}</span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-brand-200 rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-brand-100">
                        <p className="text-xs text-brand-500 font-semibold uppercase tracking-wider">Rol</p>
                        <p className="text-sm text-brand-800 font-medium capitalize">
                          {isAdmin ? 'Administrador' : isPromotor ? 'Promotor' : roles[0] || 'Usuario'}
                        </p>
                      </div>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 hover:text-red-600 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              mounted && !token && pathname === '/' && (
                <Link href="/login" className="btn-primary py-1.5 px-4 text-sm font-semibold tracking-wide shadow-sm">
                  Ingresar
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
