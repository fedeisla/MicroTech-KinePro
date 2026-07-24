'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  User,
  KeyRound,
  UserPen,
  CalendarClock,
  History,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import ModificarContrasenaModal from '@/components/usuarios/ModificarContrasenaModal'
import { useAuth } from '@/hooks/useAuth'

type UsuarioSesion = {
  id?: number
  nombre: string
  apellido: string
  email: string
}

export default function PerfilDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [modalContrasena, setModalContrasena] = useState(false)
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const { rol } = useAuth()

  useEffect(() => {
    const userStorage = localStorage.getItem('kinepro_user')
    if (userStorage) {
      setUsuario(JSON.parse(userStorage))
    }
  }, [])

  const Logout = () => {
    localStorage.removeItem('kinepro_token')
    localStorage.removeItem('kinepro_user')

    toast.success('Cierre de sesión exitoso')

    setIsOpen(false)
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  const nombreCompleto = usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Invitado'
  const emailUsuario = usuario ? usuario.email : 'sin-sesion@kinepro.com'
  const inicial = usuario ? usuario.nombre[0].toUpperCase() : 'I'

  return (
    <>
      <div className="relative inline-block text-left">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-slate-50 focus:outline-none"
        >
          <div className="flex flex-col text-right sm:flex">
            <span className="text-sm font-bold text-slate-700">{nombreCompleto}</span>
            <span className="text-xs font-medium text-slate-400">
              {usuario ? rol : 'Sin Sesión'}
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-lg font-bold text-teal-600 shadow-sm">
            {inicial}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />

            <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl duration-150 animate-in fade-in slide-in-from-top-1">
              <div className="flex flex-col border-b border-slate-100 bg-slate-50/60 p-4">
                <span className="text-sm font-semibold text-slate-800">{nombreCompleto}</span>
                <span className="mt-0.5 truncate text-xs text-slate-400">{emailUsuario}</span>
              </div>

              <div className="flex flex-col gap-0.5 p-1.5 text-sm text-slate-600">
                {/* <a
                  href="#perfil"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Mi perfil
                </a>
                */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setModalContrasena(true)
                  }}
                  disabled={!usuario}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  Modificar contraseña
                </button>
                <Link
                  href="/perfil/datos"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <UserPen className="h-4 w-4 text-slate-400" />
                  Modificar datos personales
                </Link>
              </div>

              <div className="border-t border-slate-100" />

              <div className="p-1.5">
                <button
                  onClick={Logout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {usuario && (
        <ModificarContrasenaModal
          abierto={modalContrasena}
          email={usuario.email}
          onClose={() => setModalContrasena(false)}
        />
      )}
    </>
  )
}
