'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export type Rol = 'OWNER' | 'ADMIN' | 'PACIENTE' | 'KINESIOLOGO'

export interface UsuarioSesion {
  id: number
  nombre: string
  apellido: string
  email: string
  dni: string
  telefono: string
  rol: Rol
}

export function useAuth() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('kinepro_token')
    const u = localStorage.getItem('kinepro_user')
    if (t) setToken(t)
    if (u) {
      try {
        setUsuario(JSON.parse(u))
      } catch {
        setUsuario(null)
      }
    }
    setCargando(false)
  }, [])

  const logout = () => {
    localStorage.removeItem('kinepro_token')
    localStorage.removeItem('kinepro_user')
    setToken(null)
    setUsuario(null)
    window.location.href = '/'
  }

  return {
    usuario,
    token,
    rol: usuario?.rol ?? null,
    isAuthenticated: !!token,
    cargando,
    logout,
  }
}

export function useRequireRole(rolesPermitidos: Rol[]) {
  const { rol, isAuthenticated, cargando } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (cargando) return
    if (!isAuthenticated) {
      router.replace('/')
      return
    }
    if (!rol || !rolesPermitidos.includes(rol)) {
      router.replace('/')
    }
  }, [cargando, isAuthenticated, rol, rolesPermitidos, router])

  const autorizado =
    !cargando && isAuthenticated && rol !== null && rolesPermitidos.includes(rol)

  return { autorizado, cargando }
}