'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, AlertCircle, Plus } from 'lucide-react';
import TablaGenerica, { Columna } from './TablaGenerica';
import UsuarioModal from '@/components/usuarios/UsuarioModal';
import ConfirmDialog from './ConfirmDialog';
import RegistroUsuarioForm from '@/components/usuarios/RegistroUsuarioForm';
import { useAuth } from '@/hooks/useAuth';
import { obtenerUsuarioPorId, eliminarUsuario } from '@/services/usuariosService';
import type { Usuario } from '@/types/usuario';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export default function TablaUsuarios() {
  const { rol: rolActual } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false);

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const token = localStorage.getItem('kinepro_token');
      const respuesta = await fetch(`${API}/usuarios`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        const msg = json?.message ?? 'Error al cargar los usuarios';
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
      }

      setUsuarios(json.data || []);
    } catch (e: any) {
      setError(e.message);
      setUsuarios([]);
      toast.error('Error de servidor', { description: e.message });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  async function abrirModificar(usuario: Usuario) {
    try {
      const res = await obtenerUsuarioPorId(usuario.id);
      setUsuarioEnEdicion(res.data);
      setModalAbierto(true);
    } catch (e: any) {
      toast.error('Error al cargar usuario', { description: e.message });
    }
  }

  function pedirEliminar(usuario: Usuario) {
    setUsuarioAEliminar(usuario);
  }

  async function confirmarEliminar() {
    if (!usuarioAEliminar) return;
    setEliminando(true);
    try {
      const res = await eliminarUsuario(usuarioAEliminar.id);
      toast.success(res.message);
      setUsuarioAEliminar(null);
      cargarUsuarios();
    } catch (e: any) {
      toast.error('No se pudo eliminar', { description: e.message });
    } finally {
      setEliminando(false);
    }
  }

  // Configuración de las columnas con los nuevos iconos vectoriales
  const columnasConfig: Columna<Usuario>[] = [
    {
      encabezado: 'Nombre y Apellido',
      render: (u) => <span className="font-medium text-slate-800">{u.nombre} {u.apellido}</span>,
    },
    {
      encabezado: 'DNI',
      render: (u) => <span className="text-slate-500 font-mono">{u.dni}</span>,
    },
    {
      encabezado: 'Email',
      accessor: 'email',
    },
    {
      encabezado: 'Teléfono',
      render: (u) => <span className="text-slate-500">{u.telefono || '-'}</span>,
    },
    {
      encabezado: 'Rol',
      render: (u) => <span className="text-slate-500 text-xs font-semibold">{u.rol}</span>,
    },
    {
      encabezado: 'Acciones',
      render: (u) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => abrirModificar(u)}
            className="bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-600 p-2 rounded-xl text-xs font-semibold transition-colors border border-slate-200 hover:border-teal-200 flex items-center gap-1.5"
            title="Modificar usuario"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Modificar</span>
          </button>
          <button
            onClick={() => pedirEliminar(u)}
            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl text-xs font-semibold transition-colors border border-red-100 flex items-center gap-1.5"
            title="Eliminar usuario"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      ),
    },
  ];

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 w-full bg-white rounded-2xl border border-slate-100 shadow-sm">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Cargando listado de usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-sm flex items-center gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <span className="font-bold">Hubo un problema:</span> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Encabezado de la sección */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Listado de Usuarios</h2>
          <p className="text-xs text-slate-400 mt-0.5">Gestión y control de cuentas registradas</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full border border-teal-100">
            Total: {usuarios.length}
          </span>
          <button
            onClick={() => setModalRegistroAbierto(true)}
            className="bg-kine-blue hover:bg-kine-blue-deep text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar usuario
          </button>
        </div>
      </div>

      {/* Componente Genérico */}
      <TablaGenerica
        datos={usuarios}
        columnas={columnasConfig}
        mensajeVacio="No hay usuarios registrados en el sistema."
      />

      {/* Modal de Modificación */}
      <UsuarioModal
        abierto={modalAbierto}
        usuario={usuarioEnEdicion}
        esOwner={rolActual === 'OWNER'}
        onClose={() => setModalAbierto(false)}
        onGuardado={cargarUsuarios}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <ConfirmDialog
        abierto={usuarioAEliminar !== null}
        titulo="Eliminar usuario"
        mensaje={
          usuarioAEliminar
            ? `¿Estás seguro de que querés eliminar a ${usuarioAEliminar.nombre} ${usuarioAEliminar.apellido}? Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        variante="peligro"
        procesando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setUsuarioAEliminar(null)}
      />

      {/* Modal de Registro Presencial */}
      {modalRegistroAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setModalRegistroAbierto(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Registrar usuario</h3>
            <RegistroUsuarioForm
              textoBoton="Registrar usuario"
              onSuccess={() => {
                setModalRegistroAbierto(false);
                cargarUsuarios();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}