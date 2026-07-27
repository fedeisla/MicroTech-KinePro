'use client'


import { Info, Calendar, Clock, MessageCircle, Unlock } from 'lucide-react'
import ModalDesbloqueo from '../usuarios/ModalDesbloqueo'
import { useState } from 'react'


export default function AcercaDe() {
  const [modalAbierto, setModalAbierto] = useState(false)
  
  return (
    <section id="acerca-de" className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 scroll-mt-20">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Acerca de nosotros</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">Conocé más sobre nuestro centro de kinesiología</p>
      </div>

      {/* Información de Contacto */}
      <div className="mb-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Horario de atención</p>
                <p className="text-sm text-slate-600">Lunes a viernes: 7:00 a 21:00 hs</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">WhatsApp</p>
                <p className="text-sm text-slate-600">+54 9 221 123-4567</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Historia */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Nuestra historia</h3>
          <p className="text-slate-600 leading-relaxed">
            El centro fue fundado hace 15 años por Laura y José, kinesiólogos con una visión clara: 
            brindar excelente atención con un equipo de buenos profesionales que se dedican 
            a mejorar la calidad de vida de nuestros pacientes.
          </p>
        </div>

        {/* Servicios */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Nuestros servicios</h3>
          <p className="text-slate-600 mb-3">
            Ofrecemos sesiones de kinesiología organizadas por <strong>zonas de tratamiento</strong>:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">1</span>
              <span className="text-slate-600">Tren inferior</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">2</span>
              <span className="text-slate-600">Tren medio</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">3</span>
              <span className="text-slate-600">Tren superior</span>
            </li>
          </ul>
        </div>

        {/* Gestión de Turnos */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Cómo gestionamos tus turnos</h3>
          <p className="text-slate-600 mb-3">
            Ofrecemos dos modalidades de atención para que elijas la que mejor se adapte a tu necesidad:
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                <p className="font-semibold text-slate-800">Turnos fijos</p>
              </div>
              <p className="text-sm text-slate-600">Para pacientes regulares que requieren un seguimiento continuo.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-teal-600" />
                <p className="font-semibold text-slate-800">Turnos únicos</p>
              </div>
              <p className="text-sm text-slate-600">Para consultas puntuales o cuando lo necesites.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Desbloqueo de Cuenta */}
      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
            <Unlock className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">¿Necesitás desbloquear tu cuenta?</h3>
            <p className="text-sm text-slate-600">Recuperá el acceso para seguir gestionando tus turnos.</p>
          </div>
        </div>
        
        
        <button 
          onClick={() => setModalAbierto(true)}
          className="whitespace-nowrap rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
        >
          Desbloquear cuenta
        </button>
      </div>
      <ModalDesbloqueo 
        isOpen={modalAbierto} 
        onClose={() => setModalAbierto(false)} 
      />
    </section>
  )
}