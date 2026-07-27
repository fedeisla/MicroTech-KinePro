-- AlterTable
ALTER TABLE "Notificacion" ADD COLUMN     "reserva_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "Reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;
