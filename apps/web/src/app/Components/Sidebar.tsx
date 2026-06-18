'use client'

import { useState, useEffect } from 'react' 
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, Rol } from '@/hooks/useAuth'

type LinkConfig = {
  href: string
  label: string
  rolesPermitidos: Rol[] | 'todos'
  soloNoAutenticadosYPacientes?: boolean
}

const LINKS: LinkConfig[] = [
  { href: '/',              label: 'Inicio',         rolesPermitidos: 'todos' },
  { href: '/Usuarios',      label: 'Usuarios',       rolesPermitidos: ['ADMIN', 'OWNER'] },
  { href: '/actividades',   label: 'Actividades',    rolesPermitidos: ['ADMIN', 'OWNER'] },
  { href: '/turnos',        label: 'Turnos',         rolesPermitidos: ['ADMIN', 'OWNER'] },
  { href: '/estadisticas',  label: 'Estadísticas',   rolesPermitidos: ['OWNER'] },
  { href: '/mis-turnos/pendientes', label: 'Ver turnos pendientes',  rolesPermitidos: ['PACIENTE'] },
  { href: '/mis-turnos/pasados', label: 'Ver historial de turnos',  rolesPermitidos: ['PACIENTE'] },
  { href: '/#ubicacion',    label: 'Ubicación',   rolesPermitidos: 'todos', soloNoAutenticadosYPacientes: true },
  { href: '/#acerca-de',    label: 'Acerca de',    rolesPermitidos: 'todos', soloNoAutenticadosYPacientes: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { rol, isAuthenticated, cargando } = useAuth()
  
  // --- 2. ESTADO PARA GUARDAR EL HASH ACTUAL ---
  const [hashActual, setHashActual] = useState('')

  // --- 3. ESCUCHAMOS LOS CAMBIOS EN LA URL ---
  useEffect(() => {
    // Al cargar la página, leemos si hay un hash (para no romper el SSR de Next.js)
    setHashActual(window.location.hash)

    // Evento que escucha si el hash cambia manualmente o al hacer scroll
    const onHashChange = () => setHashActual(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // --- 4. NUEVA LÓGICA DE ESTILOS ---
  const linkStyles = (href: string) => {
    let isActive = false;

    if (href === '/') {
      // Es "Inicio" SOLAMENTE si estamos en la raíz y NO hay hash
      isActive = pathname === '/' && hashActual === '';
    } else if (href.startsWith('/#')) {
      // Es una sección de la misma página (ej: /#ubicacion)
      const hashDelLink = href.replace('/', ''); // Le sacamos la barra
      isActive = pathname === '/' && hashActual === hashDelLink;
    } else {
      isActive = pathname === href;
    }

    return `px-4 py-3 rounded-lg transition-all duration-200 border-l-4 flex items-center gap-2 ${
      isActive
        ? 'bg-kine-blue text-white border-teal-accent font-medium shadow-inner'
        : 'text-gray-300 border-transparent hover:bg-kine-blue/50 hover:text-white'
    }`
  }

  const linksVisibles = LINKS.filter((link) => {
    if (link.soloNoAutenticadosYPacientes) {
      if (!isAuthenticated) return true 
      return rol === 'PACIENTE' 
    }
    if (link.rolesPermitidos === 'todos') return true
    if (!isAuthenticated || !rol) return false
    return link.rolesPermitidos.includes(rol)
  })

  return (
    <aside className="w-64 bg-kine-blue-deep text-white flex flex-col h-screen sticky top-0 shadow-2xl shrink-0">
      <div className="p-6 border-b border-white/10 text-center flex items-center justify-center">
        <Link 
          href="/" 
          onClick={(e) => { 
            setHashActual('');
            if (pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }} 
          className="block"
        >
          <h2 className="text-3xl font-bold tracking-wider">
            Kine<span className="text-pro-green-light">Pro</span>
          </h2>
        </Link>
      </div>

      <nav className="flex flex-col mt-8 gap-2 px-4">
        {cargando ? (
          <p className="px-4 text-sm text-gray-400">Cargando...</p>
        ) : (
          linksVisibles.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className={linkStyles(link.href)}
              onClick={(e) => {
                if (link.href.startsWith('/#')) {
                  setHashActual(link.href.replace('/', ''))
                } else if (link.href === '/') {
                  setHashActual('')
                  // Si ya estamos en el Home, cancelamos el salto y subimos suavemente
                  if (pathname === '/') {
                    e.preventDefault() // Evita el salto brusco de Next.js
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }
              }}
            >
              {link.label}
            </Link>
          ))
        )}
      </nav>
    </aside>
  )
}