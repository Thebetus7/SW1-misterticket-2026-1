import { Filter } from 'lucide-react';

export default function EventosFiltros({ filtros, onChange, onClear }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-100 animate-fade-in-up">
      <h3 className="text-lg font-semibold text-brand-800 mb-4 flex items-center gap-2">
        <Filter className="w-5 h-5 text-brand-500" />
        Filtros de Búsqueda
      </h3>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-brand-600 mb-1">Desde la fecha</label>
          <input 
            type="date" 
            name="fecha_desde" 
            value={filtros.fecha_desde} 
            onChange={onChange} 
            className="input-mt" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-600 mb-1">Hasta la fecha</label>
          <input 
            type="date" 
            name="fecha_hasta" 
            value={filtros.fecha_hasta} 
            onChange={onChange} 
            className="input-mt" 
          />
        </div>
        <button 
          onClick={onClear} 
          className="px-4 py-2 text-brand-600 hover:text-brand-900 font-medium transition-colors focus:outline-none"
        >
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
}
