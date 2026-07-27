# KinePro — Sistema Integral de Gestión Kinesiológica

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Scrum](https://img.shields.io/badge/agile-SCRUM-0052CC?style=for-the-badge&logo=jira&logoColor=white)

> **KinePro** es una solución web full-stack desarrollada para la centralización, administración y reserva de turnos de centros de kinesiología y rehabilitación física. El sistema automatiza agendas complejas, manejo de cupos en tiempo real, listas de espera inteligentes y pasarelas de pago.

---

## Contexto y Metodología del Proyecto

Este sistema fue diseñado y desarrollado en equipo bajo los criterios de calidad de la cátedra de **Ingeniería de Software II** (Universidad Nacional de La Plata), implementando **Metodología Ágil Scrum** durante todo el ciclo de vida del software.

* **Gestión en Taiga:** Planificación iterativa dividida en *Sprints*, administración del *Product Backlog*, mapeo de *Épicas* y trazabilidad de Historias de Usuario (HU).
* **Calidad y Criterios de Aceptación:** Implementación estricta de validaciones y manejo de errores basados exactamente en los escenarios definidos por el cliente.

---

## Características Principales

* **Reserva de Turnos Flexible:** Modalidad de **Turno Único** o **Reserva Fija Mensual** con generación automática de bloques horarios según la agenda del centro.
* **Lista de Espera Inteligente:** Sistema algorítmico automatizado que gestiona colas de prioridad cuando los cupos se agotan, notificando en tiempo real a los pacientes para aceptar o rechazar vacantes liberadas en un margen de 12 horas.
* **Integración de Pagos:** Conexión con **MercadoPago** para la confirmación de reservas (turnos individuales y paquetes mensuales fijos) mediante polling dinámico y webhooks.
* **Panel de Administración (Presencial / Backoffice):** Módulo para kinesiólogos y recepcionistas que permite la carga manual de turnos, sobreescritura de cupos y seguimiento del estado de pacientes.
* **Arquitectura Monorepo:** Separación limpia de capas conectadas bajo un mismo entorno con `npm workspaces`.

---

## Stack Tecnológico

| Capa | Tecnología | Detalle |
| :--- | :--- | :--- |
| **Backend** | NestJS 10 | Framework modular con TypeScript, ValidationPipes y Guards de Auth. |
| **Frontend** | Next.js 14 | App Router, Server/Client Components y diseño responsivo con TailwindCSS. |
| **Base de Datos** | PostgreSQL | Motor relacional robusto. |
| **ORM** | Prisma ORM | Modelado esquemático, tipado seguro y transacciones atómicas (`$transaction`). |
| **Pagos** | MercadoPago SDK | Generación de preferencias de cobro y validación de estados de pago. |
| **Testing** | Jest | Pruebas unitarias y de integración para reglas de negocio críticas. |

---

## Cómo levantar el proyecto en entorno local

### Pre-requisitos
* **Node.js** v20 o superior.
* **npm** v10 o superior.
* Instancia local o servicio en la nube de **PostgreSQL**.

### 1. Clonar el repositorio
```bash
git clone [https://github.com/](https://github.com/)<organizacion>/MicroTech-KinePro.git
cd MicroTech-KinePro

# 2) Instalar dependencias (las dos apps)
npm install --workspaces

# 3) Configurar variables de entorno
#   Linux/Mac
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
#   Windows (PowerShell o cmd)
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.local.example apps\web\.env.local
```
Levantar los servidores
En dos terminales distintas, ambas paradas en la raíz del repo:
```Bash
# Terminal 1 - Backend NestJS
npm run dev:api      # http://localhost:4000/api
# Terminal 2 - Frontend Next.js
npm run dev:web # http://localhost:3000
```
EstructuraMicroTech-KinePro/
```Bash
├── apps/
│   ├── api/                     # Backend NestJS
│   │   ├── prisma/              # Schema y migraciones de PostgreSQL
│   │   └── src/
│   │       ├── auth/            # Autenticación y control de roles (ADMIN/USER)
│   │       ├── turnos/          # Lógica de agenda y disponibilidad
│   │       ├── reservas/        # Gestión de reservas simples y fijas
│   │       ├── lista-espera/    # Algoritmo de colas y prioridades
│   │       ├── pagos/           # Conector MercadoPago y verificación
│   │       └── main.ts          # Bootstrap y validaciones globales
│   └── web/                     # Frontend Next.js
│       ├── src/
│       │   ├── app/             # Rutas de interfaz (App Router)
│       │   ├── components/      # Grillas de turnos, modales y banners
│       │   └── services/        # Clientes HTTP hacia la API
├── package.json                 # Workspaces + scripts globales
└── README.md
```
---


## Equipo de Trabajo


<a href="https://github.com/nicolascarrica" target="_blank"><img src="https://github.com/nicolascarrica.png" width="40" height="40" style="border-radius: 50%; vertical-align: middle; margin-right: 8px;" alt="nicolascarrica" /></a>
<a href="https://github.com/pablocabe" target="_blank"><img src="https://github.com/pablocabe.png" width="40" height="40" style="border-radius: 50%; vertical-align: middle; margin-right: 8px;" alt="pablocabe" /></a>
<a href="https://github.com/ValeBlanco" target="_blank"><img src="https://github.com/ValeBlanco.png" width="40" height="40" style="border-radius: 50%; vertical-align: middle; margin-right: 8px;" alt="ValeBlanco" /></a>
<a href="https://github.com/IvanScopel" target="_blank"><img src="https://github.com/IvanScopel.png" width="40" height="40" style="border-radius: 50%; vertical-align: middle; margin-right: 8px;" alt="IvanScopel" /></a>

  





