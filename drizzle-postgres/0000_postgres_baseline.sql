--
-- PostgreSQL database dump
--


-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;
CREATE EXTENSION IF NOT EXISTS unaccent;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: hubly_unicode_ci; Type: COLLATION; Schema: public; Owner: -
--

CREATE COLLATION public.hubly_unicode_ci (provider = icu, deterministic = false, locale = 'und-u-ks-level1');


--
-- Name: touch_0287589dafeb77286da19a47(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_0287589dafeb77286da19a47() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_09be97d1c66f6270c7d59ef2(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_09be97d1c66f6270c7d59ef2() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_12d7737d0c93151e6a9de6d4(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_12d7737d0c93151e6a9de6d4() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_13dd561f0a3e59e7e761113d(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_13dd561f0a3e59e7e761113d() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_1412ffbd87c43810525a6b86(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_1412ffbd87c43810525a6b86() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_24775ffe8d81bf3d71958604(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_24775ffe8d81bf3d71958604() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_26b5ba6eaa4b80c7ce19a872(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_26b5ba6eaa4b80c7ce19a872() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_3ffc2b31b7182c899061abf8(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_3ffc2b31b7182c899061abf8() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_40c63a463f09e5510585c954(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_40c63a463f09e5510585c954() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_48040dec8b87699ce56c58bf(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_48040dec8b87699ce56c58bf() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_4bff358adf179c4ffc00b156(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_4bff358adf179c4ffc00b156() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_54e3d3eb83bd11194d9a0a42(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_54e3d3eb83bd11194d9a0a42() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_5f17fcaab449b2b8a3289ddd(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_5f17fcaab449b2b8a3289ddd() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_67cabb4b07d52d2a43da45b8(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_67cabb4b07d52d2a43da45b8() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_68186116f9894ad91b53012f(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_68186116f9894ad91b53012f() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_6bdfedf4d94f7f0c5ef12604(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_6bdfedf4d94f7f0c5ef12604() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_75435c5e4f643d4d338947f4(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_75435c5e4f643d4d338947f4() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_7aea091b2e9844c30a263c23(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_7aea091b2e9844c30a263c23() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_7c07f22d6afc4ad7c117b0fa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_7c07f22d6afc4ad7c117b0fa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_8ab340c1d3898e35c7f841b8(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_8ab340c1d3898e35c7f841b8() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_8abd3b1b3a4f60032e8548ae(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_8abd3b1b3a4f60032e8548ae() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_916699cea3096666ff830140(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_916699cea3096666ff830140() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_918dc48762ff5d1fd0d54591(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_918dc48762ff5d1fd0d54591() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_942a09b7411589c22e28592e(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_942a09b7411589c22e28592e() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_97ded3912635781daa13f5e3(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_97ded3912635781daa13f5e3() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_9a39ab584454ae2e68422b7f(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_9a39ab584454ae2e68422b7f() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_9dddf33d31dc6ab2ea5bbd56(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_9dddf33d31dc6ab2ea5bbd56() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_b690fccf4c35b7a396716b03(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_b690fccf4c35b7a396716b03() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_c6484c2e4f3c369716b28dc2(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_c6484c2e4f3c369716b28dc2() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_d6150595f502a587325541ba(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_d6150595f502a587325541ba() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_d99d87bea27a74e9352c1a08(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_d99d87bea27a74e9352c1a08() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_da8d8869dc606cf286f37d23(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_da8d8869dc606cf286f37d23() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_e8c8c38828f0199ee264ebb0(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_e8c8c38828f0199ee264ebb0() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_ee212e9cb36a3058ac8689ed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_ee212e9cb36a3058ac8689ed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_ef930a3b4044d92ed685aaf7(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_ef930a3b4044d92ed685aaf7() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_f1d2f29d137a8c3f178d42f7(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_f1d2f29d137a8c3f178d42f7() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_f1e4e242e04adb919728c553(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_f1e4e242e04adb919728c553() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_f4aad2526e5f562f3b5271cc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_f4aad2526e5f562f3b5271cc() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_f58eee878dc2d9d1c62bf515(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_f58eee878dc2d9d1c62bf515() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


--
-- Name: touch_f7d451c76a61c25eee2dfd27(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_f7d451c76a61c25eee2dfd27() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN IF NEW IS DISTINCT FROM OLD AND NEW."updatedAt" IS NOT DISTINCT FROM OLD."updatedAt" THEN NEW."updatedAt" = CURRENT_TIMESTAMP; END IF; RETURN NEW; END $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.__drizzle_migrations (
    id bigint NOT NULL,
    hash text NOT NULL COLLATE public.hubly_unicode_ci,
    created_at bigint,
    CONSTRAINT __drizzle_migrations_id_check CHECK ((id >= 0))
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.__drizzle_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.__drizzle_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: agendamento_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agendamento_itens (
    id integer NOT NULL,
    "agendamentoId" integer NOT NULL,
    "servicoId" integer NOT NULL,
    "profissionalId" integer,
    "valorUnitario" numeric(10,2) NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "pacoteClienteItemId" integer,
    "horaInicio" character varying(5) COLLATE public.hubly_unicode_ci,
    "horaFim" character varying(5) COLLATE public.hubly_unicode_ci
);


--
-- Name: agendamento_itens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.agendamento_itens ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.agendamento_itens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: agendamento_pagamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agendamento_pagamentos (
    id integer NOT NULL,
    "agendamentoId" integer NOT NULL,
    valor numeric(10,2) NOT NULL,
    "meioPagamento" character varying(100) COLLATE public.hubly_unicode_ci,
    observacao text COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroParcelas" integer DEFAULT 1
);


--
-- Name: agendamento_pagamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.agendamento_pagamentos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.agendamento_pagamentos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: agendamento_pessoas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agendamento_pessoas (
    id integer NOT NULL,
    "agendamentoId" integer NOT NULL,
    "clienteId" integer NOT NULL,
    "isPrincipal" boolean DEFAULT false NOT NULL,
    role text DEFAULT 'acompanhante'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT agendamento_pessoas_role_check CHECK ((role = ANY (ARRAY['principal'::text, 'acompanhante'::text, 'dependente'::text, 'outro'::text])))
);


--
-- Name: agendamento_pessoas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.agendamento_pessoas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.agendamento_pessoas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: agendamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agendamentos (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "clienteId" integer NOT NULL,
    "profissionalId" integer,
    "servicoId" integer NOT NULL,
    data date NOT NULL,
    "horaInicio" time(0) without time zone NOT NULL,
    "horaFim" time(0) without time zone NOT NULL,
    status text DEFAULT 'agendado'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "valorTotal" numeric(10,2) NOT NULL,
    "valorReserva" numeric(10,2),
    "reservaPaga" boolean DEFAULT false,
    "reservaPagaEm" timestamp(0) with time zone,
    "reservaExpiracaoEm" timestamp(0) with time zone,
    "tipoPagamento" text COLLATE public.hubly_unicode_ci,
    observacoes text COLLATE public.hubly_unicode_ci,
    "observacoesInternas" text COLLATE public.hubly_unicode_ci,
    "confirmadoEm" timestamp(0) with time zone,
    "concluidoEm" timestamp(0) with time zone,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    imagens jsonb,
    desconto numeric(10,2) DEFAULT 0.00,
    "notificacaoEnviada" boolean DEFAULT false NOT NULL,
    "notificacaoEnviadaEm" timestamp(0) with time zone,
    "reservaLembreteEnviado" boolean DEFAULT false,
    "taxaAdicional" numeric(10,2) DEFAULT 0.00,
    "nomeTaxaAdicional" character varying(100) COLLATE public.hubly_unicode_ci,
    "minutosAtraso" integer DEFAULT 0,
    "pacoteClienteId" integer,
    CONSTRAINT agendamentos_status_check CHECK ((status = ANY (ARRAY['pre_agendado'::text, 'aguardando_reserva'::text, 'agendado'::text, 'confirmado'::text, 'em_andamento'::text, 'concluido'::text, 'cancelado'::text, 'faltou'::text, 'remarcado'::text]))),
    CONSTRAINT "agendamentos_tipoPagamento_check" CHECK (("tipoPagamento" = ANY (ARRAY['dinheiro'::text, 'pix'::text, 'cartao_debito'::text, 'cartao_credito'::text, 'outro'::text])))
);


--
-- Name: agendamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.agendamentos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.agendamentos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: alertas_financeiros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alertas_financeiros (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    tipo text NOT NULL COLLATE public.hubly_unicode_ci,
    prioridade text DEFAULT 'media'::text NOT NULL COLLATE public.hubly_unicode_ci,
    titulo character varying(200) NOT NULL COLLATE public.hubly_unicode_ci,
    mensagem text NOT NULL COLLATE public.hubly_unicode_ci,
    acao character varying(300) COLLATE public.hubly_unicode_ci,
    lido boolean DEFAULT false NOT NULL,
    "criadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT alertas_financeiros_prioridade_check CHECK ((prioridade = ANY (ARRAY['alta'::text, 'media'::text, 'baixa'::text]))),
    CONSTRAINT alertas_financeiros_tipo_check CHECK ((tipo = ANY (ARRAY['caixa_negativo'::text, 'contas_vencendo'::text, 'inadimplencia'::text, 'gastos_altos'::text, 'score_caiu'::text, 'receita_baixa'::text, 'concentracao_receita'::text, 'fluxo_negativo'::text, 'geral'::text])))
);


--
-- Name: alertas_financeiros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.alertas_financeiros ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.alertas_financeiros_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: analise_clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analise_clientes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "clienteId" integer NOT NULL,
    classificacao text NOT NULL COLLATE public.hubly_unicode_ci,
    "scoreCliente" integer NOT NULL,
    resumo text NOT NULL COLLATE public.hubly_unicode_ci,
    detalhes jsonb,
    "calculadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT analise_clientes_classificacao_check CHECK ((classificacao = ANY (ARRAY['principal'::text, 'bom_pagador'::text, 'em_crescimento'::text, 'em_queda'::text, 'inativo'::text, 'atraso_frequente'::text, 'risco'::text, 'novo'::text])))
);


--
-- Name: analise_clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.analise_clientes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.analise_clientes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: assinaturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assinaturas (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "planoId" integer NOT NULL,
    "stripeCustomerId" character varying(128) COLLATE public.hubly_unicode_ci,
    "stripeSubscriptionId" character varying(128) COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'trial'::text NOT NULL COLLATE public.hubly_unicode_ci,
    ciclo text DEFAULT 'mensal'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "trialFim" timestamp(0) with time zone,
    "periodoInicio" timestamp(0) with time zone,
    "periodoFim" timestamp(0) with time zone,
    "canceladaEm" timestamp(0) with time zone,
    "zapiInstanceId" character varying(255) COLLATE public.hubly_unicode_ci,
    "zapiToken" character varying(255) COLLATE public.hubly_unicode_ci,
    "zapiAtivo" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT assinaturas_ciclo_check CHECK ((ciclo = ANY (ARRAY['mensal'::text, 'anual'::text]))),
    CONSTRAINT assinaturas_status_check CHECK ((status = ANY (ARRAY['trial'::text, 'ativa'::text, 'inadimplente'::text, 'cancelada'::text, 'suspensa'::text])))
);


--
-- Name: assinaturas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.assinaturas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.assinaturas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: automacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automacoes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    descricao text COLLATE public.hubly_unicode_ci,
    "tipoGatilho" text NOT NULL COLLATE public.hubly_unicode_ci,
    evento character varying(100) COLLATE public.hubly_unicode_ci,
    "delayMinutos" integer,
    "dataFixaDia" integer,
    "dataFixaMes" integer,
    "dataFixaHora" time(0) without time zone,
    "diasAntesDepois" integer,
    "horaDisparo" time(0) without time zone,
    "canalEnvio" text DEFAULT 'whatsapp'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "tituloMensagem" character varying(255) COLLATE public.hubly_unicode_ci,
    "corpoMensagem" text NOT NULL COLLATE public.hubly_unicode_ci,
    "segmentacaoTipo" text DEFAULT 'todas'::text COLLATE public.hubly_unicode_ci,
    "segmentacaoValor" character varying(255) COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "flowJson" text COLLATE public.hubly_unicode_ci,
    "isTemplate" boolean DEFAULT false,
    "confirmacaoAutoAtivo" boolean DEFAULT false,
    "confirmacaoAutoHorasAntes" integer DEFAULT 2,
    "eventosAdicionais" text COLLATE public.hubly_unicode_ci,
    CONSTRAINT "automacoes_canalEnvio_check" CHECK (("canalEnvio" = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text]))),
    CONSTRAINT "automacoes_segmentacaoTipo_check" CHECK (("segmentacaoTipo" = ANY (ARRAY['todas'::text, 'por_profissional'::text, 'por_tag'::text]))),
    CONSTRAINT "automacoes_tipoGatilho_check" CHECK (("tipoGatilho" = ANY (ARRAY['evento'::text, 'data_fixa'::text, 'aniversario_mes'::text, 'dias_antes_agendamento'::text, 'horas_antes_agendamento'::text, 'horas_apos_agendamento'::text, 'dias_depois_agendamento'::text, 'manual'::text])))
);


--
-- Name: automacoes_excluidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automacoes_excluidas (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    evento character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    "automacaoNome" character varying(255) COLLATE public.hubly_unicode_ci,
    "excluidoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: automacoes_excluidas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.automacoes_excluidas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.automacoes_excluidas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: automacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.automacoes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.automacoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: base_conhecimento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.base_conhecimento (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    conteudo text NOT NULL COLLATE public.hubly_unicode_ci,
    categoria character varying(100) DEFAULT 'geral'::character varying COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: base_conhecimento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.base_conhecimento ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.base_conhecimento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bloqueios_agenda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bloqueios_agenda (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "profissionalId" integer NOT NULL,
    "dataInicio" date NOT NULL,
    "horaInicio" time(0) without time zone NOT NULL,
    "dataFim" date NOT NULL,
    "horaFim" time(0) without time zone NOT NULL,
    motivo character varying(500) COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'pendente'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "motivoRecusa" character varying(500) COLLATE public.hubly_unicode_ci,
    "aprovadoPorId" integer,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recorrencia text DEFAULT 'nenhuma'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "dataFimRecorrencia" character varying(10) COLLATE public.hubly_unicode_ci,
    CONSTRAINT bloqueios_agenda_recorrencia_check CHECK ((recorrencia = ANY (ARRAY['nenhuma'::text, 'semanal'::text, 'mensal'::text]))),
    CONSTRAINT bloqueios_agenda_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text])))
);


--
-- Name: bloqueios_agenda_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bloqueios_agenda ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.bloqueios_agenda_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: categorias_despesa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_despesa (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    cor character varying(7) DEFAULT '#6b7280'::character varying COLLATE public.hubly_unicode_ci,
    icone character varying(50) DEFAULT 'receipt'::character varying COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: categorias_despesa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.categorias_despesa ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.categorias_despesa_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: chamado_mensagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chamado_mensagens (
    id integer NOT NULL,
    "chamadoId" integer NOT NULL,
    "autorTipo" text NOT NULL COLLATE public.hubly_unicode_ci,
    "autorId" integer,
    "autorNome" character varying(255) COLLATE public.hubly_unicode_ci,
    conteudo text NOT NULL COLLATE public.hubly_unicode_ci,
    lido boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "chamado_mensagens_autorTipo_check" CHECK (("autorTipo" = ANY (ARRAY['cliente'::text, 'agente'::text, 'ia'::text])))
);


--
-- Name: chamado_mensagens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.chamado_mensagens ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.chamado_mensagens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: chamados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chamados (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    titulo character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'aberto'::text NOT NULL COLLATE public.hubly_unicode_ci,
    prioridade text DEFAULT 'media'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "agenteId" integer,
    "slaHoras" integer DEFAULT 48 NOT NULL,
    "slaVencidoEm" timestamp(0) with time zone,
    "primeiraRespostaEm" timestamp(0) with time zone,
    "resolvidoEm" timestamp(0) with time zone,
    "fechadoEm" timestamp(0) with time zone,
    "avaliacaoNota" integer,
    "avaliacaoComentario" text COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    produto character varying(50) DEFAULT 'hubly'::character varying NOT NULL COLLATE public.hubly_unicode_ci,
    CONSTRAINT chamados_prioridade_check CHECK ((prioridade = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text, 'critica'::text]))),
    CONSTRAINT chamados_status_check CHECK ((status = ANY (ARRAY['aberto'::text, 'em_atendimento'::text, 'aguardando_cliente'::text, 'resolvido'::text, 'fechado'::text])))
);


--
-- Name: chamados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.chamados ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.chamados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    email character varying(320) COLLATE public.hubly_unicode_ci,
    telefone character varying(20) COLLATE public.hubly_unicode_ci,
    whatsapp character varying(20) COLLATE public.hubly_unicode_ci,
    cpf character varying(14) COLLATE public.hubly_unicode_ci,
    "dataNascimento" date,
    endereco text COLLATE public.hubly_unicode_ci,
    observacoes text COLLATE public.hubly_unicode_ci,
    tags jsonb,
    "saldoSessoes" integer DEFAULT 0,
    "totalGasto" numeric(10,2) DEFAULT 0.00,
    "totalAtendimentos" integer DEFAULT 0,
    "ultimoAtendimento" timestamp(0) with time zone,
    ativo boolean DEFAULT true,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.clientes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.clientes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: comissoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comissoes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "profissionalId" integer NOT NULL,
    "agendamentoId" integer NOT NULL,
    "valorServico" numeric(10,2) NOT NULL,
    "percentualComissao" numeric(5,2) NOT NULL,
    "tipoPagamento" text COLLATE public.hubly_unicode_ci,
    "taxaMaquininha" numeric(10,2) DEFAULT 0.00,
    "custoReposicao" numeric(10,2) DEFAULT 0.00,
    "valorLiquido" numeric(10,2) NOT NULL,
    "valorComissao" numeric(10,2) NOT NULL,
    "receitaDona" numeric(10,2) DEFAULT 0.00,
    paga boolean DEFAULT false,
    "pagaEm" timestamp(0) with time zone,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "comissoes_tipoPagamento_check" CHECK (("tipoPagamento" = ANY (ARRAY['dinheiro'::text, 'pix'::text, 'cartao_debito'::text, 'cartao_credito'::text, 'outro'::text])))
);


--
-- Name: comissoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.comissoes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.comissoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: contas_pagar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contas_pagar (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    descricao character varying(200) NOT NULL COLLATE public.hubly_unicode_ci,
    valor numeric(10,2) NOT NULL,
    "dataVencimento" character varying(10) NOT NULL COLLATE public.hubly_unicode_ci,
    "dataPagamento" character varying(10) COLLATE public.hubly_unicode_ci,
    "categoriaId" integer,
    status_conta text DEFAULT 'pendente'::text NOT NULL COLLATE public.hubly_unicode_ci,
    recorrente boolean DEFAULT false NOT NULL,
    recorrencia_tipo text COLLATE public.hubly_unicode_ci,
    observacoes text COLLATE public.hubly_unicode_ci,
    fornecedor character varying(150) COLLATE public.hubly_unicode_ci,
    comprovante character varying(500) COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "meioPagamentoId" integer,
    CONSTRAINT contas_pagar_recorrencia_tipo_check CHECK ((recorrencia_tipo = ANY (ARRAY['semanal'::text, 'quinzenal'::text, 'mensal'::text, 'bimestral'::text, 'trimestral'::text, 'semestral'::text, 'anual'::text]))),
    CONSTRAINT contas_pagar_status_conta_check CHECK ((status_conta = ANY (ARRAY['pendente'::text, 'pago'::text, 'vencido'::text, 'cancelado'::text])))
);


--
-- Name: contas_pagar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.contas_pagar ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.contas_pagar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: contas_receber; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contas_receber (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    descricao character varying(200) NOT NULL COLLATE public.hubly_unicode_ci,
    valor numeric(10,2) NOT NULL,
    "dataVencimento" character varying(10) NOT NULL COLLATE public.hubly_unicode_ci,
    "dataRecebimento" character varying(10) COLLATE public.hubly_unicode_ci,
    status_receber text DEFAULT 'pendente'::text NOT NULL COLLATE public.hubly_unicode_ci,
    origem_receber text DEFAULT 'manual'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "origemId" integer,
    "clienteId" integer,
    "profissionalId" integer,
    tipo_pagamento_receber text COLLATE public.hubly_unicode_ci,
    observacoes text COLLATE public.hubly_unicode_ci,
    recorrente boolean DEFAULT false NOT NULL,
    recorrencia_tipo_receber text COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "meioPagamentoId" integer,
    CONSTRAINT contas_receber_origem_receber_check CHECK ((origem_receber = ANY (ARRAY['manual'::text, 'agendamento'::text, 'pacote'::text]))),
    CONSTRAINT contas_receber_recorrencia_tipo_receber_check CHECK ((recorrencia_tipo_receber = ANY (ARRAY['semanal'::text, 'quinzenal'::text, 'mensal'::text, 'bimestral'::text, 'trimestral'::text, 'semestral'::text, 'anual'::text]))),
    CONSTRAINT contas_receber_status_receber_check CHECK ((status_receber = ANY (ARRAY['pendente'::text, 'recebido'::text, 'vencido'::text, 'cancelado'::text]))),
    CONSTRAINT contas_receber_tipo_pagamento_receber_check CHECK ((tipo_pagamento_receber = ANY (ARRAY['dinheiro'::text, 'pix'::text, 'cartao_debito'::text, 'cartao_credito'::text, 'outro'::text])))
);


--
-- Name: contas_receber_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.contas_receber ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.contas_receber_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: convites_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.convites_usuario (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    email character varying(320) NOT NULL COLLATE public.hubly_unicode_ci,
    "grupoId" integer,
    token character varying(128) NOT NULL COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'pendente'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "expiresAt" timestamp(0) with time zone NOT NULL,
    "convidadoPorId" integer NOT NULL,
    "aceitoEm" timestamp(0) with time zone,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT convites_usuario_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'aceito'::text, 'expirado'::text])))
);


--
-- Name: convites_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.convites_usuario ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.convites_usuario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cores_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cores_status (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "corAgendado" character varying(7) DEFAULT '#3b82f6'::character varying COLLATE public.hubly_unicode_ci,
    "corConfirmado" character varying(7) DEFAULT '#10b981'::character varying COLLATE public.hubly_unicode_ci,
    "corConcluido" character varying(7) DEFAULT '#6b7280'::character varying COLLATE public.hubly_unicode_ci,
    "corCancelado" character varying(7) DEFAULT '#ef4444'::character varying COLLATE public.hubly_unicode_ci,
    "corFaltou" character varying(7) DEFAULT '#f59e0b'::character varying COLLATE public.hubly_unicode_ci,
    "corPreAgendado" character varying(7) DEFAULT '#8b5cf6'::character varying COLLATE public.hubly_unicode_ci,
    "corAguardandoReserva" character varying(7) DEFAULT '#f97316'::character varying COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cores_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cores_status ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cores_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: creditos_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creditos_cliente (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "clienteId" integer NOT NULL,
    valor numeric(10,2) NOT NULL,
    tipo text NOT NULL COLLATE public.hubly_unicode_ci,
    origem character varying(500) COLLATE public.hubly_unicode_ci,
    "agendamentoId" integer,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT creditos_cliente_tipo_check CHECK ((tipo = ANY (ARRAY['credito'::text, 'uso'::text, 'devolucao'::text])))
);


--
-- Name: creditos_cliente_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.creditos_cliente ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.creditos_cliente_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dashboard_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_config (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    layout jsonb NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: dashboard_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dashboard_config ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.dashboard_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nome character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    tipo text DEFAULT 'salao'::text NOT NULL COLLATE public.hubly_unicode_ci,
    telefone character varying(20) COLLATE public.hubly_unicode_ci,
    email character varying(320) COLLATE public.hubly_unicode_ci,
    endereco text COLLATE public.hubly_unicode_ci,
    "logoUrl" text COLLATE public.hubly_unicode_ci,
    "corPrimaria" character varying(7) DEFAULT '#1a1a2e'::character varying COLLATE public.hubly_unicode_ci,
    "corSecundaria" character varying(7) DEFAULT '#e8d5c4'::character varying COLLATE public.hubly_unicode_ci,
    "whatsappNumero" character varying(20) COLLATE public.hubly_unicode_ci,
    "whatsappApiKey" text COLLATE public.hubly_unicode_ci,
    "taxaMaquininha" numeric(5,2) DEFAULT 2.99,
    "percentualDona" numeric(5,2) DEFAULT 0.00,
    "reservaPercentual" numeric(5,2) DEFAULT 30.00,
    "reservaHorasExpiracao" integer DEFAULT 24,
    "ownerId" integer NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "portalAtivo" boolean DEFAULT false,
    "autoConfirmarPortal" boolean DEFAULT false,
    "portalHeaderUrl" text COLLATE public.hubly_unicode_ci,
    "portalMensagemBemVindo" text COLLATE public.hubly_unicode_ci,
    "horaAbertura" character varying(5) DEFAULT '08:00'::character varying COLLATE public.hubly_unicode_ci,
    "horaFechamento" character varying(5) DEFAULT '18:00'::character varying COLLATE public.hubly_unicode_ci,
    "diasFuncionamento" jsonb,
    "intervaloMinutos" integer DEFAULT 30,
    "waMsgConfirmacao" text COLLATE public.hubly_unicode_ci,
    "waMsgCancelamento" text COLLATE public.hubly_unicode_ci,
    "waMsgLembrete" text COLLATE public.hubly_unicode_ci,
    "portalSlug" character varying(100) COLLATE public.hubly_unicode_ci,
    "pipelineFavoritaId" integer,
    "onboardingConcluido" boolean DEFAULT false NOT NULL,
    timezone character varying(50) DEFAULT 'America/Sao_Paulo'::character varying NOT NULL COLLATE public.hubly_unicode_ci,
    "automacoesPausadas" boolean DEFAULT false NOT NULL,
    "envioDelaySegundos" integer DEFAULT 30 NOT NULL,
    "envioPorCiclo" integer DEFAULT 10 NOT NULL,
    "portalPoliticaCancelamento" text COLLATE public.hubly_unicode_ci,
    "portalCobraSinal" boolean DEFAULT true NOT NULL,
    CONSTRAINT empresas_tipo_check CHECK ((tipo = ANY (ARRAY['salao'::text, 'clinica'::text, 'barbearia'::text, 'consultorio'::text, 'outro'::text])))
);


--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.empresas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.empresas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: google_calendar_eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_eventos (
    id integer NOT NULL,
    "agendamentoId" integer NOT NULL,
    "userId" integer NOT NULL,
    "googleEventId" character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    "itemIndex" integer DEFAULT 0 NOT NULL,
    "calendarId" character varying(255) DEFAULT 'primary'::character varying NOT NULL COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: google_calendar_eventos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.google_calendar_eventos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.google_calendar_eventos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: google_calendar_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_tokens (
    id integer NOT NULL,
    "accessToken" text NOT NULL COLLATE public.hubly_unicode_ci,
    "refreshToken" text COLLATE public.hubly_unicode_ci,
    "expiresAt" timestamp(0) with time zone,
    email character varying(255) COLLATE public.hubly_unicode_ci,
    "calendarId" character varying(255) DEFAULT 'primary'::character varying COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "calendarNome" character varying(255) COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true NOT NULL,
    "empresaId" integer NOT NULL
);


--
-- Name: google_calendar_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.google_calendar_tokens ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.google_calendar_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: google_calendar_tokens_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_tokens_usuario (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    "accessToken" text NOT NULL COLLATE public.hubly_unicode_ci,
    "refreshToken" text COLLATE public.hubly_unicode_ci,
    "expiresAt" timestamp(0) with time zone,
    "calendarId" character varying(255) DEFAULT 'primary'::character varying COLLATE public.hubly_unicode_ci,
    "calendarNome" character varying(255) COLLATE public.hubly_unicode_ci,
    email character varying(320) COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "corEvento" character varying(7) COLLATE public.hubly_unicode_ci
);


--
-- Name: google_calendar_tokens_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.google_calendar_tokens_usuario ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.google_calendar_tokens_usuario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: grupos_permissoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupos_permissoes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    descricao text COLLATE public.hubly_unicode_ci,
    cor character varying(7) DEFAULT '#6366f1'::character varying COLLATE public.hubly_unicode_ci,
    "isDefault" boolean DEFAULT false,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isAdmin" boolean DEFAULT false
);


--
-- Name: grupos_permissoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.grupos_permissoes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.grupos_permissoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: historico_envios_automacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historico_envios_automacao (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "automacaoId" integer,
    "automacaoNome" character varying(255) COLLATE public.hubly_unicode_ci,
    "clienteId" integer,
    "clienteNome" character varying(255) COLLATE public.hubly_unicode_ci,
    telefone character varying(30) COLLATE public.hubly_unicode_ci,
    canal text DEFAULT 'whatsapp'::text NOT NULL COLLATE public.hubly_unicode_ci,
    mensagem text COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'enviado'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "erroDetalhe" text COLLATE public.hubly_unicode_ci,
    "criadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "agendamentoId" integer,
    "enviarEm" timestamp(0) with time zone,
    "servicoNome" character varying(255) COLLATE public.hubly_unicode_ci,
    is_teste boolean DEFAULT false,
    "midiaUrl" text COLLATE public.hubly_unicode_ci,
    "isTeste" boolean DEFAULT false,
    "zapiMessageId" character varying(255) COLLATE public.hubly_unicode_ci,
    "messageStatusAt" timestamp(0) with time zone,
    "messageStatus" text DEFAULT 'queued'::text COLLATE public.hubly_unicode_ci,
    "enviadoEm" timestamp(0) with time zone,
    "canceladoEm" timestamp(0) with time zone,
    "processandoEm" timestamp(0) with time zone,
    "dedupeKey" character varying(191) COLLATE public.hubly_unicode_ci,
    CONSTRAINT historico_envios_automacao_canal_check CHECK ((canal = ANY (ARRAY['whatsapp'::text, 'email'::text, 'sms'::text, 'lembrete'::text]))),
    CONSTRAINT "historico_envios_automacao_messageStatus_check" CHECK (("messageStatus" = ANY (ARRAY['queued'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT historico_envios_automacao_status_check CHECK ((status = ANY (ARRAY['enviado'::text, 'falhou'::text, 'pendente'::text, 'agendado'::text, 'processando'::text, 'cancelado'::text])))
);


--
-- Name: historico_envios_automacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.historico_envios_automacao ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.historico_envios_automacao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: insights_clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insights_clientes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    tipo text NOT NULL COLLATE public.hubly_unicode_ci,
    prioridade text DEFAULT 'media'::text NOT NULL COLLATE public.hubly_unicode_ci,
    titulo character varying(200) NOT NULL COLLATE public.hubly_unicode_ci,
    mensagem text NOT NULL COLLATE public.hubly_unicode_ci,
    acao character varying(300) COLLATE public.hubly_unicode_ci,
    lido boolean DEFAULT false NOT NULL,
    "criadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT insights_clientes_prioridade_check CHECK ((prioridade = ANY (ARRAY['alta'::text, 'media'::text, 'baixa'::text]))),
    CONSTRAINT insights_clientes_tipo_check CHECK ((tipo = ANY (ARRAY['concentracao_receita'::text, 'clientes_inativos'::text, 'inadimplencia_frequente'::text, 'cliente_em_queda'::text, 'cliente_importante_atrasou'::text, 'bons_clientes'::text, 'geral'::text])))
);


--
-- Name: insights_clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.insights_clientes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.insights_clientes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: marketing_metricas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_metricas (
    id integer NOT NULL,
    "postId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    visualizacoes integer DEFAULT 0,
    curtidas integer DEFAULT 0,
    comentarios integer DEFAULT 0,
    compartilhamentos integer DEFAULT 0,
    republicacoes integer DEFAULT 0,
    salvamentos integer DEFAULT 0,
    alcance integer DEFAULT 0,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: marketing_metricas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.marketing_metricas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.marketing_metricas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: marketing_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_posts (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    tipo character varying(100) DEFAULT 'outro'::character varying NOT NULL COLLATE public.hubly_unicode_ci,
    tema character varying(255) COLLATE public.hubly_unicode_ci,
    legenda text COLLATE public.hubly_unicode_ci,
    hashtags text COLLATE public.hubly_unicode_ci,
    "imagemUrl" character varying(1000) COLLATE public.hubly_unicode_ci,
    "imagemPrompt" text COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'rascunho'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "agendadoPara" timestamp(0) with time zone,
    "publicadoEm" timestamp(0) with time zone,
    "instagramPostId" character varying(255) COLLATE public.hubly_unicode_ci,
    observacoes text COLLATE public.hubly_unicode_ci,
    plataforma text DEFAULT 'instagram'::text COLLATE public.hubly_unicode_ci,
    formato text DEFAULT 'feed'::text COLLATE public.hubly_unicode_ci,
    "statusProducao" text DEFAULT 'planejado'::text COLLATE public.hubly_unicode_ci,
    "dataPublicacao" character varying(10) COLLATE public.hubly_unicode_ci,
    "horarioPublicacao" character varying(5) COLLATE public.hubly_unicode_ci,
    "responsavelId" integer,
    "responsavelNome" character varying(120) COLLATE public.hubly_unicode_ci,
    roteiro text COLLATE public.hubly_unicode_ci,
    tags character varying(500) COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT marketing_posts_formato_check CHECK ((formato = ANY (ARRAY['feed'::text, 'reels'::text, 'stories'::text, 'tiktok'::text, 'outro'::text]))),
    CONSTRAINT marketing_posts_plataforma_check CHECK ((plataforma = ANY (ARRAY['instagram'::text, 'tiktok'::text, 'ambos'::text]))),
    CONSTRAINT "marketing_posts_statusProducao_check" CHECK (("statusProducao" = ANY (ARRAY['planejado'::text, 'gravado'::text, 'editado'::text, 'programado'::text, 'postado'::text]))),
    CONSTRAINT marketing_posts_status_check CHECK ((status = ANY (ARRAY['rascunho'::text, 'aprovado'::text, 'agendado'::text, 'publicado'::text, 'arquivado'::text])))
);


--
-- Name: marketing_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.marketing_posts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.marketing_posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: marketing_tipos_conteudo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_tipos_conteudo (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    cor character varying(50) DEFAULT 'bg-gray-50 text-gray-600 border-gray-200'::character varying COLLATE public.hubly_unicode_ci,
    ordem integer DEFAULT 0,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: marketing_tipos_conteudo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.marketing_tipos_conteudo ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.marketing_tipos_conteudo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: marketing_tipos_ocultos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_tipos_ocultos (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "tipoValor" character varying(50) NOT NULL COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: marketing_tipos_ocultos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.marketing_tipos_ocultos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.marketing_tipos_ocultos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: meios_pagamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meios_pagamento (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    tipo character varying(30) NOT NULL COLLATE public.hubly_unicode_ci,
    "parcelamentoMaximo" integer DEFAULT 1 NOT NULL,
    "taxaFixa" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "descontarDoVendedor" boolean DEFAULT false NOT NULL,
    "descontarDoAtendente" boolean DEFAULT false NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: meios_pagamento_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.meios_pagamento ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.meios_pagamento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: membros_grupo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membros_grupo (
    id integer NOT NULL,
    "grupoId" integer NOT NULL,
    "userId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    "adicionadoPorId" integer,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: membros_grupo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.membros_grupo ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.membros_grupo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacoes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "destinatarioId" integer,
    tipo text COLLATE public.hubly_unicode_ci,
    titulo character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    mensagem text NOT NULL COLLATE public.hubly_unicode_ci,
    "dadosContexto" jsonb,
    lida boolean DEFAULT false,
    "lidaEm" timestamp(0) with time zone,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ocultada boolean DEFAULT false,
    "ocultadaEm" timestamp(0) without time zone,
    "agendamentoId" integer,
    CONSTRAINT notificacoes_tipo_check CHECK ((tipo = ANY (ARRAY['agendamento_criado'::text, 'agendamento_confirmado'::text, 'agendamento_cancelado'::text, 'agendamento_remarcado'::text, 'bloqueio_aprovado'::text, 'bloqueio_recusado'::text, 'bloqueio_solicitado'::text, 'bloqueio_cancelado'::text, 'reserva_expirada'::text, 'lembrete'::text, 'sistema'::text])))
);


--
-- Name: notificacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notificacoes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notificacoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notificacoes_pacotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacoes_pacotes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "pacoteClienteId" integer NOT NULL,
    "clienteId" integer NOT NULL,
    tipo text NOT NULL COLLATE public.hubly_unicode_ci,
    mensagem text NOT NULL COLLATE public.hubly_unicode_ci,
    "diasParaVencer" integer,
    "sessoesRestantes" integer,
    canal text DEFAULT 'sistema'::text NOT NULL COLLATE public.hubly_unicode_ci,
    lida boolean DEFAULT false NOT NULL,
    "enviadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT notificacoes_pacotes_canal_check CHECK ((canal = ANY (ARRAY['sistema'::text, 'whatsapp'::text, 'email'::text]))),
    CONSTRAINT notificacoes_pacotes_tipo_check CHECK ((tipo = ANY (ARRAY['vencimento_proximo'::text, 'sessoes_restantes'::text, 'pacote_vencido'::text])))
);


--
-- Name: notificacoes_pacotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notificacoes_pacotes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notificacoes_pacotes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pacotes_clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacotes_clientes (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "clienteId" integer NOT NULL,
    "modeloId" integer,
    nome character varying(150) NOT NULL COLLATE public.hubly_unicode_ci,
    "valorPago" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "formaPagamento" character varying(60) COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'ativo'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "dataAbertura" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dataVencimento" timestamp(0) with time zone,
    observacoes text COLLATE public.hubly_unicode_ci,
    "criadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "numeroParcelas" integer DEFAULT 1 NOT NULL,
    "valorParcela" numeric(10,2),
    "automacaoRenovacao" boolean DEFAULT false,
    "dataValidade" date,
    "valorTotal" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "valorRecebido" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "statusPagamento" text DEFAULT 'pendente'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "custoTotal" numeric(10,2) DEFAULT 0.00 NOT NULL,
    CONSTRAINT "pacotes_clientes_statusPagamento_check" CHECK (("statusPagamento" = ANY (ARRAY['pendente'::text, 'parcial'::text, 'pago'::text]))),
    CONSTRAINT pacotes_clientes_status_check CHECK ((status = ANY (ARRAY['ativo'::text, 'concluido'::text, 'vencido'::text, 'cancelado'::text])))
);


--
-- Name: pacotes_clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pacotes_clientes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pacotes_clientes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pacotes_clientes_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacotes_clientes_itens (
    id integer NOT NULL,
    "pacoteClienteId" integer NOT NULL,
    "servicoId" integer NOT NULL,
    "quantidadeTotal" integer DEFAULT 1 NOT NULL,
    "quantidadeUsada" integer DEFAULT 0 NOT NULL,
    "quantidadeReservada" integer DEFAULT 0 NOT NULL
);


--
-- Name: pacotes_clientes_itens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pacotes_clientes_itens ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pacotes_clientes_itens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pacotes_clientes_pagamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacotes_clientes_pagamentos (
    id integer NOT NULL,
    "pacoteClienteId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    valor numeric(10,2) NOT NULL,
    "formaPagamento" character varying(60) COLLATE public.hubly_unicode_ci,
    tipo text DEFAULT 'parcial'::text NOT NULL COLLATE public.hubly_unicode_ci,
    observacoes text COLLATE public.hubly_unicode_ci,
    "dataPagamento" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "criadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pacotes_clientes_pagamentos_tipo_check CHECK ((tipo = ANY (ARRAY['sinal'::text, 'parcial'::text, 'quitacao'::text])))
);


--
-- Name: pacotes_clientes_pagamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pacotes_clientes_pagamentos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pacotes_clientes_pagamentos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pacotes_modelos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacotes_modelos (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(150) NOT NULL COLLATE public.hubly_unicode_ci,
    descricao text COLLATE public.hubly_unicode_ci,
    preco numeric(10,2) DEFAULT 0.00 NOT NULL,
    "validadeDias" integer,
    ativo boolean DEFAULT true NOT NULL,
    "criadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    custo numeric(10,2) DEFAULT 0.00 NOT NULL
);


--
-- Name: pacotes_modelos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pacotes_modelos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pacotes_modelos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pacotes_modelos_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacotes_modelos_itens (
    id integer NOT NULL,
    "modeloId" integer NOT NULL,
    "servicoId" integer NOT NULL,
    quantidade integer DEFAULT 1 NOT NULL
);


--
-- Name: pacotes_modelos_itens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pacotes_modelos_itens ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pacotes_modelos_itens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permissoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissoes (
    id integer NOT NULL,
    "profissionalId" integer NOT NULL,
    "podeAgendar" boolean DEFAULT true,
    "podeCancelar" boolean DEFAULT false,
    "podeRemarcar" boolean DEFAULT false,
    "podeEditarCliente" boolean DEFAULT false,
    "podeSolicitarBloqueio" boolean DEFAULT true,
    "podeVerComissoes" boolean DEFAULT false,
    "podeVerFinanceiro" boolean DEFAULT false,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permissoes_grupo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissoes_grupo (
    id integer NOT NULL,
    "grupoId" integer NOT NULL,
    "agendamentosVer" boolean DEFAULT false,
    "agendamentosCriar" boolean DEFAULT false,
    "agendamentosEditar" boolean DEFAULT false,
    "agendamentosCancelar" boolean DEFAULT false,
    "agendamentosRemarcar" boolean DEFAULT false,
    "agendamentosConfirmar" boolean DEFAULT false,
    "agendamentosConcluir" boolean DEFAULT false,
    "agendamentosVerTodos" boolean DEFAULT false,
    "clientesVer" boolean DEFAULT false,
    "clientesCriar" boolean DEFAULT false,
    "clientesEditar" boolean DEFAULT false,
    "clientesExcluir" boolean DEFAULT false,
    "clientesVerHistorico" boolean DEFAULT false,
    "clientesVerProntuario" boolean DEFAULT false,
    "clientesEditarProntuario" boolean DEFAULT false,
    "clientesVerContato" boolean DEFAULT false,
    "profissionaisVer" boolean DEFAULT false,
    "profissionaisCriar" boolean DEFAULT false,
    "profissionaisEditar" boolean DEFAULT false,
    "profissionaisExcluir" boolean DEFAULT false,
    "profissionaisGerenciarPermissoes" boolean DEFAULT false,
    "servicosVer" boolean DEFAULT false,
    "servicosCriar" boolean DEFAULT false,
    "servicosEditar" boolean DEFAULT false,
    "servicosExcluir" boolean DEFAULT false,
    "financeiroVer" boolean DEFAULT false,
    "financeiroVerComissoes" boolean DEFAULT false,
    "financeiroEditarComissoes" boolean DEFAULT false,
    "financeiroVerReceita" boolean DEFAULT false,
    "financeiroVerCustos" boolean DEFAULT false,
    "financeiroMarcarPago" boolean DEFAULT false,
    "financeiroVerRelatorios" boolean DEFAULT false,
    "agendaSolicitarBloqueio" boolean DEFAULT false,
    "agendaAprovarBloqueio" boolean DEFAULT false,
    "agendaVerBloqueiosTodos" boolean DEFAULT false,
    "automacoesVer" boolean DEFAULT false,
    "automacoesCriar" boolean DEFAULT false,
    "automacoesEditar" boolean DEFAULT false,
    "automacoesExcluir" boolean DEFAULT false,
    "automacoesAtivar" boolean DEFAULT false,
    "notificacoesVer" boolean DEFAULT true,
    "relatoriosVer" boolean DEFAULT false,
    "relatoriosExportar" boolean DEFAULT false,
    "configuracoesVer" boolean DEFAULT false,
    "configuracoesEditar" boolean DEFAULT false,
    "usuariosVer" boolean DEFAULT false,
    "usuariosConvidar" boolean DEFAULT false,
    "usuariosEditar" boolean DEFAULT false,
    "usuariosRemover" boolean DEFAULT false,
    "gruposVer" boolean DEFAULT false,
    "gruposCriar" boolean DEFAULT false,
    "gruposEditar" boolean DEFAULT false,
    "gruposExcluir" boolean DEFAULT false,
    "dashboardVer" boolean DEFAULT false,
    "dashboardVerMetricas" boolean DEFAULT false,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "pacotesVer" boolean DEFAULT false,
    "pacotesEditar" boolean DEFAULT false,
    "pacotesExcluir" boolean DEFAULT false,
    "agendaEscopo" text DEFAULT 'proprio'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "calendarioEscopo" text DEFAULT 'proprio'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "notificacoesEscopo" text DEFAULT 'proprio'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "financeiroEscopo" text DEFAULT 'proprio'::text COLLATE public.hubly_unicode_ci,
    CONSTRAINT "permissoes_grupo_agendaEscopo_check" CHECK (("agendaEscopo" = ANY (ARRAY['proprio'::text, 'todos'::text]))),
    CONSTRAINT "permissoes_grupo_calendarioEscopo_check" CHECK (("calendarioEscopo" = ANY (ARRAY['proprio'::text, 'todos'::text]))),
    CONSTRAINT "permissoes_grupo_financeiroEscopo_check" CHECK (("financeiroEscopo" = ANY (ARRAY['proprio'::text, 'todos'::text]))),
    CONSTRAINT "permissoes_grupo_notificacoesEscopo_check" CHECK (("notificacoesEscopo" = ANY (ARRAY['proprio'::text, 'todos'::text])))
);


--
-- Name: permissoes_grupo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.permissoes_grupo ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.permissoes_grupo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permissoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.permissoes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.permissoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permissoes_individuais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissoes_individuais (
    id integer NOT NULL,
    "profissionalId" integer NOT NULL,
    "agendamentosVer" boolean,
    "agendamentosCriar" boolean,
    "agendamentosEditar" boolean,
    "agendamentosCancelar" boolean,
    "agendamentosRemarcar" boolean,
    "agendamentosConfirmar" boolean,
    "agendamentosConcluir" boolean,
    "agendamentosVerTodos" boolean,
    "clientesVer" boolean,
    "clientesCriar" boolean,
    "clientesEditar" boolean,
    "clientesExcluir" boolean,
    "clientesVerHistorico" boolean,
    "clientesVerProntuario" boolean,
    "clientesEditarProntuario" boolean,
    "clientesVerContato" boolean,
    "profissionaisVer" boolean,
    "profissionaisCriar" boolean,
    "profissionaisEditar" boolean,
    "profissionaisExcluir" boolean,
    "profissionaisGerenciarPermissoes" boolean,
    "servicosVer" boolean,
    "servicosCriar" boolean,
    "servicosEditar" boolean,
    "servicosExcluir" boolean,
    "financeiroVer" boolean,
    "financeiroVerComissoes" boolean,
    "financeiroEditarComissoes" boolean,
    "financeiroVerReceita" boolean,
    "financeiroVerCustos" boolean,
    "financeiroMarcarPago" boolean,
    "financeiroVerRelatorios" boolean,
    "agendaSolicitarBloqueio" boolean,
    "agendaAprovarBloqueio" boolean,
    "agendaVerBloqueiosTodos" boolean,
    "automacoesVer" boolean,
    "automacoesCriar" boolean,
    "automacoesEditar" boolean,
    "automacoesExcluir" boolean,
    "automacoesAtivar" boolean,
    "notificacoesVer" boolean,
    "relatoriosVer" boolean,
    "relatoriosExportar" boolean,
    "configuracoesVer" boolean,
    "configuracoesEditar" boolean,
    "usuariosVer" boolean,
    "usuariosConvidar" boolean,
    "usuariosEditar" boolean,
    "usuariosRemover" boolean,
    "gruposVer" boolean,
    "gruposCriar" boolean,
    "gruposEditar" boolean,
    "gruposExcluir" boolean,
    "dashboardVer" boolean,
    "dashboardVerMetricas" boolean,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permissoes_individuais_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.permissoes_individuais ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.permissoes_individuais_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pipeline_cartoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipeline_cartoes (
    id integer NOT NULL,
    "colunaId" integer NOT NULL,
    "pipelineId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    titulo character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    descricao text COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'em_andamento'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "clienteId" integer,
    "clienteNome" character varying(120) COLLATE public.hubly_unicode_ci,
    "responsavelId" integer,
    "responsavelNome" character varying(120) COLLATE public.hubly_unicode_ci,
    lembrete character varying(10) COLLATE public.hubly_unicode_ci,
    valor numeric(10,2),
    ordem integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "agendamentoId" integer,
    CONSTRAINT pipeline_cartoes_status_check CHECK ((status = ANY (ARRAY['em_andamento'::text, 'congelado'::text, 'cancelado'::text, 'concluido'::text])))
);


--
-- Name: pipeline_cartoes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pipeline_cartoes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pipeline_cartoes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pipeline_colunas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipeline_colunas (
    id integer NOT NULL,
    "pipelineId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(120) NOT NULL COLLATE public.hubly_unicode_ci,
    ordem integer DEFAULT 0 NOT NULL,
    cor character varying(7) DEFAULT '#6366f1'::character varying COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "statusVinculo" character varying(50) COLLATE public.hubly_unicode_ci
);


--
-- Name: pipeline_colunas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pipeline_colunas ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pipeline_colunas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pipeline_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipeline_snapshots (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "pipelineId" integer NOT NULL,
    "nomePipeline" character varying(120) NOT NULL COLLATE public.hubly_unicode_ci,
    snapshot text NOT NULL COLLATE public.hubly_unicode_ci,
    "geradoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pipeline_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pipeline_snapshots ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pipeline_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pipelines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipelines (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(120) NOT NULL COLLATE public.hubly_unicode_ci,
    ordem integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pipelines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pipelines ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pipelines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: planos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planos (
    id integer NOT NULL,
    nome character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    descricao text COLLATE public.hubly_unicode_ci,
    "precoMensal" numeric(10,2) NOT NULL,
    "precoAnual" numeric(10,2) NOT NULL,
    "stripeProductId" character varying(128) COLLATE public.hubly_unicode_ci,
    "stripePriceIdMensal" character varying(128) COLLATE public.hubly_unicode_ci,
    "stripePriceIdAnual" character varying(128) COLLATE public.hubly_unicode_ci,
    "apiWhatsapp" text DEFAULT 'baileys'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "limiteUsuarios" integer DEFAULT 3 NOT NULL,
    "limiteAgendamentosMes" integer DEFAULT 200 NOT NULL,
    "temIaFinanceira" boolean DEFAULT false NOT NULL,
    "temIaClientes" boolean DEFAULT false NOT NULL,
    "temPortalPublico" boolean DEFAULT true NOT NULL,
    "temAutomacoes" boolean DEFAULT true NOT NULL,
    "temPipeline" boolean DEFAULT false NOT NULL,
    "slaSuporteHoras" integer DEFAULT 48 NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    recursos jsonb,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "planos_apiWhatsapp_check" CHECK (("apiWhatsapp" = ANY (ARRAY['baileys'::text, 'zapi'::text])))
);


--
-- Name: planos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.planos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.planos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profissionais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profissionais (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "userId" integer,
    nome character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    email character varying(320) COLLATE public.hubly_unicode_ci,
    telefone character varying(20) COLLATE public.hubly_unicode_ci,
    especialidade character varying(255) COLLATE public.hubly_unicode_ci,
    "corCalendario" character varying(7) DEFAULT '#7c3aed'::character varying COLLATE public.hubly_unicode_ci,
    "avatarUrl" text COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isProfissional" boolean DEFAULT true NOT NULL,
    "temAcesso" boolean DEFAULT false NOT NULL,
    "passwordHash" character varying(255) COLLATE public.hubly_unicode_ci,
    "grupoId" integer,
    "ultimoAcesso" timestamp(0) with time zone,
    "criadoPorId" integer,
    "percentualComissao" numeric(5,2) DEFAULT 0.00,
    "isOwner" boolean DEFAULT false NOT NULL
);


--
-- Name: profissionais_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.profissionais ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.profissionais_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profissional_tipos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profissional_tipos (
    id integer NOT NULL,
    "profissionalId" integer NOT NULL,
    "tipoProfissionalId" integer NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: profissional_tipos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.profissional_tipos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.profissional_tipos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profissionalservicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profissionalservicos (
    id integer NOT NULL,
    "profissionalId" integer NOT NULL,
    "servicoId" integer NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: profissionalservicos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.profissionalservicos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.profissionalservicos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prontuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prontuarios (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "clienteId" integer NOT NULL,
    "agendamentoId" integer,
    "profissionalId" integer,
    titulo character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    conteudo text COLLATE public.hubly_unicode_ci,
    tipo text DEFAULT 'evolucao'::text COLLATE public.hubly_unicode_ci,
    "arquivoUrl" text COLLATE public.hubly_unicode_ci,
    "arquivoKey" text COLLATE public.hubly_unicode_ci,
    "arquivoNome" character varying(255) COLLATE public.hubly_unicode_ci,
    "arquivoTipo" character varying(100) COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT prontuarios_tipo_check CHECK ((tipo = ANY (ARRAY['anamnese'::text, 'evolucao'::text, 'foto'::text, 'documento'::text, 'contrato'::text, 'outro'::text])))
);


--
-- Name: prontuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.prontuarios ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.prontuarios_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    endpoint text NOT NULL COLLATE public.hubly_unicode_ci,
    p256dh text NOT NULL COLLATE public.hubly_unicode_ci,
    auth text NOT NULL COLLATE public.hubly_unicode_ci,
    "userAgent" character varying(500) COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.push_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: score_financeiro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.score_financeiro (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    score integer NOT NULL,
    status text NOT NULL COLLATE public.hubly_unicode_ci,
    explicacao text NOT NULL COLLATE public.hubly_unicode_ci,
    motivos jsonb NOT NULL,
    dicas jsonb NOT NULL,
    detalhes jsonb,
    "calculadoEm" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT score_financeiro_status_check CHECK ((status = ANY (ARRAY['saudavel'::text, 'atencao'::text, 'risco'::text])))
);


--
-- Name: score_financeiro_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.score_financeiro ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.score_financeiro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: servicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicos (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    descricao text COLLATE public.hubly_unicode_ci,
    valor numeric(10,2) NOT NULL,
    "duracaoMinutos" integer DEFAULT 60,
    categoria character varying(100) COLLATE public.hubly_unicode_ci,
    cor character varying(7) DEFAULT '#7c3aed'::character varying COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "percentualComissao" numeric(5,2) DEFAULT 0.00,
    "custoFixo" numeric(10,2) DEFAULT 0.00
);


--
-- Name: servicos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.servicos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.servicos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "planType" text DEFAULT 'FREE'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "billingCycle" text DEFAULT 'monthly'::text NOT NULL COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'trial'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "trialEnd" timestamp(0) with time zone,
    "currentPeriodStart" timestamp(0) with time zone,
    "currentPeriodEnd" timestamp(0) with time zone,
    "stripeCustomerId" character varying(128) COLLATE public.hubly_unicode_ci,
    "stripeSubscriptionId" character varying(128) COLLATE public.hubly_unicode_ci,
    "cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "subscriptions_billingCycle_check" CHECK (("billingCycle" = ANY (ARRAY['monthly'::text, 'annual'::text]))),
    CONSTRAINT "subscriptions_planType_check" CHECK (("planType" = ANY (ARRAY['FREE'::text, 'SOLO'::text, 'PLUS'::text, 'PRO'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trial'::text, 'past_due'::text, 'canceled'::text, 'paused'::text, 'suspended'::text])))
);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sync_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_audit_log (
    id bigint NOT NULL,
    "clientId" character varying(80) NOT NULL COLLATE public.hubly_unicode_ci,
    rota character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    "statusCode" integer NOT NULL,
    "recordsEntregues" integer DEFAULT 0 NOT NULL,
    "cursorSolicitado" character varying(100) COLLATE public.hubly_unicode_ci,
    "ipHash" character varying(128) COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sync_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sync_audit_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sync_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sync_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_change_log (
    cursor bigint NOT NULL,
    "empresaId" integer,
    entity character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    "recordId" character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    operation text NOT NULL COLLATE public.hubly_unicode_ci,
    "payloadJson" text COLLATE public.hubly_unicode_ci,
    "schemaVersion" character varying(20) DEFAULT 'v1'::character varying NOT NULL COLLATE public.hubly_unicode_ci,
    "occurredAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sync_change_log_operation_check CHECK ((operation = ANY (ARRAY['upsert'::text, 'delete'::text])))
);


--
-- Name: sync_change_log_cursor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sync_change_log ALTER COLUMN cursor ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sync_change_log_cursor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sync_inbound_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_inbound_requests (
    id bigint NOT NULL,
    "requestKey" character varying(64) NOT NULL COLLATE public.hubly_unicode_ci,
    "clientId" character varying(80) NOT NULL COLLATE public.hubly_unicode_ci,
    "requestId" character varying(64) NOT NULL COLLATE public.hubly_unicode_ci,
    "bodyHash" character varying(64) NOT NULL COLLATE public.hubly_unicode_ci,
    status text DEFAULT 'processing'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "responseJson" text COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sync_inbound_requests_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'processed'::text])))
);


--
-- Name: sync_inbound_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sync_inbound_requests ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sync_inbound_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sync_integration_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_integration_clients (
    id integer NOT NULL,
    "clientId" character varying(80) NOT NULL COLLATE public.hubly_unicode_ci,
    nome character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    "secretHash" character varying(128) NOT NULL COLLATE public.hubly_unicode_ci,
    escopo character varying(100) DEFAULT 'sync.read.all'::character varying NOT NULL COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true NOT NULL,
    "criadoPorUserId" integer,
    "ultimoUsoEm" timestamp(0) with time zone,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "empresaId" integer,
    "companyKeyHash" character varying(128) COLLATE public.hubly_unicode_ci,
    "sourceSystem" character varying(100) COLLATE public.hubly_unicode_ci
);


--
-- Name: sync_integration_clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sync_integration_clients ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sync_integration_clients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sync_marketing_idea_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_marketing_idea_links (
    id bigint NOT NULL,
    "linkKey" character varying(64) NOT NULL COLLATE public.hubly_unicode_ci,
    "clientId" character varying(80) NOT NULL COLLATE public.hubly_unicode_ci,
    "externalId" character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    "marketingPostId" integer NOT NULL,
    "updatedAtSource" character varying(35) NOT NULL COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sync_marketing_idea_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sync_marketing_idea_links ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.sync_marketing_idea_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sync_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_snapshots (
    id character varying(64) NOT NULL COLLATE public.hubly_unicode_ci,
    "clientId" character varying(80) NOT NULL COLLATE public.hubly_unicode_ci,
    "manifestJson" text COLLATE public.hubly_unicode_ci,
    "snapshotCursor" bigint DEFAULT '0'::bigint NOT NULL,
    "expiresAt" timestamp(0) with time zone NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: system_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_users (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(120) NOT NULL COLLATE public.hubly_unicode_ci,
    email character varying(320) NOT NULL COLLATE public.hubly_unicode_ci,
    "passwordHash" character varying(255) NOT NULL COLLATE public.hubly_unicode_ci,
    "grupoId" integer,
    ativo boolean DEFAULT true NOT NULL,
    "ultimoAcesso" timestamp(0) with time zone,
    "criadoPorId" integer,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "profissionalId" integer,
    "avatarUrl" text COLLATE public.hubly_unicode_ci
);


--
-- Name: system_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.system_users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.system_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: taxas_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taxas_config (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    valor numeric(10,2) NOT NULL,
    tipo text DEFAULT 'fixo'::text NOT NULL COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT taxas_config_tipo_check CHECK ((tipo = ANY (ARRAY['fixo'::text, 'percentual'::text])))
);


--
-- Name: taxas_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.taxas_config ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.taxas_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: taxas_parcela; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taxas_parcela (
    id integer NOT NULL,
    "meioPagamentoId" integer NOT NULL,
    parcela integer NOT NULL,
    taxa numeric(5,2) NOT NULL
);


--
-- Name: taxas_parcela_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.taxas_parcela ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.taxas_parcela_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tipos_profissional; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_profissional (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    nome character varying(100) NOT NULL COLLATE public.hubly_unicode_ci,
    cor character varying(7) DEFAULT '#7c3aed'::character varying COLLATE public.hubly_unicode_ci,
    ativo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tipos_profissional_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tipos_profissional ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.tipos_profissional_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tokens_confirmacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens_confirmacao (
    id integer NOT NULL,
    "agendamentoId" integer NOT NULL,
    "empresaId" integer NOT NULL,
    token character varying(64) NOT NULL COLLATE public.hubly_unicode_ci,
    "expiresAt" timestamp(0) with time zone NOT NULL,
    "usadoEm" timestamp(0) with time zone,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tokens_confirmacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tokens_confirmacao ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.tokens_confirmacao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: usage_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_alerts (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "alertType" character varying(64) NOT NULL COLLATE public.hubly_unicode_ci,
    "mesAno" character varying(7) NOT NULL COLLATE public.hubly_unicode_ci,
    "sentAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usage_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usage_alerts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.usage_alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: usage_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_tracker (
    id integer NOT NULL,
    "empresaId" integer NOT NULL,
    "mesAno" character varying(7) NOT NULL COLLATE public.hubly_unicode_ci,
    "agendamentosCount" integer DEFAULT 0 NOT NULL,
    "notificacoesWhatsappCount" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usage_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usage_tracker ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.usage_tracker_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    "openId" character varying(64) NOT NULL COLLATE public.hubly_unicode_ci,
    name text COLLATE public.hubly_unicode_ci,
    email character varying(320) COLLATE public.hubly_unicode_ci,
    "loginMethod" character varying(64) COLLATE public.hubly_unicode_ci,
    role text DEFAULT 'user'::text NOT NULL COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSignedIn" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "pushToken" text COLLATE public.hubly_unicode_ci,
    "pushTokenPlatform" text COLLATE public.hubly_unicode_ci,
    "pushTokenUpdatedAt" timestamp(0) with time zone,
    "notifNovoAgendamento" boolean DEFAULT true,
    "notifConfirmacao" boolean DEFAULT true,
    "notifCancelamento" boolean DEFAULT true,
    "notifLembrete" boolean DEFAULT true,
    "notifPagamento" boolean DEFAULT true,
    "notifComissao" boolean DEFAULT true,
    CONSTRAINT "users_pushTokenPlatform_check" CHECK (("pushTokenPlatform" = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text]))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: wa_connection_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wa_connection_log (
    id integer NOT NULL,
    event text NOT NULL COLLATE public.hubly_unicode_ci,
    detail character varying(500) COLLATE public.hubly_unicode_ci,
    "createdAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "statusCode" integer,
    motivo character varying(100) COLLATE public.hubly_unicode_ci,
    "duracaoSessaoMs" bigint,
    tentativa integer,
    "detalheTecnico" text COLLATE public.hubly_unicode_ci,
    telefone character varying(30) COLLATE public.hubly_unicode_ci,
    CONSTRAINT wa_connection_log_event_check CHECK ((event = ANY (ARRAY['connected'::text, 'disconnected'::text, 'qr_ready'::text, 'logged_out'::text, 'reconnecting'::text, 'reconnect_attempt'::text, 'error'::text])))
);


--
-- Name: wa_connection_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.wa_connection_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.wa_connection_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: wa_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wa_session (
    id character varying(200) NOT NULL COLLATE public.hubly_unicode_ci,
    data text NOT NULL COLLATE public.hubly_unicode_ci,
    "updatedAt" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: agendamento_itens agendamento_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamento_itens
    ADD CONSTRAINT agendamento_itens_pkey PRIMARY KEY (id);


--
-- Name: agendamento_pagamentos agendamento_pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamento_pagamentos
    ADD CONSTRAINT agendamento_pagamentos_pkey PRIMARY KEY (id);


--
-- Name: agendamento_pessoas agendamento_pessoas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamento_pessoas
    ADD CONSTRAINT agendamento_pessoas_pkey PRIMARY KEY (id);


--
-- Name: agendamentos agendamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_pkey PRIMARY KEY (id);


--
-- Name: alertas_financeiros alertas_financeiros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alertas_financeiros
    ADD CONSTRAINT alertas_financeiros_pkey PRIMARY KEY (id);


--
-- Name: analise_clientes analise_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analise_clientes
    ADD CONSTRAINT analise_clientes_pkey PRIMARY KEY (id);


--
-- Name: assinaturas assinaturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_pkey PRIMARY KEY (id);


--
-- Name: automacoes_excluidas automacoes_excluidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automacoes_excluidas
    ADD CONSTRAINT automacoes_excluidas_pkey PRIMARY KEY (id);


--
-- Name: automacoes automacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automacoes
    ADD CONSTRAINT automacoes_pkey PRIMARY KEY (id);


--
-- Name: base_conhecimento base_conhecimento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_conhecimento
    ADD CONSTRAINT base_conhecimento_pkey PRIMARY KEY (id);


--
-- Name: bloqueios_agenda bloqueios_agenda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bloqueios_agenda
    ADD CONSTRAINT bloqueios_agenda_pkey PRIMARY KEY (id);


--
-- Name: categorias_despesa categorias_despesa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_despesa
    ADD CONSTRAINT categorias_despesa_pkey PRIMARY KEY (id);


--
-- Name: chamado_mensagens chamado_mensagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chamado_mensagens
    ADD CONSTRAINT chamado_mensagens_pkey PRIMARY KEY (id);


--
-- Name: chamados chamados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chamados
    ADD CONSTRAINT chamados_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: comissoes comissoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comissoes
    ADD CONSTRAINT comissoes_pkey PRIMARY KEY (id);


--
-- Name: contas_pagar contas_pagar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas_pagar
    ADD CONSTRAINT contas_pagar_pkey PRIMARY KEY (id);


--
-- Name: contas_receber contas_receber_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas_receber
    ADD CONSTRAINT contas_receber_pkey PRIMARY KEY (id);


--
-- Name: convites_usuario convites_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convites_usuario
    ADD CONSTRAINT convites_usuario_pkey PRIMARY KEY (id);


--
-- Name: cores_status cores_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cores_status
    ADD CONSTRAINT cores_status_pkey PRIMARY KEY (id);


--
-- Name: creditos_cliente creditos_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditos_cliente
    ADD CONSTRAINT creditos_cliente_pkey PRIMARY KEY (id);


--
-- Name: dashboard_config dashboard_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_config
    ADD CONSTRAINT dashboard_config_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_eventos google_calendar_eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_eventos
    ADD CONSTRAINT google_calendar_eventos_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_tokens google_calendar_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_pkey PRIMARY KEY (id);


--
-- Name: google_calendar_tokens_usuario google_calendar_tokens_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens_usuario
    ADD CONSTRAINT google_calendar_tokens_usuario_pkey PRIMARY KEY (id);


--
-- Name: grupos_permissoes grupos_permissoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos_permissoes
    ADD CONSTRAINT grupos_permissoes_pkey PRIMARY KEY (id);


--
-- Name: historico_envios_automacao historico_envios_automacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_envios_automacao
    ADD CONSTRAINT historico_envios_automacao_pkey PRIMARY KEY (id);


--
-- Name: insights_clientes insights_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insights_clientes
    ADD CONSTRAINT insights_clientes_pkey PRIMARY KEY (id);


--
-- Name: marketing_metricas marketing_metricas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_metricas
    ADD CONSTRAINT marketing_metricas_pkey PRIMARY KEY (id);


--
-- Name: marketing_posts marketing_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_posts
    ADD CONSTRAINT marketing_posts_pkey PRIMARY KEY (id);


--
-- Name: marketing_tipos_conteudo marketing_tipos_conteudo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_tipos_conteudo
    ADD CONSTRAINT marketing_tipos_conteudo_pkey PRIMARY KEY (id);


--
-- Name: marketing_tipos_ocultos marketing_tipos_ocultos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_tipos_ocultos
    ADD CONSTRAINT marketing_tipos_ocultos_pkey PRIMARY KEY (id);


--
-- Name: meios_pagamento meios_pagamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meios_pagamento
    ADD CONSTRAINT meios_pagamento_pkey PRIMARY KEY (id);


--
-- Name: membros_grupo membros_grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membros_grupo
    ADD CONSTRAINT membros_grupo_pkey PRIMARY KEY (id);


--
-- Name: notificacoes_pacotes notificacoes_pacotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes_pacotes
    ADD CONSTRAINT notificacoes_pacotes_pkey PRIMARY KEY (id);


--
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);


--
-- Name: pacotes_clientes_itens pacotes_clientes_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_clientes_itens
    ADD CONSTRAINT pacotes_clientes_itens_pkey PRIMARY KEY (id);


--
-- Name: pacotes_clientes_pagamentos pacotes_clientes_pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_clientes_pagamentos
    ADD CONSTRAINT pacotes_clientes_pagamentos_pkey PRIMARY KEY (id);


--
-- Name: pacotes_clientes pacotes_clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_clientes
    ADD CONSTRAINT pacotes_clientes_pkey PRIMARY KEY (id);


--
-- Name: pacotes_modelos_itens pacotes_modelos_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_modelos_itens
    ADD CONSTRAINT pacotes_modelos_itens_pkey PRIMARY KEY (id);


--
-- Name: pacotes_modelos pacotes_modelos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_modelos
    ADD CONSTRAINT pacotes_modelos_pkey PRIMARY KEY (id);


--
-- Name: permissoes_grupo permissoes_grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissoes_grupo
    ADD CONSTRAINT permissoes_grupo_pkey PRIMARY KEY (id);


--
-- Name: permissoes_individuais permissoes_individuais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissoes_individuais
    ADD CONSTRAINT permissoes_individuais_pkey PRIMARY KEY (id);


--
-- Name: permissoes permissoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissoes
    ADD CONSTRAINT permissoes_pkey PRIMARY KEY (id);


--
-- Name: pipeline_cartoes pipeline_cartoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_cartoes
    ADD CONSTRAINT pipeline_cartoes_pkey PRIMARY KEY (id);


--
-- Name: pipeline_colunas pipeline_colunas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_colunas
    ADD CONSTRAINT pipeline_colunas_pkey PRIMARY KEY (id);


--
-- Name: pipeline_snapshots pipeline_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_snapshots
    ADD CONSTRAINT pipeline_snapshots_pkey PRIMARY KEY (id);


--
-- Name: pipelines pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipelines
    ADD CONSTRAINT pipelines_pkey PRIMARY KEY (id);


--
-- Name: planos planos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planos
    ADD CONSTRAINT planos_pkey PRIMARY KEY (id);


--
-- Name: profissionais profissionais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profissionais
    ADD CONSTRAINT profissionais_pkey PRIMARY KEY (id);


--
-- Name: profissional_tipos profissional_tipos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profissional_tipos
    ADD CONSTRAINT profissional_tipos_pkey PRIMARY KEY (id);


--
-- Name: profissionalservicos profissionalservicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profissionalservicos
    ADD CONSTRAINT profissionalservicos_pkey PRIMARY KEY (id);


--
-- Name: prontuarios prontuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prontuarios
    ADD CONSTRAINT prontuarios_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: score_financeiro score_financeiro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_financeiro
    ADD CONSTRAINT score_financeiro_pkey PRIMARY KEY (id);


--
-- Name: servicos servicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: sync_audit_log sync_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_audit_log
    ADD CONSTRAINT sync_audit_log_pkey PRIMARY KEY (id);


--
-- Name: sync_change_log sync_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_change_log
    ADD CONSTRAINT sync_change_log_pkey PRIMARY KEY (cursor);


--
-- Name: sync_inbound_requests sync_inbound_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_inbound_requests
    ADD CONSTRAINT sync_inbound_requests_pkey PRIMARY KEY (id);


--
-- Name: sync_integration_clients sync_integration_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_integration_clients
    ADD CONSTRAINT sync_integration_clients_pkey PRIMARY KEY (id);


--
-- Name: sync_marketing_idea_links sync_marketing_idea_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_marketing_idea_links
    ADD CONSTRAINT sync_marketing_idea_links_pkey PRIMARY KEY (id);


--
-- Name: sync_snapshots sync_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_snapshots
    ADD CONSTRAINT sync_snapshots_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_pkey PRIMARY KEY (id);


--
-- Name: taxas_config taxas_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxas_config
    ADD CONSTRAINT taxas_config_pkey PRIMARY KEY (id);


--
-- Name: taxas_parcela taxas_parcela_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxas_parcela
    ADD CONSTRAINT taxas_parcela_pkey PRIMARY KEY (id);


--
-- Name: tipos_profissional tipos_profissional_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_profissional
    ADD CONSTRAINT tipos_profissional_pkey PRIMARY KEY (id);


--
-- Name: tokens_confirmacao tokens_confirmacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens_confirmacao
    ADD CONSTRAINT tokens_confirmacao_pkey PRIMARY KEY (id);


--
-- Name: usage_alerts usage_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_alerts
    ADD CONSTRAINT usage_alerts_pkey PRIMARY KEY (id);


--
-- Name: usage_tracker usage_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracker
    ADD CONSTRAINT usage_tracker_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wa_connection_log wa_connection_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wa_connection_log
    ADD CONSTRAINT wa_connection_log_pkey PRIMARY KEY (id);


--
-- Name: wa_session wa_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wa_session
    ADD CONSTRAINT wa_session_pkey PRIMARY KEY (id);


--
-- Name: __drizzle_migrations_a56145270ce6b3be; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX __drizzle_migrations_a56145270ce6b3be ON public.__drizzle_migrations USING btree (id);


--
-- Name: contas_receber_168548d216978b5c; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contas_receber_168548d216978b5c ON public.contas_receber USING btree ("empresaId", origem_receber, "origemId");


--
-- Name: convites_usuario_dc1e38eaa2b675b5; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX convites_usuario_dc1e38eaa2b675b5 ON public.convites_usuario USING btree (token);


--
-- Name: cores_status_bffe72a8948ab280; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cores_status_bffe72a8948ab280 ON public.cores_status USING btree ("empresaId");


--
-- Name: google_calendar_eventos_103a9ad67ce655e1; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX google_calendar_eventos_103a9ad67ce655e1 ON public.google_calendar_eventos USING btree ("agendamentoId", "userId", "itemIndex");


--
-- Name: google_calendar_eventos_5a50a5737a1fe5fa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX google_calendar_eventos_5a50a5737a1fe5fa ON public.google_calendar_eventos USING btree ("userId");


--
-- Name: google_calendar_eventos_e3886f62bd6148b1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX google_calendar_eventos_e3886f62bd6148b1 ON public.google_calendar_eventos USING btree ("agendamentoId");


--
-- Name: google_calendar_tokens_d4a5da4a9208b7b5; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX google_calendar_tokens_d4a5da4a9208b7b5 ON public.google_calendar_tokens USING btree ("empresaId");


--
-- Name: google_calendar_tokens_usuario_6ccb21214ffd60b0; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX google_calendar_tokens_usuario_6ccb21214ffd60b0 ON public.google_calendar_tokens_usuario USING btree ("userId");


--
-- Name: historico_envios_automacao_1cc44ebabbf97f05; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX historico_envios_automacao_1cc44ebabbf97f05 ON public.historico_envios_automacao USING btree ("empresaId", "automacaoId", "agendamentoId");


--
-- Name: historico_envios_automacao_a24ff60141b1eac9; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX historico_envios_automacao_a24ff60141b1eac9 ON public.historico_envios_automacao USING btree ("dedupeKey");


--
-- Name: marketing_tipos_ocultos_c037e6e3e274d13e; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX marketing_tipos_ocultos_c037e6e3e274d13e ON public.marketing_tipos_ocultos USING btree ("empresaId", "tipoValor");


--
-- Name: permissoes_44823b3dcd2baafa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissoes_44823b3dcd2baafa ON public.permissoes USING btree ("profissionalId");


--
-- Name: permissoes_individuais_791abb60be6c4731; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissoes_individuais_791abb60be6c4731 ON public.permissoes_individuais USING btree ("profissionalId");


--
-- Name: subscriptions_aad9853fcec09225; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_aad9853fcec09225 ON public.subscriptions USING btree ("empresaId");


--
-- Name: sync_inbound_requests_d454785e7670e5e0; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sync_inbound_requests_d454785e7670e5e0 ON public.sync_inbound_requests USING btree ("requestKey");


--
-- Name: sync_integration_clients_6ed3537fa88b5f5b; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sync_integration_clients_6ed3537fa88b5f5b ON public.sync_integration_clients USING btree ("clientId");


--
-- Name: sync_marketing_idea_links_b6de667106cf4589; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sync_marketing_idea_links_b6de667106cf4589 ON public.sync_marketing_idea_links USING btree ("linkKey");


--
-- Name: taxas_config_749dfc761b2b97d9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX taxas_config_749dfc761b2b97d9 ON public.taxas_config USING btree ("empresaId", ativo);


--
-- Name: taxas_config_d3e598e6cfe822ef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX taxas_config_d3e598e6cfe822ef ON public.taxas_config USING btree ("empresaId");


--
-- Name: tokens_confirmacao_e3063c0b12d7dcd6; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tokens_confirmacao_e3063c0b12d7dcd6 ON public.tokens_confirmacao USING btree (token);


--
-- Name: users_fd706005728cf6df; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_fd706005728cf6df ON public.users USING btree ("openId");


--
-- Name: base_conhecimento touch_0287589dafeb77286da19a47; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_0287589dafeb77286da19a47 BEFORE UPDATE ON public.base_conhecimento FOR EACH ROW EXECUTE FUNCTION public.touch_0287589dafeb77286da19a47();


--
-- Name: cores_status touch_09be97d1c66f6270c7d59ef2; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_09be97d1c66f6270c7d59ef2 BEFORE UPDATE ON public.cores_status FOR EACH ROW EXECUTE FUNCTION public.touch_09be97d1c66f6270c7d59ef2();


--
-- Name: meios_pagamento touch_12d7737d0c93151e6a9de6d4; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_12d7737d0c93151e6a9de6d4 BEFORE UPDATE ON public.meios_pagamento FOR EACH ROW EXECUTE FUNCTION public.touch_12d7737d0c93151e6a9de6d4();


--
-- Name: sync_inbound_requests touch_13dd561f0a3e59e7e761113d; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_13dd561f0a3e59e7e761113d BEFORE UPDATE ON public.sync_inbound_requests FOR EACH ROW EXECUTE FUNCTION public.touch_13dd561f0a3e59e7e761113d();


--
-- Name: prontuarios touch_1412ffbd87c43810525a6b86; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_1412ffbd87c43810525a6b86 BEFORE UPDATE ON public.prontuarios FOR EACH ROW EXECUTE FUNCTION public.touch_1412ffbd87c43810525a6b86();


--
-- Name: permissoes_individuais touch_24775ffe8d81bf3d71958604; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_24775ffe8d81bf3d71958604 BEFORE UPDATE ON public.permissoes_individuais FOR EACH ROW EXECUTE FUNCTION public.touch_24775ffe8d81bf3d71958604();


--
-- Name: assinaturas touch_26b5ba6eaa4b80c7ce19a872; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_26b5ba6eaa4b80c7ce19a872 BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.touch_26b5ba6eaa4b80c7ce19a872();


--
-- Name: empresas touch_3ffc2b31b7182c899061abf8; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_3ffc2b31b7182c899061abf8 BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.touch_3ffc2b31b7182c899061abf8();


--
-- Name: marketing_posts touch_40c63a463f09e5510585c954; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_40c63a463f09e5510585c954 BEFORE UPDATE ON public.marketing_posts FOR EACH ROW EXECUTE FUNCTION public.touch_40c63a463f09e5510585c954();


--
-- Name: pipelines touch_48040dec8b87699ce56c58bf; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_48040dec8b87699ce56c58bf BEFORE UPDATE ON public.pipelines FOR EACH ROW EXECUTE FUNCTION public.touch_48040dec8b87699ce56c58bf();


--
-- Name: comissoes touch_4bff358adf179c4ffc00b156; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_4bff358adf179c4ffc00b156 BEFORE UPDATE ON public.comissoes FOR EACH ROW EXECUTE FUNCTION public.touch_4bff358adf179c4ffc00b156();


--
-- Name: push_subscriptions touch_54e3d3eb83bd11194d9a0a42; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_54e3d3eb83bd11194d9a0a42 BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_54e3d3eb83bd11194d9a0a42();


--
-- Name: wa_session touch_5f17fcaab449b2b8a3289ddd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_5f17fcaab449b2b8a3289ddd BEFORE UPDATE ON public.wa_session FOR EACH ROW EXECUTE FUNCTION public.touch_5f17fcaab449b2b8a3289ddd();


--
-- Name: subscriptions touch_67cabb4b07d52d2a43da45b8; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_67cabb4b07d52d2a43da45b8 BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_67cabb4b07d52d2a43da45b8();


--
-- Name: usage_tracker touch_68186116f9894ad91b53012f; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_68186116f9894ad91b53012f BEFORE UPDATE ON public.usage_tracker FOR EACH ROW EXECUTE FUNCTION public.touch_68186116f9894ad91b53012f();


--
-- Name: agendamentos touch_6bdfedf4d94f7f0c5ef12604; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_6bdfedf4d94f7f0c5ef12604 BEFORE UPDATE ON public.agendamentos FOR EACH ROW EXECUTE FUNCTION public.touch_6bdfedf4d94f7f0c5ef12604();


--
-- Name: taxas_config touch_75435c5e4f643d4d338947f4; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_75435c5e4f643d4d338947f4 BEFORE UPDATE ON public.taxas_config FOR EACH ROW EXECUTE FUNCTION public.touch_75435c5e4f643d4d338947f4();


--
-- Name: planos touch_7aea091b2e9844c30a263c23; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_7aea091b2e9844c30a263c23 BEFORE UPDATE ON public.planos FOR EACH ROW EXECUTE FUNCTION public.touch_7aea091b2e9844c30a263c23();


--
-- Name: contas_pagar touch_7c07f22d6afc4ad7c117b0fa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_7c07f22d6afc4ad7c117b0fa BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.touch_7c07f22d6afc4ad7c117b0fa();


--
-- Name: marketing_metricas touch_8ab340c1d3898e35c7f841b8; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_8ab340c1d3898e35c7f841b8 BEFORE UPDATE ON public.marketing_metricas FOR EACH ROW EXECUTE FUNCTION public.touch_8ab340c1d3898e35c7f841b8();


--
-- Name: profissionais touch_8abd3b1b3a4f60032e8548ae; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_8abd3b1b3a4f60032e8548ae BEFORE UPDATE ON public.profissionais FOR EACH ROW EXECUTE FUNCTION public.touch_8abd3b1b3a4f60032e8548ae();


--
-- Name: google_calendar_tokens touch_916699cea3096666ff830140; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_916699cea3096666ff830140 BEFORE UPDATE ON public.google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION public.touch_916699cea3096666ff830140();


--
-- Name: system_users touch_918dc48762ff5d1fd0d54591; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_918dc48762ff5d1fd0d54591 BEFORE UPDATE ON public.system_users FOR EACH ROW EXECUTE FUNCTION public.touch_918dc48762ff5d1fd0d54591();


--
-- Name: contas_receber touch_942a09b7411589c22e28592e; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_942a09b7411589c22e28592e BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.touch_942a09b7411589c22e28592e();


--
-- Name: google_calendar_tokens_usuario touch_97ded3912635781daa13f5e3; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_97ded3912635781daa13f5e3 BEFORE UPDATE ON public.google_calendar_tokens_usuario FOR EACH ROW EXECUTE FUNCTION public.touch_97ded3912635781daa13f5e3();


--
-- Name: servicos touch_9a39ab584454ae2e68422b7f; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_9a39ab584454ae2e68422b7f BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.touch_9a39ab584454ae2e68422b7f();


--
-- Name: dashboard_config touch_9dddf33d31dc6ab2ea5bbd56; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_9dddf33d31dc6ab2ea5bbd56 BEFORE UPDATE ON public.dashboard_config FOR EACH ROW EXECUTE FUNCTION public.touch_9dddf33d31dc6ab2ea5bbd56();


--
-- Name: pipeline_cartoes touch_b690fccf4c35b7a396716b03; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_b690fccf4c35b7a396716b03 BEFORE UPDATE ON public.pipeline_cartoes FOR EACH ROW EXECUTE FUNCTION public.touch_b690fccf4c35b7a396716b03();


--
-- Name: chamados touch_c6484c2e4f3c369716b28dc2; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_c6484c2e4f3c369716b28dc2 BEFORE UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.touch_c6484c2e4f3c369716b28dc2();


--
-- Name: sync_marketing_idea_links touch_d6150595f502a587325541ba; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_d6150595f502a587325541ba BEFORE UPDATE ON public.sync_marketing_idea_links FOR EACH ROW EXECUTE FUNCTION public.touch_d6150595f502a587325541ba();


--
-- Name: permissoes touch_d99d87bea27a74e9352c1a08; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_d99d87bea27a74e9352c1a08 BEFORE UPDATE ON public.permissoes FOR EACH ROW EXECUTE FUNCTION public.touch_d99d87bea27a74e9352c1a08();


--
-- Name: google_calendar_eventos touch_da8d8869dc606cf286f37d23; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_da8d8869dc606cf286f37d23 BEFORE UPDATE ON public.google_calendar_eventos FOR EACH ROW EXECUTE FUNCTION public.touch_da8d8869dc606cf286f37d23();


--
-- Name: users touch_e8c8c38828f0199ee264ebb0; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_e8c8c38828f0199ee264ebb0 BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.touch_e8c8c38828f0199ee264ebb0();


--
-- Name: bloqueios_agenda touch_ee212e9cb36a3058ac8689ed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_ee212e9cb36a3058ac8689ed BEFORE UPDATE ON public.bloqueios_agenda FOR EACH ROW EXECUTE FUNCTION public.touch_ee212e9cb36a3058ac8689ed();


--
-- Name: pipeline_colunas touch_ef930a3b4044d92ed685aaf7; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_ef930a3b4044d92ed685aaf7 BEFORE UPDATE ON public.pipeline_colunas FOR EACH ROW EXECUTE FUNCTION public.touch_ef930a3b4044d92ed685aaf7();


--
-- Name: grupos_permissoes touch_f1d2f29d137a8c3f178d42f7; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_f1d2f29d137a8c3f178d42f7 BEFORE UPDATE ON public.grupos_permissoes FOR EACH ROW EXECUTE FUNCTION public.touch_f1d2f29d137a8c3f178d42f7();


--
-- Name: sync_integration_clients touch_f1e4e242e04adb919728c553; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_f1e4e242e04adb919728c553 BEFORE UPDATE ON public.sync_integration_clients FOR EACH ROW EXECUTE FUNCTION public.touch_f1e4e242e04adb919728c553();


--
-- Name: automacoes touch_f4aad2526e5f562f3b5271cc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_f4aad2526e5f562f3b5271cc BEFORE UPDATE ON public.automacoes FOR EACH ROW EXECUTE FUNCTION public.touch_f4aad2526e5f562f3b5271cc();


--
-- Name: permissoes_grupo touch_f58eee878dc2d9d1c62bf515; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_f58eee878dc2d9d1c62bf515 BEFORE UPDATE ON public.permissoes_grupo FOR EACH ROW EXECUTE FUNCTION public.touch_f58eee878dc2d9d1c62bf515();


--
-- Name: clientes touch_f7d451c76a61c25eee2dfd27; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER touch_f7d451c76a61c25eee2dfd27 BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.touch_f7d451c76a61c25eee2dfd27();


--
-- PostgreSQL database dump complete
--


