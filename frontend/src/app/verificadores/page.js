'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Users, Plus, Trash2, X, User, Mail, Lock, UserCheck } from 'lucide-react';
import Cookies from 'js-cookie';
import AuthGuard from '@/components/AuthGuard';

export default function VerificadoresPage() {
  const [verificadores, setVerificadores] = useState([]);
  const [promotores, setPromotores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    promotor: '',
    estado: 'activo'
  });

  useEffect(() => {
    const userString = Cookies.get('user');
    if (userString) {
      try {
        setCurrentUser(JSON.parse(userString));
      } catch (e) {}
    }
  }, []);

  const roles = currentUser?.roles || [];
  const isAdmin = roles.includes('admin') || currentUser?.is_superuser;

  const loadData = async () => {
    setLoading(true);
    try {
      const verificadoresData = await fetchApi('/usuarios/verificadores/');
      setVerificadores(verificadoresData || []);

      if (isAdmin) {
        const promotoresData = await fetchApi('/usuarios/promotores/');
        setPromotores(promotoresData || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      promotor: isAdmin ? '' : (currentUser?.perfil_promotor?.id || ''),
      estado: 'activo'
    });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        estado: formData.estado
      };

      if (isAdmin) {
        if (!formData.promotor) {
          throw new Error("Debe seleccionar un promotor para este verificador.");
        }
        payload.promotor = parseInt(formData.promotor);
      }

      await fetchApi('/usuarios/verificadores/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      closeModal();
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este verificador? Esto suspenderá su cuenta y perfil (soft delete).')) return;
    try {
      await fetchApi(`/usuarios/verificadores/${id}/`, {
        method: 'DELETE'
      });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleVerificadorEstado = async (verificador) => {
    const nuevoEstado = verificador.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await fetchApi(`/usuarios/verificadores/${verificador.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: nuevoEstado })
      });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AuthGuard allowedRoles={['admin', 'promotor']}>
      <div className="min-h-screen bg-brand-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-100 animate-fade-in-up">
            <div>
              <h1 className="text-3xl font-extrabold text-brand-900 flex items-center gap-3">
                <Users className="text-accent w-8 h-8" />
                Equipo de Verificadores
              </h1>
              <p className="text-brand-600 mt-1">
                {isAdmin
                  ? 'Gestiona y supervisa a todos los verificadores de la plataforma.'
                  : 'Crea y administra tus verificadores autorizados para escanear tickets.'}
              </p>
            </div>
            <button onClick={openCreateModal} className="btn-ticket flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Verificador
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : verificadores.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-2xl border border-brand-100 shadow-sm animate-fade-in-up">
              <Users className="w-16 h-16 text-brand-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-brand-700">No hay verificadores</h3>
              <p className="text-brand-500 mt-2">Aún no has agregado verificadores a tu equipo.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden animate-fade-in-up">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-brand-200">
                  <thead className="bg-brand-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-500 uppercase tracking-wider">Verificador</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-500 uppercase tracking-wider">Email</th>
                      {isAdmin && (
                        <th className="px-6 py-4 text-left text-xs font-bold text-brand-500 uppercase tracking-wider">Promotor</th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-bold text-brand-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-brand-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-100">
                    {verificadores.map((verif) => (
                      <tr key={verif.id} className="hover:bg-brand-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
                              {verif.usuario_first_name?.substring(0, 1) || verif.usuario_username?.substring(0, 1) || 'V'}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-brand-900">
                                {verif.usuario_first_name ? `${verif.usuario_first_name} ${verif.usuario_last_name || ''}`.trim() : 'Sin nombre'}
                              </div>
                              <div className="text-xs text-brand-500">@{verif.usuario_username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-600">
                          {verif.usuario_email || 'Sin correo'}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-700 font-medium">
                            {verif.promotor_razon || 'No asignado'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleVerificadorEstado(verif)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold select-none transition-all ${
                              verif.estado === 'activo'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {verif.estado.toUpperCase()}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => handleDelete(verif.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Eliminar Verificador"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-brand-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-fade-in-up overflow-hidden flex flex-col">
              <div className="p-6 border-b border-brand-100 flex justify-between items-center bg-brand-50/50">
                <h2 className="text-2xl font-bold text-brand-900 flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-accent" />
                  Nuevo Verificador
                </h2>
                <button onClick={closeModal} className="text-brand-400 hover:text-brand-700 transition-colors p-2 hover:bg-brand-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm text-center font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-700 mb-1">Nombre</label>
                    <input type="text" name="first_name" required className="input-mt py-2 text-sm" placeholder="Juan" value={formData.first_name} onChange={handleFormChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-700 mb-1">Apellido</label>
                    <input type="text" name="last_name" required className="input-mt py-2 text-sm" placeholder="Pérez" value={formData.last_name} onChange={handleFormChange} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-700 mb-1">Nombre de Usuario</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-brand-450" />
                    </div>
                    <input type="text" name="username" required className="input-mt pl-9 py-2 text-sm" placeholder="verificador_juan" value={formData.username} onChange={handleFormChange} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-700 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-brand-450" />
                    </div>
                    <input type="email" name="email" required className="input-mt pl-9 py-2 text-sm" placeholder="juan@verificadores.com" value={formData.email} onChange={handleFormChange} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-700 mb-1">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-brand-450" />
                    </div>
                    <input type="password" name="password" required className="input-mt pl-9 py-2 text-sm" placeholder="••••••••" value={formData.password} onChange={handleFormChange} />
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-brand-700 mb-1">Promotor Asignado</label>
                    <select name="promotor" required className="input-mt py-2.5 text-sm" value={formData.promotor} onChange={handleFormChange}>
                      <option value="">Selecciona un promotor</option>
                      {promotores.map(p => (
                        <option key={p.id} value={p.id}>{p.razon_social} (User: {p.usuario_username})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 border-t border-brand-100 flex justify-end gap-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl font-semibold text-brand-600 hover:bg-brand-100 transition-colors text-sm">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-ticket py-2 px-6 shadow-md shadow-accent/10 text-sm">
                    Crear Verificador
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
