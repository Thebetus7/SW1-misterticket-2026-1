'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { fetchApi } from '@/lib/api';
import { Ticket, Lock, User } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('access_token');
    const userString = Cookies.get('user');

    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        const roles = user.roles || [];
        const isAdmin = roles.includes('admin') || user.is_superuser;
        if (isAdmin) {
          router.replace('/dashboard');
        } else if (roles.includes('promotor')) {
          router.replace('/eventos');
        }
      } catch (e) {}
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi('/usuarios/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      
      // Guardado estilo SPA / Laravel Sanctum
      Cookies.set('access_token', data.access, { expires: 1 });
      Cookies.set('refresh_token', data.refresh, { expires: 7 });
      
      if(data.usuario) {
        Cookies.set('user', JSON.stringify(data.usuario));
        const roles = data.usuario.roles || [];
        const isAdmin = roles.includes('admin') || data.usuario.is_superuser;
        if (isAdmin) {
          router.replace('/dashboard');
        } else {
          router.replace('/eventos');
        }
      } else {
        router.replace('/eventos');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 p-4">
      <div className="max-w-md w-full animate-fade-in-up">
        
        <div className="text-center mb-8">
          <div className="inline-flex bg-white p-3 rounded-xl shadow-sm border border-brand-100 mb-4">
            <Ticket className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-extrabold text-brand-900">Bienvenido de Vuelta</h2>
          <p className="text-brand-600 mt-2">Ingresa a tu cuenta para continuar en MisterTicket</p>
        </div>

        <div className="card shadow-xl shadow-brand-200/50">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm text-center">
                {error === 'No active account found with the given credentials' ? 'Credenciales Inválidas' : error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">Nombre de Usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-brand-400" />
                </div>
                <input
                  type="text"
                  required
                  className="input-field pl-10"
                  placeholder="ej. edberto"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-brand-400" />
                </div>
                <input
                  type="password"
                  required
                  className="input-field pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-4 text-lg"
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Botones de pruebas rápidas (Auto-completar y Login) */}
          <div className="mt-6 pt-4 border-t border-brand-100">
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider text-center mb-3">Acceso Rápido (Pruebas)</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin123');
                }}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-300 transition text-left"
              >
                <span className="text-xs font-bold text-brand-800">Superusuario</span>
                <span className="text-[10px] text-brand-500">admin / admin123</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsername('promotor1');
                  setPassword('promotor123');
                }}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-300 transition text-left"
              >
                <span className="text-xs font-bold text-brand-800">Promotor 1</span>
                <span className="text-[10px] text-brand-500">promotor1 / promotor123</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('promotor2');
                  setPassword('promotor123');
                }}
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-300 transition text-left"
              >
                <span className="text-xs font-bold text-brand-800">Promotor 1</span>
                <span className="text-[10px] text-brand-500">promotor1 / promotor123</span>
              </button>
            </div>
          </div>

        </div>
        
        <div className="text-center mt-6">
          <p className="text-brand-600 text-sm">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="text-accent font-semibold hover:underline">
              Regístrate aquí
            </Link>
          </p>
          <div className="mt-4">
            <Link href="/" className="text-brand-500 hover:text-brand-700 text-sm font-medium transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
