-- AddColumn ausenciasMesActual to Paciente
ALTER TABLE "Paciente" ADD COLUMN "ausenciasMesActual" INTEGER NOT NULL DEFAULT 0;
