import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Plus, Trash2 } from 'lucide-react';

export default function EventoModal({
  isOpen,
  isEditMode,
  evento,
  lugares,
  onClose,
  onSubmit,
  onDeleteZona,
  onAddZonaEdit,
  error: parentError
}) {
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    estado: 'borrador',
    lugar: '',
    fecha_inicio: '',
    hora_inicio: '',
    fecha_fin: '',
    hora_fin: '',
    zonas: []
  });

  const [nuevaZonaEdit, setNuevaZonaEdit] = useState({
    nombre: '',
    precio: '',
    cantidad_asientos: ''
  });
  const [showNuevaZonaEdit, setShowNuevaZonaEdit] = useState(false);

  useEffect(() => {
    setError(parentError);
  }, [parentError]);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && evento) {
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
          zonas: []
        });
      } else {
        setFormData({
          nombre: '',
          estado: 'borrador',
          lugar: '',
          fecha_inicio: '',
          hora_inicio: '',
          fecha_fin: '',
          hora_fin: '',
          zonas: []
        });
      }
      setError(null);
      setShowNuevaZonaEdit(false);
      setNuevaZonaEdit({ nombre: '', precio: '', cantidad_asientos: '' });
    }
  }, [isOpen, isEditMode, evento]);

  if (!isOpen) return null;

  const getLugarCapacidad = (lugarId) => {
    const lugar = lugares.find(l => l.id === parseInt(lugarId));
    return lugar ? lugar.capacidad_total : 0;
  };

  const capacidadTotal = getLugarCapacidad(formData.lugar);
  const asientosAsignados = formData.zonas.reduce((sum, z) => sum + (parseInt(z.cantidad_asientos) || 0), 0);
  const asientosDisponibles = capacidadTotal - asientosAsignados;
  const progresoPorcentaje = capacidadTotal > 0 ? (asientosAsignados / capacidadTotal) * 100 : 0;

  let progressColor = 'bg-green-500';
  if (progresoPorcentaje > 90) progressColor = 'bg-red-500';
  else if (progresoPorcentaje > 70) progressColor = 'bg-yellow-500';

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, asientosAsignados, capacidadTotal);
  };

  const handleAgregarZonaEditLocal = () => {
    if (!nuevaZonaEdit.nombre || !nuevaZonaEdit.precio || !nuevaZonaEdit.cantidad_asientos) return;
    onAddZonaEdit(nuevaZonaEdit);
    setNuevaZonaEdit({ nombre: '', precio: '', cantidad_asientos: '' });
    setShowNuevaZonaEdit(false);
  };

  return (
    <div className="fixed inset-0 bg-brand-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl animate-fade-in-up overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-brand-100 flex justify-between items-center bg-brand-50/50">
          <h2 className="text-2xl font-bold text-brand-900">
            {isEditMode ? 'Editar Evento' : 'Programar Nuevo Evento'}
          </h2>
          <button onClick={onClose} className="text-brand-400 hover:text-brand-700 transition-colors p-2 hover:bg-brand-100 rounded-full">
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
                <input 
                  type="text" 
                  name="nombre" 
                  required 
                  placeholder="Ej. Concierto de Verano 2026" 
                  className="input-mt" 
                  value={formData.nombre} 
                  onChange={handleFormChange} 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-brand-700 mb-2">Lugar (Sede)</label>
                  <select 
                    name="lugar" 
                    required 
                    className="input-mt py-4" 
                    value={formData.lugar} 
                    onChange={handleFormChange} 
                    disabled={isEditMode}
                  >
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
                  <select 
                    name="estado" 
                    className="input-mt py-4" 
                    value={formData.estado} 
                    onChange={handleFormChange}
                  >
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
                    <input 
                      type="date" 
                      required 
                      name="fecha_inicio" 
                      className="input-mt py-3" 
                      value={formData.fecha_inicio} 
                      onChange={handleFormChange} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3"/> Hora de Inicio
                    </label>
                    <input 
                      type="time" 
                      required 
                      name="hora_inicio" 
                      className="input-mt py-3" 
                      value={formData.hora_inicio} 
                      onChange={handleFormChange} 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-brand-600 mb-1">Fecha de Fin</label>
                    <input 
                      type="date" 
                      required 
                      name="fecha_fin" 
                      className="input-mt py-3" 
                      value={formData.fecha_fin} 
                      onChange={handleFormChange} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3"/> Hora de Fin
                    </label>
                    <input 
                      type="time" 
                      required 
                      name="hora_fin" 
                      className="input-mt py-3" 
                      value={formData.hora_fin} 
                      onChange={handleFormChange} 
                    />
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
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${progressColor}`} 
                          style={{ width: `${Math.min(progresoPorcentaje, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {isEditMode && evento && (
                    <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                      <div className="flex justify-between text-sm font-semibold text-brand-800 mb-2">
                        <span>Asientos asignados: {evento.zonas?.reduce((acc, z) => acc + z.capacidad_max, 0) || 0} / {evento.lugar_capacidad || getLugarCapacidad(evento.lugar) || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Zonas Dinámicas (Creación) */}
                  {!isEditMode && formData.zonas.map((zona, index) => (
                    <div key={index} className="card-safe bg-white border border-brand-200 relative">
                      <button 
                        type="button" 
                        onClick={() => removeZonaForm(index)} 
                        className="absolute top-4 right-4 text-brand-300 hover:text-red-500 transition-colors p-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                        <div>
                          <label className="block text-xs font-bold text-brand-600 mb-1">Nombre</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="Ej. VIP" 
                            className="input-mt py-3" 
                            value={zona.nombre} 
                            onChange={(e) => handleZonaChange(index, 'nombre', e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-600 mb-1">Precio (Bs.)</label>
                          <input 
                            type="number" 
                            required 
                            min="0" 
                            step="0.01" 
                            className="input-mt py-3" 
                            value={zona.precio} 
                            onChange={(e) => handleZonaChange(index, 'precio', e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-600 mb-1">Cant. Asientos</label>
                          <input 
                            type="number" 
                            required 
                            min="1" 
                            className={`input-mt py-3 ${asientosDisponibles < 0 ? 'ring-2 ring-red-500' : ''}`}
                            value={zona.cantidad_asientos} 
                            onChange={(e) => handleZonaChange(index, 'cantidad_asientos', e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Zonas Estáticas (Edición) */}
                  {isEditMode && evento && (
                    <div className="space-y-4">
                      {evento.zonas?.map((z) => (
                        <div key={z.id} className="card-safe py-4 flex justify-between items-center bg-white border-brand-200">
                          <div>
                            <p className="font-bold text-brand-900">{z.nombre}</p>
                            <p className="text-sm text-brand-500">{z.precio} Bs. • {z.capacidad_max} Asientos</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => onDeleteZona(z.id)} 
                            className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                          >
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
                                <input 
                                  type="text" 
                                  placeholder="Ej. VIP" 
                                  className="input-mt py-3" 
                                  value={nuevaZonaEdit.nombre} 
                                  onChange={e => setNuevaZonaEdit({...nuevaZonaEdit, nombre: e.target.value})} 
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-brand-600 mb-1">Precio (Bs.)</label>
                                <input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  className="input-mt py-3" 
                                  value={nuevaZonaEdit.precio} 
                                  onChange={e => setNuevaZonaEdit({...nuevaZonaEdit, precio: e.target.value})} 
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-brand-600 mb-1">Cant. Asientos</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  className="input-mt py-3" 
                                  value={nuevaZonaEdit.cantidad_asientos} 
                                  onChange={e => setNuevaZonaEdit({...nuevaZonaEdit, cantidad_asientos: e.target.value})} 
                                />
                              </div>
                           </div>
                           <div className="mt-4 flex gap-2 justify-end">
                              <button 
                                type="button" 
                                onClick={() => setShowNuevaZonaEdit(false)} 
                                className="px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-100 rounded-lg"
                              >
                                Cancelar
                              </button>
                              <button 
                                type="button" 
                                onClick={handleAgregarZonaEditLocal} 
                                className="btn-ticket py-2 px-4 text-sm" 
                                disabled={!nuevaZonaEdit.nombre || !nuevaZonaEdit.precio || !nuevaZonaEdit.cantidad_asientos}
                              >
                                Guardar Zona
                              </button>
                           </div>
                         </div>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => setShowNuevaZonaEdit(true)} 
                          className="w-full py-4 border-2 border-dashed border-brand-300 rounded-2xl text-brand-500 font-bold hover:bg-brand-50 hover:text-accent hover:border-accent transition-all flex items-center justify-center gap-2"
                        >
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
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl font-medium text-brand-600 hover:bg-brand-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="evento-form" 
            disabled={!isEditMode && (asientosDisponibles < 0 || formData.zonas.length === 0)} 
            className="btn-ticket py-2.5 px-8 shadow-lg shadow-accent/20"
          >
            {isEditMode ? 'Actualizar Evento' : 'Guardar Evento'}
          </button>
        </div>

      </div>
    </div>
  );
}
