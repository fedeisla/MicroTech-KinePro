'use client'

import { MapPin, Navigation } from 'lucide-react'

export default function Ubicacion() {
  return (
    <section id="ubicacion" className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 scroll-mt-20">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Ubicación</h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">Nos encontramos en la Facultad de Informática de la UNLP.</p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200 h-96">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3271.5394726895337!2d-57.93726762346894!3d-34.907837972046005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a2e62c8c8c8c8d%3A0x8c8c8c8c8c8c8c8c!2sFacultad%20de%20Inform%C3%A1tica%20-%20UNLP!5e0!3m2!1ses!2sar!4v1234567890"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <a
          href="https://maps.app.goo.gl/zprdCc5CNtrcZxyj6"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Navigation className="h-5 w-5" />
          Abrir en Google Maps
        </a>
      </div>
    </section>
  )
}
