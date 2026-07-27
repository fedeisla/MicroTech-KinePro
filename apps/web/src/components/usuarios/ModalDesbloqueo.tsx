'use client'

import { useState } from 'react'
import { Unlock, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { solicitarDesbloqueo } from '@/services/usuariosService'
import { motion, AnimatePresence } from 'framer-motion' // ◄--- 1. Importar Framer Motion

interface ModalDesbloqueoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalDesbloqueo({ isOpen, onClose }: ModalDesbloqueoProps) {
  const [email, setEmail] = useState('')
  const [procesando, setProcesando] = useState(false)


  const handleDesbloquear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProcesando(true)

    try {
      const res = await solicitarDesbloqueo(email);
      setEmail('')
      onClose()
      toast.success(res.message) 
    } catch (error: any) {
      toast.error(error.message || 'Error de conexión con el servidor')
    } finally {
      setProcesando(false)
    }
  }

  return (
    // 3. AnimatePresence permite animar la salida (exit)
    <AnimatePresence>
      {isOpen && (
        // 4. El fondo oscuro (Backdrop)
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        >
          {/* 5. La tarjetita blanca del modal */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }} // Efecto rebote suave
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative"
          >
            
            <button 
              onClick={() => !procesando && onClose()}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              disabled={procesando}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Unlock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Desbloquear cuenta</h3>
              <p className="text-sm text-slate-500 mt-1">Ingresá tu correo para recuperar el acceso a KinePro.</p>
            </div>

            <form onSubmit={handleDesbloquear} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ejemplo@correo.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={procesando}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={procesando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
                >
                  {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Desbloquear cuenta
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}