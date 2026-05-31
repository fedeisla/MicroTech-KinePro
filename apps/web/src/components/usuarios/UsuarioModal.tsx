'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Usuario } from '@/types/usuario'
import { modificarDatosPersonales, asignarRol, obtenerUsuarioPorId } from '@/services/usuariosService'

interface UsuarioModalProps {
  abierto: boolean
  usuario: Usuario | null   // null = modo crear (no soportado aún), con datos = modo modificar
  esOwner: boolean          // determina si mostrar el selector de rol
  onClose: () => void
  onGuardado: () => void    // para refrescar la tabla
}

const REGEX_SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']+$/
const REGEX_DNI = /^\d{7,8}$/
const REGEX_TELEFONO = /^\d{8,15}$/

export default function UsuarioModal({ abierto, usuario, esOwner, onClose, onGuardado }: UsuarioModalProps) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [rol, setRol] = useState<string>('PACIENTE')
  const [guardando, setGuardando] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const esModificar = usuario !== null

  // Detectar cambios
  const hayCambios = esModificar && usuario
    ? nombre.trim() !== usuario.nombre ||
      apellido.trim() !== usuario.apellido ||
      email.trim() !== usuario.email ||
      dni.trim() !== usuario.dni ||
      telefono.trim() !== usuario.telefono ||
      (esOwner && rol !== usuario.rol)
    : false

  useEffect(() => {
    if (abierto && usuario) {
      setNombre(usuario.nombre)
      setApellido(usuario.apellido)
      setEmail(usuario.email)
      setDni(usuario.dni)
      setTelefono(usuario.telefono)
      setRol(usuario.rol)
      setErrores({})
    }
  }, [abierto, usuario])

  function validar(): boolean {
    const nuevosErrores: Record<string, string> = {}

    if (nombre.trim() && !REGEX_SOLO_LETRAS.test(nombre.trim())) {
      nuevosErrores.nombre = 'El nombre solo puede contener letras'
    }

    if (apellido.trim() && !REGEX_SOLO_LETRAS.test(apellido.trim())) {
      nuevosErrores.apellido = 'El apellido solo puede contener letras'
    }

    if (email.trim() && !email.includes('@')) {
      nuevosErrores.email = 'El formato del email no es válido'
    }

    if (dni.trim() && !REGEX_DNI.test(dni.trim())) {
      nuevosErrores.dni = 'El DNI debe contener solo números (7 u 8 dígitos)'
    }

    if (telefono.trim() && !REGEX_TELEFONO.test(telefono.trim())) {
      nuevosErrores.telefono = 'El teléfono solo puede contener números'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  if (!abierto) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!validar()) return

    setGuardando(true)
    try {
      const payload: {
        id: number
        nombre?: string
        apellido?: string
        email?: string
        dni?: string
        telefono?: string
      } = { id: usuario!.id }

      // Solo agregar campos si cambiaron
      if (nombre.trim() !== usuario!.nombre) payload.nombre = nombre.trim()
      if (apellido.trim() !== usuario!.apellido) payload.apellido = apellido.trim()
      if (email.trim() !== usuario!.email) payload.email = email.trim()
      if (dni.trim() !== usuario!.dni) payload.dni = dni.trim()
      if (telefono.trim() !== usuario!.telefono) payload.telefono = telefono.trim()

      // Llamar a modificar datos personales
      const res = await modificarDatosPersonales(payload)
      
      // Si es owner y cambió el rol, asignarlo
      if (esOwner && rol !== usuario!.rol) {
        await asignarRol(usuario!.id, { rol: rol as any })
      }

      toast.success(res.message)
      onGuardado()
      onClose()
    } catch (err: any) {
      toast.error('Error', { description: err.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h3 className="mb-4 text-lg font-bold text-kine-blue">
          Modificar usuario
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nombre {errores.nombre && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={50}
              className={`w-full rounded-lg border ${errores.nombre ? 'border-red-300' : 'border-slate-200'} px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errores.nombre ? 'focus:ring-red-500' : 'focus:ring-kine-blue'}`}
              placeholder="Ej: Juan"
            />
            {errores.nombre && <p className="text-xs text-red-500 mt-1">{errores.nombre}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Apellido {errores.apellido && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              maxLength={50}
              className={`w-full rounded-lg border ${errores.apellido ? 'border-red-300' : 'border-slate-200'} px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errores.apellido ? 'focus:ring-red-500' : 'focus:ring-kine-blue'}`}
              placeholder="Ej: Pérez"
            />
            {errores.apellido && <p className="text-xs text-red-500 mt-1">{errores.apellido}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email {errores.email && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-lg border ${errores.email ? 'border-red-300' : 'border-slate-200'} px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errores.email ? 'focus:ring-red-500' : 'focus:ring-kine-blue'}`}
              placeholder="usuario@ejemplo.com"
            />
            {errores.email && <p className="text-xs text-red-500 mt-1">{errores.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              DNI {errores.dni && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              maxLength={8}
              className={`w-full rounded-lg border ${errores.dni ? 'border-red-300' : 'border-slate-200'} px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errores.dni ? 'focus:ring-red-500' : 'focus:ring-kine-blue'}`}
              placeholder="43600403"
            />
            {errores.dni && <p className="text-xs text-red-500 mt-1">{errores.dni}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Teléfono {errores.telefono && <span className="text-red-500">*</span>}
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              maxLength={15}
              className={`w-full rounded-lg border ${errores.telefono ? 'border-red-300' : 'border-slate-200'} px-3 py-2 text-sm focus:outline-none focus:ring-2 ${errores.telefono ? 'focus:ring-red-500' : 'focus:ring-kine-blue'}`}
              placeholder="2216783660"
            />
            {errores.telefono && <p className="text-xs text-red-500 mt-1">{errores.telefono}</p>}
          </div>

          {esOwner && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kine-blue"
              >
                <option value="PACIENTE">Paciente</option>
                <option value="ADMIN">Administrador</option>
                <option value="OWNER">Dueño</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !hayCambios}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-kine-blue text-white hover:bg-kine-blue-deep disabled:opacity-50 flex items-center gap-2"
            >
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
