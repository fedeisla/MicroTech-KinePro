'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { modificarDatosPersonales } from '@/services/usuariosService'
import { useRequireRole, UsuarioSesion } from '@/hooks/useAuth'

export default function ModificarDatosPage() {
  const router = useRouter()
  const { usuario, autorizado, cargando } = useRequireRole(['ADMIN', 'OWNER', 'PACIENTE']) as any
  const [datosUsuario, setDatosUsuario] = useState<UsuarioSesion | null>(null)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)

  const hayCambios = datosUsuario && (
    nombre !== datosUsuario.nombre ||
    apellido !== datosUsuario.apellido ||
    email !== datosUsuario.email ||
    dni !== (datosUsuario.dni ?? '') ||
    telefono !== (datosUsuario.telefono ?? '')
  )

  useEffect(() => {
    if (!autorizado) return
    const raw = localStorage.getItem('kinepro_user')
    if (raw) {
      const usuarioActual = JSON.parse(raw) as UsuarioSesion
      setDatosUsuario(usuarioActual)
      setNombre(usuarioActual.nombre)
      setApellido(usuarioActual.apellido)
      setEmail(usuarioActual.email)
      setDni(usuarioActual.dni ?? '')
      setTelefono(usuarioActual.telefono ?? '')
    }
  }, [autorizado])

  if (cargando) return <p className="p-6 text-sm text-slate-500">Cargando...</p>
  if (!autorizado || !datosUsuario) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!datosUsuario) return

    const payload: {
      id: number
      nombre?: string
      apellido?: string
      email?: string
      dni?: string
      telefono?: string
    } = { id: datosUsuario.id }

    if (nombre !== datosUsuario.nombre) payload.nombre = nombre
    if (apellido !== datosUsuario.apellido) payload.apellido = apellido
    if (email !== datosUsuario.email) payload.email = email
    if (dni !== (datosUsuario.dni ?? '')) payload.dni = dni
    if (telefono !== (datosUsuario.telefono ?? '')) payload.telefono = telefono

    if (Object.keys(payload).length === 1) {
      toast.error('No hay datos para modificar')
      return
    }

    setGuardando(true)
    try {
      const res = await modificarDatosPersonales(payload)
      const actualizado = { ...datosUsuario, ...payload }
      localStorage.setItem('kinepro_user', JSON.stringify(actualizado))
      toast.success(res.message)
      router.push('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los datos'
      toast.error(msg)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-slate-800">Modificar datos personales</h1>
        <p className="mb-6 text-sm text-slate-500">Actualizá tu información de contacto.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                name="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Apellido</label>
              <input
                name="apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">DNI</label>
              <input
                name="dni"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
              <input
                name="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={guardando || !hayCambios}
              className="flex items-center gap-2 rounded-lg bg-kine-blue px-4 py-2 text-sm font-semibold text-white hover:bg-kine-blue-deep disabled:opacity-50"
            >
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}