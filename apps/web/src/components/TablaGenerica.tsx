'use client';

import React from 'react';

// Definimos cómo va a ser la configuración de cada columna
export interface Columna<T> {
  encabezado: string; // El título de la columna (ej: "Nombre")
  accessor?: keyof T; // La propiedad directa del objeto (ej: "nombre")
  // La magia para las acciones: una función que recibe la fila entera y devuelve un componente
  render?: (fila: T) => React.ReactNode; 
}

// Las props que va a recibir nuestra tabla
interface TablaProps<T extends { id: string | number }> {
  datos: T[];
  columnas: Columna<T>[];
  mensajeVacio?: string;
}

export default function TablaGenerica<T extends { id: string | number }>({ 
  datos, 
  columnas, 
  mensajeVacio = "No hay registros para mostrar." 
}: TablaProps<T>) {

  return (
    <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 w-full">
      <table className="w-full text-sm text-left text-slate-600">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
          <tr>
            {columnas.map((col, index) => (
              <th key={index} className="px-6 py-4 font-bold">
                {col.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="px-6 py-8 text-center text-slate-500">
                {mensajeVacio}
              </td>
            </tr>
          ) : (
            datos.map((fila) => (
              <tr key={fila.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                {columnas.map((col, index) => (
                  <td key={index} className="px-6 py-4">
                    {/* Si la columna tiene un 'render' custom (como las acciones), lo usamos. 
                        Sino, mostramos el dato directo usando el 'accessor' */}
                    {col.render ? col.render(fila) : fila[col.accessor as keyof T]?.toString()}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}