-- AlterTable
ALTER TABLE "ListaEspera" ADD COLUMN     "sesiones_pendientes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "total_sesiones" INTEGER NOT NULL DEFAULT 1;
