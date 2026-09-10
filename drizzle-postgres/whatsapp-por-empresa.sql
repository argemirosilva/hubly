-- Credenciais globais não podem ser atribuídas arbitrariamente a uma empresa.
-- Se existirem, aborta sem apagar nada. Logs legados ficam com empresaId NULL.
BEGIN;
SET LOCAL lock_timeout = '10s';
DO $$
DECLARE old_pk text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='wa_session' AND column_name='empresaId') THEN
    LOCK TABLE public.wa_session IN ACCESS EXCLUSIVE MODE;
    IF EXISTS (SELECT 1 FROM public.wa_session) THEN
      RAISE EXCEPTION 'Sessão global existente: identificar empresa proprietária antes da migração';
    END IF;
    ALTER TABLE public.wa_session ADD COLUMN "empresaId" integer NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE;
    SELECT conname INTO old_pk FROM pg_constraint WHERE conrelid='public.wa_session'::regclass AND contype='p';
    IF old_pk IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.wa_session DROP CONSTRAINT %I', old_pk);
    END IF;
    ALTER TABLE public.wa_session ALTER COLUMN id TYPE varchar(200) COLLATE "C";
    ALTER TABLE public.wa_session ADD PRIMARY KEY ("empresaId", id);
  END IF;
END $$;
ALTER TABLE public.wa_connection_log ADD COLUMN IF NOT EXISTS "empresaId" integer;
CREATE INDEX IF NOT EXISTS wa_connection_log_empresa_date_idx ON public.wa_connection_log ("empresaId", "createdAt" DESC);
COMMIT;
