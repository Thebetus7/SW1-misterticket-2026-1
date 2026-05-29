'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Calendar, Clock, MapPin, Plus, Filter, X, Music, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function EventosPage() {
  const [eventos, setEventos] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [error, setError] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: ''
  });

  // Formulario de evento
  const [formData, setFormData] = useState({
    nombre: '',
    estado: 'borrador',
    lugar: '',
    fecha_inicio: '',
    hora_inicio: '',
    fecha_fin: '',
    hora_fin: '',
    zonas: [] // Para creación
  });

  // Estado para la nueva zona al editar
  const [nuevaZonaEdit, setNuevaZonaEdit] = useState({
    nombre: '',
    precio: '',
    cantidad_asientos: ''
  });
  const [showNuevaZonaEdit, setShowNuevaZonaEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
      
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      
      const [eventosData, lugaresData] = await Promise.all([
        fetchApi(`/eventos/eventos/${queryStr}`),
        fetchApi('/eventos/lugares/')
      ]);
      
      setEventos(Array.isArray(eventosData) ? eventosData : eventosData.results || []);
      setLugares(Array.isArray(lugaresData) ? lugaresData : lugaresData.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtros]);

  const getLugarCapacidad = (lugarId) => {
    const lugar = lugares.find(l => l.id === parseInt(lugarId));
    return lugar ? lugar.capacidad_total : 0;
  };

  // Calcular asientos
  const capacidadTotal = getLugarCapacidad(formData.lugar);
  const asientosAsignados = formData.zonas.reduce((sum, z) => sum + (parseInt(z.cantidad_asientos) || 0), 0);
  const asientosDisponibles = capacidadTotal - asientosAsignados;
  const progresoPorcentaje = capacidadTotal > 0 ? (asientosAsignados / capacidadTotal) * 100 : 0;

  let progressColor = 'bg-green-500';
  if (progresoPorcentaje > 90) progressColor = 'bg-red-500';
  else if (progresoPorcentaje > 70) progressColor = 'bg-yellow-500';

  const handleFilterChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Manejo de Zonas en Creación ---
  const addZonaForm = () => {
    setFormData({
      ...formData,
      zonas: [...formData.zonas, { nombre: '', precio: '', cantidad_asientos: '' }]
    });
  };

  const removeZonaForm = (index) => {
    const newZonas = [...formData.zonas];
    newZonas.splice(index, 1);
    setFormData({ ...formData, zonas: newZonas });
  };

  const handleZonaChange = (index, field, value) => {
    const newZonas = [...formData.zonas];
    newZonas[index][field] = value;
    setFormData({ ...formData, zonas: newZonas });
  };

  // --- Submit Crear/Editar Evento ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const fInicio = `${formData.fecha_inicio}T${formData.hora_inicio}:00`;
      const fFin = `${formData.fecha_fin}T${formData.hora_fin}:00`;

      if (isEditMode) {
        // En edición, solo se actualiza el evento en sí
        await fetchApi(`/eventos/eventos/${selectedEvento.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            nombre: formData.nombre,
            estado: formData.estado,
            lugar: parseInt(formData.lugar),
            fecha_inicio: fInicio,
            fecha_fin: fFin
          })
        });
      } else {
        // En creación
        if (formData.zonas.length === 0) {
          throw new Error("Debe agregar al menos una zona.");
        }
        if (asientosAsignados > capacidadTotal) {
          throw new Error("La cantidad de asientos supera la capacidad del lugar.");
        }

        // Parse numerics
        const payloadZonas = formData.zonas.map(z => ({
          nombre: z.nombre,
          precio: parseFloat(z.precio),
          cantidad_asientos: parseInt(z.cantidad_asientos)
        }));

        await fetchApi('/eventos/eventos/', {
          method: 'POST',
          body: JSON.stringify({
            nombre: formData.nombre,
            estado: formData.estado,
            lugar: parseInt(formData.lugar),
            fecha_inicio: fInicio,
            fecha_fin: fFin,
            zonas: payloadZonas
          })
        });
      }
      
      closeModal();
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  // --- Manejo de Zonas en Edición ---
  const handleDeleteZona = async (zonaId) => {
    if (!confirm('¿Seguro que deseas eliminar esta zona y todos sus asientos? Esta acción no se puede deshacer.')) return;
    try {
      await fetchApi(`/eventos/eventos/${selectedEvento.id}/eliminar_zona/${zonaId}/`, {
        method: 'DELETE'
      });
      // Recargar datos
      const res = await fetchApi(`/eventos/eventos/${selectedEvento.id}/`);
      setSelectedEvento(res);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAgregarZonaEdit = async () => {
    try {
      await fetchApi(`/eventos/eventos/${selectedEvento.id}/agregar_zona/`, {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevaZonaEdit.nombre,
          precio: parseFloat(nuevaZonaEdit.precio),
          cantidad_asientos: parseInt(nuevaZonaEdit.cantidad_asientos)
        })
      });
      setNuevaZonaEdit({ nombre: '', precio: '', cantidad_asientos: '' });
      setShowNuevaZonaEdit(false);
      // Recargar datos
      const res = await fetchApi(`/eventos/eventos/${selectedEvento.id}/`);
      setSelectedEvento(res);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Utilidades ---
  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedEvento(null);
    setFormData({
      nombre: '', estado: 'borrador', lugar: '',
      fecha_inicio: '', hora_inicio: '', fecha_fin: '', hora_fin: '',
      zonas: []
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (evento) => {
    setIsEditMode(true);
    setSelectedEvento(evento);
    
    // Parse fechas
    const fInit = evento.fecha_inicio ? new Date(evento.fecha_inicio) : null;
    const fEnd = evento.fecha_fin ? new Date(evento.fecha_fin) : null;

    setFormData({
      nombre: evento.nombre,
      estado: evento.estado,
      lugar: evento.lugar,
      fecha_inicio: fInit ? fInit.toISOString().split('T')[0] : '',
      hora_inicio: fInit ? fInit.toTimeString().slice(0, 5) : '',
      fecha_fin: fEnd ? fEnd.toISOString().split('T')[0] : '',
      hora_fin: fEnd ? fEnd.toTimeString().slice(0, 5) : '',
      zonas: [] // En edit mode, listamos zonas directamente de selectedEvento
    });
    setError(null);
    setShowNuevaZonaEdit(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvento(null);
  };

  return (
    <div className="min-h-screen bg-brand-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-100">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-900 flex items-center gap-3">
              <Music className="text-accent w-8 h-8" />
              Mis Eventos
            </h1>
            <p className="text-brand-600 mt-1">Gestiona los eventos musicales que estás organizando.</p>
          </div>
          <button onClick={openCreateModal} className="btn-ticket flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Crear Nuevo Evento
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-100">
          <h3 className="text-lg font-semibold text-brand-800 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-500" />
            Filtros de Búsqueda
          </h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-brand-600 mb-1">Desde la fecha</label>
              <input type="date" name="fecha_desde" value={filtros.fecha_desde} onChange={handleFilterChange} className="input-mt" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-600 mb-1">Hasta la fecha</label>
              <input type="date" name="fecha_hasta" value={filtros.fecha_hasta} onChange={handleFilterChange} className="input-mt" />
            </div>
            <button onClick={() => setFiltros({fecha_desde: '', fecha_hasta: ''})} className="px-4 py-2 text-brand-600 hover:text-brand-900 font-medium transition-colors">
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Lista de Eventos */}
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : eventos.length === 0 ? (
          <div className="text-center p-16 bg-white rounded-2xl border border-brand-100 shadow-sm">
            <Music className="w-16 h-16 text-brand-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-700">No hay eventos</h3>
            <p className="text-brand-500 mt-2">No se encontraron eventos con los filtros actuales o aún no has creado ninguno.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos.map((evento) => {
              const totalAsientos = evento.zonas?.reduce((sum, z) => sum + z.capacidad_max, 0) || 0;
              return (
                <div key={evento.id} onClick={() => openEditModal(evento)} className="card-safe cursor-pointer group hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-brand-900 group-hover:text-accent transition-colors line-clamp-2">
                      {evento.nombre}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      evento.estado === 'publicado' ? 'bg-green-100 text-green-700' : 
                      evento.estado === 'borrador' ? 'bg-yellow-100 text-yellow-700' : 'bg-brand-100 text-brand-700'
                    }`}>
                      {evento.estado.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm text-brand-600 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-400" />
                      <span className="truncate">{evento.lugar_nombre || 'Sin lugar asignado'}</span>
                    </div>
                    {evento.fecha_inicio && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-400" />
                        <span>
                          {new Date(evento.fecha_inicio).toLocaleDateString()} al {new Date(evento.fecha_fin).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {evento.zonas?.map(z => (
                      <span key={z.id} className="bg-brand-100 text-brand-700 text-xs px-2 py-1 rounded-md font-medium">
                        {z.nombre} · {z.capacidad_max}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-brand-50 flex justify-between items-center text-xs font-medium text-brand-400">
                    <span>{evento.zonas?.length || 0} zonas configuradas</span>
                    <span>{totalAsientos} asientos en total</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-brand-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl animate-fade-in-up overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-brand-100 flex justify-between items-center bg-brand-50/50">
              <h2 className="text-2xl font-bold text-brand-900">
                {isEditMode ? 'Editar Evento' : 'Programar Nuevo Evento'}
              </h2>
              <button onClick={closeModal} className="text-brand-400 hover:text-brand-700 transition-colors p-2 hover:bg-brand-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="evento-form" onSubmit={handleSubmit} className="space-y-8">
                
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* Sección 1: Datos Generales */}
                <div className="space-y-4">
                  <h3 className="font-bold text-brand-800 text-lg border-b border-brand-100 pb-2">Datos Generales</h3>
                  <div>
                    <label className="block text-sm font-semibold text-brand-700 mb-2">Nombre del Evento</label>
                    <input type="text" name="nombre" required placeholder="Ej. Concierto de Verano 2026" className="input-mt" value={formData.nombre} onChange={handleFormChange} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-brand-700 mb-2">Lugar (Sede)</label>
                      <select name="lugar" required className="input-mt py-4" value={formData.lugar} onChange={handleFormChange} disabled={isEditMode}>
                        <option value="">Selecciona un lugar</option>
                        {lugares.map(l => (
                          <option key={l.id} value={l.id}>{l.nombre} (Cap: {l.capacidad_total})</option>
                        ))}
                      </select>
                      {formData.lugar && !isEditMode && (
                         <p className="text-xs text-brand-500 mt-2">Capacidad máxima del lugar: {capacidadTotal} asientos.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-brand-700 mb-2">Estado Inicial</label>
                      <select name="estado" className="input-mt py-4" value={formData.estado} onChange={handleFormChange}>
                        <option value="borrador">Borrador</option>
                        <option value="publicado">Publicado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sección 2: Fechas y Horarios */}
                <div className="space-y-4">
                  <h3 className="font-bold text-brand-800 text-lg border-b border-brand-100 pb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent" /> Fechas y Horarios
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-brand-600 mb-1">Fecha de Inicio</label>
                        <input type="date" required name="fecha_inicio" className="input-mt py-3" value={formData.fecha_inicio} onChange={handleFormChange} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brand-600 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Hora de Inicio</label>
                        <input type="time" required name="hora_inicio" className="input-mt py-3" value={formData.hora_inicio} onChange={handleFormChange} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-brand-600 mb-1">Fecha de Fin</label>
                        <input type="date" required name="fecha_fin" className="input-mt py-3" value={formData.fecha_fin} onChange={handleFormChange} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brand-600 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Hora de Fin</label>
                        <input type="time" required name="hora_fin" className="input-mt py-3" value={formData.hora_fin} onChange={handleFormChange} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección 3: Zonas */}
                <div className="space-y-4">
                  <h3 className="font-bold text-brand-800 text-lg border-b border-brand-100 pb-2">Configuración de Zonas</h3>
                  
                  {formData.lugar ? (
                    <>
                      {/* Progreso de Capacidad */}
                      {!isEditMode && (
                        <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                          <div className="flex justify-between text-sm font-semibold text-brand-800 mb-2">
                            <span>Asientos asignados: {asientosAsignados} / {capacidadTotal}</span>
                            <span className={asientosDisponibles < 0 ? 'text-red-500' : 'text-brand-500'}>
                              Restantes: {asientosDisponibles}
                            </span>
                          </div>
                          <div className="w-full bg-brand-200 rounded-full h-3 overflow-hidden">
                            <div className={`h-3 rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${Math.min(progresoPorcentaje, 100)}%` }}></div>
                          </div>
                        </div>
                      )}

                      {isEditMode && selectedEvento && (
                        <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                          <div className="flex justify-between text-sm font-semibold text-brand-800 mb-2">
                            <span>Asientos asignados: {selectedEvento.zonas.reduce((acc, z) => acc + z.capacidad_max, 0)} / {selectedEvento.lugar?.capacidad_total || 0}</span>
                          </div>
                        </div>
                      )}

                      {/* Zonas Dinámicas (Creación) */}
                      {!isEditMode && formData.zonas.map((zona, index) => (
                        <div key={index} className="card-safe bg-white border border-brand-200 relative">
                          <button type="button" onClick={() => removeZonaForm(index)} className="absolute top-4 right-4 text-brand-300 hover:text-red-500 transition-colors p-2">
                            <X className="w-5 h-5" />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                            <div>
                              <label className="block text-xs font-bold text-brand-600 mb-1">Nombre</label>
                              <input type="text" required placeholder="Ej. VIP" className="input-mt py-3" value={zona.nombre} onChange={(e) => handleZonaChange(index, 'nombre', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-brand-600 mb-1">Precio (Bs.)</label>
                              <input type="number" required min="0" step="0.01" className="input-mt py-3" value={zona.precio} onChange={(e) => handleZonaChange(index, 'precio', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-brand-600 mb-1">Cant. Asientos</label>
                              <input 
                                type="number" 
                                required min="1" 
                                className={`input-mt py-3 ${asientosDisponibles < 0 ? 'ring-2 ring-red-500' : ''}`}
                                value={zona.cantidad_asientos} 
                                onChange={(e) => handleZonaChange(index, 'cantidad_asientos', e.target.value)} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Zonas Estáticas (Edición) */}
                      {isEditMode && selectedEvento && (
                        <div className="space-y-4">
                          {selectedEvento.zonas.map((z) => (
                            <div key={z.id} className="card-safe py-4 flex justify-between items-center bg-white border-brand-200">
                              <div>
                                <p className="font-bold text-brand-900">{z.nombre}</p>
                                <p className="text-sm text-brand-500">{z.precio} Bs. • {z.capacidad_max} Asientos</p>
                              </div>
                              <button type="button" onClick={() => handleDeleteZona(z.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                          
                          {/* Agregar Nueva Zona en Edición */}
                          {showNuevaZonaEdit ? (
                             <div className="card-safe bg-brand-50 border border-brand-200">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold text-brand-600 mb-1">Nombre</label>
                                    <input type="text" placeholder="Ej. VIP" className="input-mt py-3" value={nuevaZonaEdit.nombre} onChange={e => setNuevaZonaEdit({...nuevaZonaEdit, nombre: e.target.value})} />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-brand-600 mb-1">Precio (Bs.)</label>
                                    <input type="number" min="0" step="0.01" className="input-mt py-3" value={nuevaZonaEdit.precio} onChange={e => setNuevaZonaEdit({...nuevaZonaEdit, precio: e.target.value})} />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-brand-600 mb-1">Cant. Asientos</label>
                                    <input type="number" min="1" className="input-mt py-3" value={nuevaZonaEdit.cantidad_asientos} onChange={e => setNuevaZonaEdit({...nuevaZonaEdit, cantidad_asientos: e.target.value})} />
                                  </div>
                               </div>
                               <div className="mt-4 flex gap-2 justify-end">
                                  <button type="button" onClick={() => setShowNuevaZonaEdit(false)} className="px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-100 rounded-lg">Cancelar</button>
                                  <button type="button" onClick={handleAgregarZonaEdit} className="btn-ticket py-2 px-4 text-sm" disabled={!nuevaZonaEdit.nombre || !nuevaZonaEdit.precio || !nuevaZonaEdit.cantidad_asientos}>Guardar Zona</button>
                               </div>
                             </div>
                          ) : (
                            <button type="button" onClick={() => setShowNuevaZonaEdit(true)} className="w-full py-4 border-2 border-dashed border-brand-300 rounded-2xl text-brand-500 font-bold hover:bg-brand-50 hover:text-accent hover:border-accent transition-all flex items-center justify-center gap-2">
                              <Plus className="w-5 h-5" /> Añadir Nueva Zona
                            </button>
                          )}
                        </div>
                      )}

                      {!isEditMode && (
                        <button 
                          type="button" 
                          onClick={addZonaForm} 
                          disabled={asientosDisponibles <= 0}
                          className="w-full py-4 border-2 border-dashed border-brand-300 rounded-2xl text-brand-500 font-bold hover:bg-brand-50 hover:text-accent hover:border-accent transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-5 h-5" /> Añadir Zona
                        </button>
                      )}

                    </>
                  ) : (
                    <p className="text-sm text-brand-500 bg-brand-50 p-4 rounded-xl border border-brand-100">
                      Debes seleccionar un lugar primero para poder configurar las zonas y capacidades.
                    </p>
                  )}
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-brand-100 bg-brand-50/50 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-xl font-medium text-brand-600 hover:bg-brand-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="evento-form" disabled={!isEditMode && (asientosDisponibles < 0 || formData.zonas.length === 0)} className="btn-ticket py-2.5 px-8 shadow-lg shadow-accent/20">
                {isEditMode ? 'Actualizar Evento' : 'Guardar Evento'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
