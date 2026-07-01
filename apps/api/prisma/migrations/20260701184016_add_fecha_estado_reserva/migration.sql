/*
  Warnings:

  - Added the required column `fecha_estado` to the `Reserva` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "fecha_estado" TIMESTAMP(3) NOT NULL;
