'use client';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

import NotificacionesDropdown from './NotificacionesDropdown';
import PerfilDropdown from './PerfilDropDown';

export default function Header() {
  const { isAuthenticated, rol } = useAuth();
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
   
      <div>
        <h1 className="text-xl font-semibold text-gray-800"></h1>
      </div>
      <div className="flex items-center gap-6">
        {isAuthenticated && rol === 'PACIENTE' && <NotificacionesDropdown />}
        {isAuthenticated && (
          <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
            <PerfilDropdown />
          </div>
        )}
      </div>
    </header>
  );
}