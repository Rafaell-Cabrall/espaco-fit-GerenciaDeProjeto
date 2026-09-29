-- Anamnese pelo instrutor: consentimento vem depois (RN09) e observações do personal
ALTER TABLE "Anamnesis" ALTER COLUMN "consentAt" DROP NOT NULL,
  ADD COLUMN "instructorNotes" TEXT NOT NULL DEFAULT '';

-- Ficha com nome e período; fichas antigas ganham 90 dias a partir da criação
ALTER TABLE "WorkoutPlan" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Ficha',
  ADD COLUMN "startsOn" DATE,
  ADD COLUMN "endsOn" DATE;
UPDATE "WorkoutPlan" SET "startsOn" = "createdAt"::date,
  "endsOn" = ("createdAt" + interval '90 days')::date;
ALTER TABLE "WorkoutPlan" ALTER COLUMN "name" DROP DEFAULT,
  ALTER COLUMN "startsOn" SET NOT NULL,
  ALTER COLUMN "endsOn" SET NOT NULL;

ALTER TABLE "WorkoutDivision" ADD COLUMN "weekday" INTEGER;

-- Esforço 1–5 saiu do protótipo; feedback é o comentário por exercício, com lido/não lido
ALTER TABLE "WorkoutSession" DROP COLUMN "effort",
  DROP COLUMN "comment",
  ADD COLUMN "notesReadAt" TIMESTAMP(3);
