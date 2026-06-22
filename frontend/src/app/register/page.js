'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { fetchApi } from '@/lib/api';
import { Lock, User, Mail, UserPlus, BadgeCheck } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
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

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    rol_nombre: 'promotor'
  });
  
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await fetchApi('/usuarios/registro/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      // Una vez registrado exitosamente, llevamos al login
      router.push('/login');
    } catch (err) {
      try {
        const parsed = JSON.parse(err.message);
        const firstKey = Object.keys(parsed)[0];
        const firstError = parsed[firstKey][0];
        
        if (firstKey === 'username' && firstError.includes('already exists')) {
          setError('El nombre de usuario ya está en uso.');
        } else if (firstKey === 'email' && firstError.includes('already exists')) {
          setError('El correo electrónico ya está registrado.');
        } else {
          setError(`${firstKey}: ${firstError}`);
        }
      } catch (parseErr) {
        if (err.message.includes('Unexpected token') || err.message.includes('is not valid JSON')) {
          setError('Error de conexión con el servidor (Ruta no encontrada o 404).');
        } else {
          setError(err.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 p-4">
      <div className="max-w-md w-full animate-fade-in-up py-8">
        
        <div className="text-center mb-8">
          <div className="inline-flex bg-white p-3 rounded-xl shadow-sm border border-brand-100 mb-4">
            <UserPlus className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-extrabold text-brand-900">Crear una Cuenta</h2>
          <p className="text-brand-600 mt-2">Únete a MisterTicket como Promotor</p>
        </div>

        <div className="card shadow-xl shadow-brand-200/50">
          <form onSubmit={handleRegister} className="space-y-4">
            
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Nombre</label>
                <div className="relative">
                  <input
                    type="text"
                    name="first_name"
                    required
                    className="input-field pl-3"
                    placeholder="Juan"
                    value={formData.first_name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Apellido</label>
                <div className="relative">
                  <input
                    type="text"
                    name="last_name"
                    required
                    className="input-field pl-3"
                    placeholder="Pérez"
                    value={formData.last_name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">Nombre de Usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-brand-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  className="input-field pl-10"
                  placeholder="ej. jperez99"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-brand-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  className="input-field pl-10"
                  placeholder="juan@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  required
                  className="input-field pl-10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">Tipo de Cuenta</label>
              <div className="bg-brand-100/50 border border-brand-200 text-brand-800 rounded-lg p-3 text-sm font-semibold capitalize flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-accent" />
                Promotor de Eventos
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-6 text-lg"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
        </div>
        
        <div className="text-center mt-6">
          <p className="text-brand-600 text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="text-accent font-semibold hover:underline">
              Inicia Sesión aquí
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
