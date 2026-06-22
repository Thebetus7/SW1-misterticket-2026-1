'use client';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { User, Settings, ShieldAlert, Activity } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userString = Cookies.get('user');
    if (userString) {
      try {
        setUser(JSON.parse(userString));
      } catch(e){}
    }
  }, []);

  if (!user) return null;

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-brand-50">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-900">Dashboard</h1>
            <p className="text-brand-600 mt-1">Hola {user.first_name || user.username}, mira el estado de tu cuenta.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-brand-200 shadow-sm flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-brand-700">En línea</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card flex items-start gap-4">
            <div className="bg-accent/10 p-3 rounded-lg text-accent">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-brand-500 text-sm font-medium">Nombre de Usuario</p>
              <h3 className="text-xl font-bold text-brand-900">@{user.username}</h3>
            </div>
          </div>
          
          <div className="card flex items-start gap-4">
             <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-brand-500 text-sm font-medium">Roles (Ej. Spatie)</p>
              <div className="flex gap-2 mt-1">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((r, i) => (
                    <span key={i} className="bg-brand-100 text-brand-800 text-xs px-2 py-1 rounded-md font-medium uppercase tracking-wider">{r}</span>
                  ))
                ) : (
                  <span className="text-brand-500 text-sm">Sin rol asignado</span>
                )}
              </div>
            </div>
          </div>

          <div className="card flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-brand-500 text-sm font-medium">Actividad Reciente</p>
              <h3 className="text-xl font-bold text-brand-900">0 Eventos</h3>
            </div>
          </div>
        </div>
        
        <div className="card bg-white h-64 border-dashed border-2 flex items-center justify-center flex-col text-brand-400">
           <Settings className="w-12 h-12 mb-4 opacity-50" />
           <p className="text-lg font-medium">Área de Configuración de Entradas y Pagos P2P construyéndose aquí</p>
        </div>

      </main>
    </div>
    </AuthGuard>
  );
}
