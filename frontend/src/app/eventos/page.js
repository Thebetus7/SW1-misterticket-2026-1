'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Plus, Music } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import EventoCard from './components/EventoCard';
import EventosFiltros from './components/EventosFiltros';
import EventoModal from './components/EventoModal';
import ArtistasPanel from './components/ArtistasPanel';

export default function EventosPage() {
  const [eventos, setEventos] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [error, setError] = useState(null);

  // Estado del panel de artistas
  const [isArtistasPanelOpen, setIsArtistasPanelOpen] = useState(false);
  const [panelEvento, setPanelEvento] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: ''
  });

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

  const handleFilterChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const handleClearFilters = () => {
    setFiltros({ fecha_desde: '', fecha_hasta: '' });
  };

  // --- Submit Crear/Editar Evento ---
  const handleSubmit = async (formData, asientosAsignados, capacidadTotal) => {
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
      // Recargar datos del evento seleccionado
      const res = await fetchApi(`/eventos/eventos/${selectedEvento.id}/`);
      setSelectedEvento(res);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAgregarZonaEdit = async (nuevaZona) => {
    try {
      await fetchApi(`/eventos/eventos/${selectedEvento.id}/agregar_zona/`, {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevaZona.nombre,
          precio: parseFloat(nuevaZona.precio),
          cantidad_asientos: parseInt(nuevaZona.cantidad_asientos)
        })
      });
      // Recargar datos
      const res = await fetchApi(`/eventos/eventos/${selectedEvento.id}/`);
      setSelectedEvento(res);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Utilidades Modal ---
  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedEvento(null);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (evento) => {
    setIsEditMode(true);
    setSelectedEvento(evento);
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvento(null);
  };

  const openArtistasPanel = (evento) => {
    setPanelEvento(evento);
    setIsArtistasPanelOpen(true);
  };

  const closeArtistasPanel = () => {
    setIsArtistasPanelOpen(false);
    setPanelEvento(null);
  };

  return (
    <AuthGuard allowedRoles={['admin', 'promotor']}>
      <div className="min-h-screen bg-brand-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-100 animate-fade-in-up">
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
          <EventosFiltros 
            filtros={filtros} 
            onChange={handleFilterChange} 
            onClear={handleClearFilters} 
          />

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
              {eventos.map((evento) => (
                <EventoCard 
                  key={evento.id} 
                  evento={evento} 
                  onClick={() => openEditModal(evento)} 
                  onArtistasClick={openArtistasPanel}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal Crear/Editar Evento */}
        <EventoModal 
          isOpen={isModalOpen} 
          isEditMode={isEditMode} 
          evento={selectedEvento} 
          lugares={lugares} 
          onClose={closeModal} 
          onSubmit={handleSubmit} 
          onDeleteZona={handleDeleteZona} 
          onAddZonaEdit={handleAgregarZonaEdit} 
          error={error} 
        />

        {/* Panel Deslizable de Artistas */}
        <ArtistasPanel
          isOpen={isArtistasPanelOpen}
          onClose={closeArtistasPanel}
          evento={panelEvento}
          onUpdate={loadData}
        />

      </div>
    </AuthGuard>
  );
}
