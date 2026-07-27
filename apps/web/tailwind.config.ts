import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // <- ESTA ES LA CLAVE
  ],
  theme: {
    extend: {
      colors: {
        // --- LA PALETA NUEVA OFICIAL ---
        'kineblue': 'var(--kine-blue)',
        'kineblue-light': 'var(--kine-blue-light)',
        'kineblue-deep': 'var(--kine-blue-deep)',
        'progreen': 'var(--pro-green)',
        'progreen-light': 'var(--pro-green-light)',
        'progreen-deep': 'var(--pro-green-deep)',
        'teal-accent': 'var(--teal-accent)',
        'pure-white': 'var(--pure-white)',
        'neutral-gray': 'var(--neutral-gray)',
        'light-bg-gray': 'var(--light-bg-gray)',
        'text-main': 'var(--text-main)',
        
        // --- COLORES "VIEJOS" PARA QUE NO SE ROMPA EL RESTO DE LA APP ---
        'kine-blue': 'var(--kine-blue)',
        'kine-blue-deep': 'var(--kine-blue-deep)',
        'neutral-bg': '#F3F4F6', // Usamos este gris suave que es el estándar, si tu gris era otro podés cambiar el Hex acá
      },
    },
  },
  plugins: [],
};
export default config;