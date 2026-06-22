'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { Ticket, Users, ShieldCheck } from 'lucide-react';

export default function Home() {
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
        // Si es un usuario normal/fan, se queda en el Home por ahora,
        // ya que /eventos está protegido solo para admin/promotor.
      } catch (e) {}
    }
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-brand-50 to-brand-100">
      <div className="text-center max-w-3xl space-y-8 animate-fade-in-up">
        
        <div className="flex justify-center mb-6">
          <div className="bg-accent p-4 rounded-2xl shadow-lg ring-4 ring-accent/30">
            <Ticket className="w-16 h-16 text-white" />
          </div>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-brand-900 sm:text-7xl">
          Mister<span className="text-accent">Ticket</span>
        </h1>
        
        <p className="text-xl leading-8 text-brand-700 font-medium">
          La nueva era en experiencia de conciertos. Compra e interacciona sin miedo a los fraudes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12 mb-12">
          <div className="card text-left hover:-translate-y-1 transition-transform">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-accent" />
              <h3 className="font-semibold text-lg">Comunidad</h3>
            </div>
            <p className="text-brand-600">Interactúa, sigue a tus artistas y coordina con amigos antes del gran evento.</p>
          </div>
          
          <div className="card text-left hover:-translate-y-1 transition-transform">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-6 h-6 text-accent" />
              <h3 className="font-semibold text-lg">Cero Fraudes</h3>
            </div>
            <p className="text-brand-600">Verificamos las transacciones y controlamos transferencias P2P de forma transparente.</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-10">
          <Link href="/login" className="btn-primary flex items-center gap-2 text-lg">
            Ingresar a mi cuenta
          </Link>
          <Link href="/register" className="px-6 py-2 rounded-lg font-medium text-brand-700 hover:text-brand-900 hover:bg-brand-200 transition-colors">
            Crear cuenta nueva
          </Link>
        </div>
      </div>
    </main>
  );
}
