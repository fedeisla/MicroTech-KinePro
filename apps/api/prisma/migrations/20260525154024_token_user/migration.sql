/*
  Warnings:

  - You are about to drop the column `TipoActividad_id` on the `Actividad` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tipoActividad_id` to the `Actividad` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Actividad" DROP CONSTRAINT "Actividad_TipoActividad_id_fkey";

-- AlterTable
ALTER TABLE "Actividad" DROP COLUMN "TipoActividad_id",
ADD COLUMN     "tipoActividad_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_token_key" ON "Usuario"("token");

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_tipoActividad_id_fkey" FOREIGN KEY ("tipoActividad_id") REFERENCES "TipoActividad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
