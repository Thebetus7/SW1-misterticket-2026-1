import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Star, Calendar, Music, MapPin, Award } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ArtistasPanel({ isOpen, onClose, evento, onUpdate }) {
  const [artistasDisponibles, setArtistasDisponibles] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Formulario
  const [selectedArtistaId, setSelectedArtistaId] = useState('');
  const [ordenAparicion, setOrdenAparicion] = useState('1');
  const [tiempoInicio, setTiempoInicio] = useState('');

  // Cargar artistas disponibles y presentaciones actuales
  useEffect(() => {
    if (isOpen && evento) {
      loadPresentaciones();
      loadArtistas();
      // Inicializar tiempo_inicio con la fecha de inicio del evento
      if (evento.fecha_inicio) {
        const localDate = new Date(evento.fecha_inicio).toISOString().slice(0, 16);
        setTiempoInicio(localDate);
      }
    }
  }, [isOpen, evento]);

  const loadPresentaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi(`/eventos/presentaciones/?evento=${evento.id}`);
      // Ordenar por orden de aparición
      const sorted = (Array.isArray(data) ? data : data.results || []).sort(
        (a, b) => a.orden_aparicion - b.orden_aparicion
      );
      setPresentaciones(sorted);
      // Auto-incrementar el siguiente orden de aparición sugerido
      if (sorted.length > 0) {
        const maxOrden = Math.max(...sorted.map(p => p.orden_aparicion));
        setOrdenAparicion((maxOrden + 1).toString());
      } else {
        setOrdenAparicion('1');
      }
    } catch (err) {
      setError('Error al cargar las presentaciones de los artistas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadArtistas = async () => {
    try {
      const data = await fetchApi('/usuarios/artistas/');
      setArtistasDisponibles(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error al cargar artistas:', err);
    }
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    if (!selectedArtistaId) {
      alert('Por favor selecciona un artista.');
      return;
    }
    if (!tiempoInicio) {
      alert('Por favor selecciona la fecha y hora de inicio de la presentación.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Formatear fecha para Django (ISO)
      const formattedDate = new Date(tiempoInicio).toISOString();

      await fetchApi('/eventos/presentaciones/', {
        method: 'POST',
        body: JSON.stringify({
          evento: evento.id,
          artista: parseInt(selectedArtistaId),
          orden_aparicion: parseInt(ordenAparicion),
          tiempo_inicio: formattedDate
        })
      });

      // Resetear formulario
      setSelectedArtistaId('');
      
      // Recargar presentaciones
      await loadPresentaciones();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Error al vincular el artista: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDesvincular = async (presentacionId) => {
    if (!confirm('¿Seguro que deseas desvincular a este artista del evento?')) return;

    try {
      await fetchApi(`/eventos/presentaciones/${presentacionId}/`, {
        method: 'DELETE'
      });
      // Recargar presentaciones
      await loadPresentaciones();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Error al desvincular al artista: ' + err.message);
    }
  };

  // Filtrar artistas que no estén ya vinculados
  const artistasFiltrados = artistasDisponibles.filter(
    art => !presentaciones.some(p => p.artista === art.id)
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-brand-100">
        
        {/* Header */}
        <div className="p-6 border-b border-brand-100 flex justify-between items-center bg-brand-900 text-white">
          <div>
            <span className="text-xs font-semibold text-accent bg-accent/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Gestión de Elenco
            </span>
            <h2 className="text-xl font-bold mt-1 truncate max-w-[320px] md:max-w-[400px]">
              {evento?.nombre}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-brand-800 hover:bg-brand-700 transition-colors text-brand-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-brand-50/30">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-start gap-3">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Formulario Vincular Artista */}
          <div className="bg-white p-5 rounded-2xl border border-brand-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-brand-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent" />
              Vincular Artista al Escenario
            </h3>

            <form onSubmit={handleVincular} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-500 uppercase tracking-wider mb-1">
                  Artista
                </label>
                <select
                  value={selectedArtistaId}
                  onChange={(e) => setSelectedArtistaId(e.target.value)}
                  className="w-full rounded-xl border border-brand-200 p-2.5 text-sm bg-white text-brand-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  required
                >
                  <option value="">Selecciona un artista de la lista...</option>
                  {artistasFiltrados.map((art) => (
                    <option key={art.id} value={art.id}>
                      {art.nombre_artistico} (Pop: {art.popularidad} · {art.departamento_origen_nombre || 'N/A'})
                    </option>
                  ))}
                </select>
                {artistasFiltrados.length === 0 && artistasDisponibles.length > 0 && (
                  <p className="text-xs text-brand-400 mt-1">Todos los artistas ya están vinculados a este evento.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-500 uppercase tracking-wider mb-1">
                    Orden de Aparición
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ordenAparicion}
                    onChange={(e) => setOrdenAparicion(e.target.value)}
                    className="w-full rounded-xl border border-brand-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-500 uppercase tracking-wider mb-1">
                    Tiempo de Inicio
                  </label>
                  <input
                    type="datetime-local"
                    value={tiempoInicio}
                    onChange={(e) => setTiempoInicio(e.target.value)}
                    className="w-full rounded-xl border border-brand-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-ticket py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50 transition-all font-semibold"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Music className="w-4 h-4" />
                    <span>Agregar al Evento</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Lista de Presentaciones */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-brand-900 flex items-center gap-2">
              <Music className="w-4 h-4 text-accent" />
              Cronograma de Presentaciones ({presentaciones.length})
            </h3>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : presentaciones.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-brand-100 shadow-sm p-6 text-brand-500 space-y-2">
                <Music className="w-12 h-12 text-brand-200 mx-auto" />
                <h4 className="font-bold text-brand-700">Sin elenco registrado</h4>
                <p className="text-xs">Aún no se han añadido artistas para presentarse en este concierto.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {presentaciones.map((p) => (
                  <div 
                    key={p.id} 
                    className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 hover:border-brand-200 transition-all flex flex-col md:flex-row gap-4 relative overflow-hidden group"
                  >
                    {/* Badge del orden en la esquina */}
                    <div className="absolute top-0 left-0 bg-brand-900 text-white font-extrabold px-3.5 py-1.5 rounded-br-2xl text-sm z-10">
                      #{p.orden_aparicion}
                    </div>

                    <div className="flex-1 space-y-3 pt-3 md:pt-0">
                      {/* Nombre y Popularidad */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-lg font-bold text-brand-900 group-hover:text-accent transition-colors pl-6 md:pl-0">
                          {p.artista_nombre}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-bold border border-yellow-200">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-500" />
                          <span>Popularidad: {p.artista_popularidad}%</span>
                        </div>
                      </div>

                      {/* Detalles: Departamento, Géneros */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand-500 font-medium">
                        {p.artista_departamento_origen && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-brand-400" />
                            <span>Origen: {p.artista_departamento_origen}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-brand-400" />
                          <span>
                            Presentación: {new Date(p.tiempo_inicio).toLocaleDateString()} a las {new Date(p.tiempo_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>

                      {/* Géneros */}
                      {p.artista_generos && p.artista_generos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {p.artista_generos.map((gen, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                            >
                              {gen}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Biografía */}
                      {p.artista_biografia && (
                        <p className="text-xs text-brand-600 line-clamp-3 bg-brand-50/50 p-2.5 rounded-xl border border-brand-100/50 leading-relaxed">
                          {p.artista_biografia}
                        </p>
                      )}
                    </div>

                    {/* Acción de desvincular */}
                    <div className="flex items-center justify-end border-t md:border-t-0 md:border-l border-brand-100 pt-3 md:pt-0 md:pl-4">
                      <button
                        onClick={() => handleDesvincular(p.id)}
                        className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center gap-1.5 w-full md:w-auto"
                        title="Desvincular artista"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs font-bold md:hidden">Desvincular Artista</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
