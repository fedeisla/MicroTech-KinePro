/*
  Warnings:

  - A unique constraint covering the columns `[fecha,hora_inicio,tipoActividad_id]` on the table `Turno` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Turno_fecha_hora_inicio_key";

-- CreateIndex
CREATE UNIQUE INDEX "Turno_fecha_hora_inicio_tipoActividad_id_key" ON "Turno"("fecha", "hora_inicio", "tipoActividad_id");
