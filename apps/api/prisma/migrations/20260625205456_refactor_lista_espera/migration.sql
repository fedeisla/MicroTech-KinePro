/*
  Warnings:

  - You are about to drop the column `posicion` on the `ListaEspera` table. All the data in the column will be lost.
  - You are about to drop the column `tipo_plan` on the `ListaEspera` table. All the data in the column will be lost.
  - Added the required column `prioridad` to the `ListaEspera` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoListaEspera" AS ENUM ('PENDIENTE', 'NOTIFICADO', 'ASIGNADO', 'CANCELADO', 'EXPIRADO');

-- AlterTable
ALTER TABLE "ListaEspera" DROP COLUMN "posicion",
DROP COLUMN "tipo_plan",
ADD COLUMN     "estado" "EstadoListaEspera" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "fecha_notificacion" TIMESTAMP(3),
ADD COLUMN     "prioridad" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "ConfiguracionSistema" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "porcentajeListaEspera" INTEGER NOT NULL DEFAULT 20,
    "contadorRespiracion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConfiguracionSistema_pkey" PRIMARY KEY ("id")
);
