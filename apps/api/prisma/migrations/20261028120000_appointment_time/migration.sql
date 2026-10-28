-- Agenda de 20 em 20 min (protótipo de 28/10): hora inteira vira "HH:MM"
ALTER TABLE "Appointment" ADD COLUMN "time" TEXT;
UPDATE "Appointment" SET "time" = lpad("hour"::text, 2, '0') || ':00';
ALTER TABLE "Appointment" ALTER COLUMN "time" SET NOT NULL;

DROP INDEX "Appointment_instructorId_date_hour_key";
ALTER TABLE "Appointment" DROP COLUMN "hour";
CREATE UNIQUE INDEX "Appointment_instructorId_date_time_key" ON "Appointment"("instructorId", "date", "time");
