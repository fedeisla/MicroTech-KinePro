/*
  Warnings:

  - Added the required column `descripcion` to the `Notificacion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titulo` to the `Notificacion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notificacion" ADD COLUMN     "descripcion" TEXT NOT NULL,
ADD COLUMN     "leida" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "titulo" TEXT NOT NULL;
