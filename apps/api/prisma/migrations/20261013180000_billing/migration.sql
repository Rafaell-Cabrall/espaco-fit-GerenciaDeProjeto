-- Status da mensalidade passa a ser calculado pelo vencimento, que vira dia (Brasília)
ALTER TABLE "Subscription" DROP COLUMN "status",
  ALTER COLUMN "dueDate" TYPE DATE
    USING ("dueDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date;
DROP TYPE "SubscriptionStatus";
CREATE INDEX "Subscription_dueDate_idx" ON "Subscription"("dueDate");

-- Quem confirmou o pagamento manual
ALTER TABLE "Payment" ADD COLUMN "registeredById" TEXT;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
