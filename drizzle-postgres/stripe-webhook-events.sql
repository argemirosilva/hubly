-- Migração aditiva local. Não altera clientes, planos ou assinaturas.
BEGIN;
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id varchar(255) COLLATE "C" PRIMARY KEY,
  type varchar(100) NOT NULL,
  livemode boolean NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
