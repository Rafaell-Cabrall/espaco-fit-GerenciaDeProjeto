-- Avaliação física: data da avaliação vira dia (Brasília), massa magra e perímetros
ALTER TABLE "BodyMeasurement" RENAME COLUMN "measuredAt" TO "measuredOn";
ALTER TABLE "BodyMeasurement" ALTER COLUMN "measuredOn" DROP DEFAULT,
  ALTER COLUMN "measuredOn" TYPE DATE
    USING ("measuredOn" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date,
  ADD COLUMN "leanMassKg" DECIMAL(5,2),
  ADD COLUMN "chestCm" DECIMAL(4,1),
  ADD COLUMN "waistCm" DECIMAL(4,1),
  ADD COLUMN "abdomenCm" DECIMAL(4,1),
  ADD COLUMN "rightArmCm" DECIMAL(4,1),
  ADD COLUMN "leftArmCm" DECIMAL(4,1),
  ADD COLUMN "thighCm" DECIMAL(4,1),
  ADD COLUMN "calfCm" DECIMAL(4,1),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER INDEX "BodyMeasurement_studentId_measuredAt_idx" RENAME TO "BodyMeasurement_studentId_measuredOn_idx";

-- Aviso vale até o fim do dia informado
ALTER TABLE "Announcement" DROP COLUMN "expiresAt", ADD COLUMN "expiresOn" DATE;

-- Agenda de avaliações físicas
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Appointment_instructorId_date_hour_key" ON "Appointment"("instructorId", "date", "hour");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
