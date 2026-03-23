'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { fetchApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { PackageOpen, PlusCircle } from 'lucide-react';

export default function ProductosPage() {
  const router = useRouter();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!Cookies.get('access_token')) {
      router.push('/login');
      return;
    }
    cargarProductos();
  }, [router]);

  const cargarProductos = async () => {
    try {
      const data = await fetchApi('/productos/');
      setProductos(data);
    } catch (err) {
      if(err.message === 'Given token not valid for any token type') {
        // Token Expirado, podrías manejar el refresh() aquí o deslogear
        Cookies.remove('access_token');
        router.push('/login');
      } else {
         setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-900">Gestión de Productos</h1>
            <p className="text-brand-600 mt-1">Módulo de prueba completo para CRUD con Django. (Solo lectura en esta UI)</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-5 h-5"/> Nuevo Producto
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : error ? (
           <div className="card border-red-200 bg-red-50 text-red-600">Error: {error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productos.length === 0 ? (
               <div className="col-span-full card border-dashed border-2 flex items-center justify-center flex-col text-brand-400 py-16">
                  <PackageOpen className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-brand-500 mb-2">No hay productos ni tickets</p>
                  <p className="text-sm">Agrega uno desde el panel de admin de Django.</p>
               </div>
            ) : (
              productos.map(p => (
                <div key={p.id} className="card hover:shadow-md transition-shadow group cursor-pointer border-brand-200 hover:border-accent/30">
                  <div className="aspect-video bg-brand-100 rounded-lg mb-4 flex items-center justify-center group-hover:bg-accent/5 transition-colors">
                     <PackageOpen className="w-10 h-10 text-brand-300 group-hover:text-accent/50" />
                  </div>
                  <h3 className="font-bold text-xl text-brand-900 mb-1">{p.nombre}</h3>
                  <p className="text-brand-500 text-sm line-clamp-2 mb-3 h-10">{p.descripcion}</p>
                  <div className="flex justify-between items-center mt-auto border-t border-brand-100 pt-3">
                    <span className="font-extrabold text-accent text-lg">Bs. {p.precio}</span>
                    <span className="text-xs bg-brand-100 px-2 py-1 rounded-full text-brand-700 font-medium">Stock: {p.stock}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>
    </div>
  );
}
