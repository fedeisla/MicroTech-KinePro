// app/layout.tsx
import './globals.css';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header'; 
import { Toaster } from 'sonner'; // 👈 1. Importás el Toaster

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-100 min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="p-6 flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}