import { MapPin, Calendar, Music } from 'lucide-react';

export default function EventoCard({ evento, onClick, onArtistasClick }) {
  const totalAsientos = evento.zonas?.reduce((sum, z) => sum + z.capacidad_max, 0) || 0;

  return (
    <div 
      onClick={onClick} 
      className="card-safe cursor-pointer group hover:-translate-y-1 transition-transform"
    >
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
          <MapPin className="w-4 h-4 text-brand-400 font-bold" />
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
        <div className="flex flex-col gap-0.5">
          <span>{evento.zonas?.length || 0} zonas configuradas</span>
          <span>{totalAsientos} asientos en total</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArtistasClick(evento);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-brand-900 text-white hover:bg-accent rounded-lg transition-colors font-semibold"
        >
          <Music className="w-3.5 h-3.5" />
          <span>Artistas</span>
        </button>
      </div>
    </div>
  );
}
