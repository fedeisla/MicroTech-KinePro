'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']+$/
const DNI_NUMERICO = /^\d{7,8}$/
const TELEFONO_NUMERICO = /^\d{8,15}$/

function validarRegistro(data: Record<string, FormDataEntryValue>): string | null {
  const nombre = String(data.nombre ?? '').trim()
  const apellido = String(data.apellido ?? '').trim()
  const dni = String(data.dni ?? '').replace(/\D/g, '')
  const telefono = String(data.telefono ?? '').replace(/\D/g, '')

  if (!nombre || !SOLO_LETRAS.test(nombre)) return 'El nombre solo puede contener letras'
  if (!apellido || !SOLO_LETRAS.test(apellido)) return 'El apellido solo puede contener letras'
  if (!DNI_NUMERICO.test(dni)) return 'El DNI debe contener solo números (7 u 8 dígitos)'
  if (!TELEFONO_NUMERICO.test(telefono)) return 'El teléfono solo puede contener números'
  return null
}

interface RegistroUsuarioFormProps {
  onSuccess: () => void
  textoBoton?: string
}

export default function RegistroUsuarioForm({ onSuccess, textoBoton = 'Crear cuenta' }: RegistroUsuarioFormProps) {
  const [guardando, setGuardando] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const raw = Object.fromEntries(formData.entries())
    const errorValidacion = validarRegistro(raw)
    if (errorValidacion) {
      toast.error('Datos inválidos', { description: errorValidacion, duration: 5000 })
      return
    }

    const data = {
      ...raw,
      nombre: String(raw.nombre).trim(),
      apellido: String(raw.apellido).trim(),
      dni: String(raw.dni).replace(/\D/g, ''),
      telefono: String(raw.telefono).replace(/\D/g, ''),
    }
    const url = `${process.env.NEXT_PUBLIC_API_URL}/usuarios/registro`

    setGuardando(true)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const resultado = await response.json()
      if (!response.ok) {
        const mensajeError = Array.isArray(resultado.message)
          ? resultado.message.join(', ')
          : resultado.message
        throw new Error(mensajeError || 'Hubo un problema')
      }

      toast.success('¡Registro completado con éxito!', {
        description: resultado.message ?? 'Ya podés iniciar sesión.',
      })
      onSuccess()
    } catch (error: any) {
      toast.error('Error al crear usuario', { description: error.message, duration: 5000 })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
          <input
            type="text"
            name="nombre"
            required
            pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']+"
            title="Solo letras"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
            placeholder="Juan"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
          <input
            type="text"
            name="apellido"
            required
            pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']+"
            title="Solo letras"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
            placeholder="Pérez"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
          <input
            type="text"
            name="dni"
            required
            inputMode="numeric"
            pattern="\d{7,8}"
            maxLength={8}
            title="7 u 8 números"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
            placeholder="12345678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
          <input
            type="tel"
            name="telefono"
            required
            inputMode="numeric"
            pattern="\d{8,15}"
            title="Solo números (8 a 15 dígitos)"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
            placeholder="221123456"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
          <input
            type="date"
            name="fechaNacimiento"
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
        <input
          type="email"
          name="email"
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
          placeholder="ejemplo@kinepro.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
        <input
          type="password"
          name="password"
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={guardando}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl transition-colors mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
        {textoBoton}
      </button>
    </form>
  )
}