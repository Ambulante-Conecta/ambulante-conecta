--
-- PostgreSQL database dump
--

\restrict bUdo0vqTSJvlIif4GjdVDUaPyAqmNNzZ1o6ejLYgLAi1dGABBaIGUtCesgLFiJH

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ambulantes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ambulantes (
    id integer NOT NULL,
    nome_completo character varying(150) NOT NULL,
    cpf character varying(14) NOT NULL,
    data_nascimento date NOT NULL,
    telefone character varying(20),
    email character varying(100),
    tipo_atividade character varying(100),
    possui_mei boolean DEFAULT false,
    cnpj_mei character varying(20),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    local_pretendido character varying(255),
    consentimento_em timestamp without time zone,
    turno character varying(20),
    CONSTRAINT ambulantes_turno_check CHECK (((turno IS NULL) OR ((turno)::text = ANY ((ARRAY['Manhã'::character varying, 'Tarde'::character varying, 'Noite'::character varying, 'Dia todo'::character varying])::text[]))))
);


ALTER TABLE public.ambulantes OWNER TO postgres;

--
-- Name: ambulantes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ambulantes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ambulantes_id_seq OWNER TO postgres;

--
-- Name: ambulantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ambulantes_id_seq OWNED BY public.ambulantes.id;


--
-- Name: atividade; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atividade (
    id_atividade integer NOT NULL,
    nome_atividade character varying(100) NOT NULL,
    descricao text,
    requer_licenca_especial boolean DEFAULT false NOT NULL
);


ALTER TABLE public.atividade OWNER TO postgres;

--
-- Name: atividade_id_atividade_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.atividade_id_atividade_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.atividade_id_atividade_seq OWNER TO postgres;

--
-- Name: atividade_id_atividade_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.atividade_id_atividade_seq OWNED BY public.atividade.id_atividade;


--
-- Name: documento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documento (
    id_documento integer NOT NULL,
    id_ambulante integer NOT NULL,
    tipo_documento character varying(50) NOT NULL,
    url_arquivo character varying(255) NOT NULL,
    status_validacao character varying(20) DEFAULT 'PENDENTE'::character varying NOT NULL,
    data_envio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT documento_status_validacao_check CHECK (((status_validacao)::text = ANY ((ARRAY['PENDENTE'::character varying, 'APROVADO'::character varying, 'REJEITADO'::character varying])::text[])))
);


ALTER TABLE public.documento OWNER TO postgres;

--
-- Name: documento_id_documento_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documento_id_documento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documento_id_documento_seq OWNER TO postgres;

--
-- Name: documento_id_documento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documento_id_documento_seq OWNED BY public.documento.id_documento;


--
-- Name: etapa_formalizacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.etapa_formalizacao (
    id_etapa integer NOT NULL,
    id_formalizacao integer NOT NULL,
    titulo_etapa character varying(100) NOT NULL,
    ordem integer NOT NULL,
    status_etapa character varying(20) DEFAULT 'PENDENTE'::character varying NOT NULL,
    data_atualizacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT etapa_formalizacao_status_etapa_check CHECK (((status_etapa)::text = ANY ((ARRAY['PENDENTE'::character varying, 'EM_ANALISE'::character varying, 'CONCLUIDO'::character varying])::text[])))
);


ALTER TABLE public.etapa_formalizacao OWNER TO postgres;

--
-- Name: etapa_formalizacao_id_etapa_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.etapa_formalizacao_id_etapa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.etapa_formalizacao_id_etapa_seq OWNER TO postgres;

--
-- Name: etapa_formalizacao_id_etapa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.etapa_formalizacao_id_etapa_seq OWNED BY public.etapa_formalizacao.id_etapa;


--
-- Name: formalizacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.formalizacao (
    id_formalizacao integer NOT NULL,
    id_ambulante integer NOT NULL,
    cnpj character varying(14),
    data_inicio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_conclusao timestamp without time zone,
    status_geral character varying(20) DEFAULT 'EM_ANDAMENTO'::character varying NOT NULL,
    CONSTRAINT formalizacao_status_geral_check CHECK (((status_geral)::text = ANY ((ARRAY['EM_ANDAMENTO'::character varying, 'CONCLUIDO'::character varying, 'CANCELADO'::character varying])::text[])))
);


ALTER TABLE public.formalizacao OWNER TO postgres;

--
-- Name: formalizacao_id_formalizacao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.formalizacao_id_formalizacao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formalizacao_id_formalizacao_seq OWNER TO postgres;

--
-- Name: formalizacao_id_formalizacao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.formalizacao_id_formalizacao_seq OWNED BY public.formalizacao.id_formalizacao;


--
-- Name: historico_solicitacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historico_solicitacao (
    id_historico integer NOT NULL,
    id_solicitacao integer NOT NULL,
    status_anterior character varying(20) NOT NULL,
    status_novo character varying(20) NOT NULL,
    data_mudanca timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observacao text
);


ALTER TABLE public.historico_solicitacao OWNER TO postgres;

--
-- Name: historico_solicitacao_id_historico_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historico_solicitacao_id_historico_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historico_solicitacao_id_historico_seq OWNER TO postgres;

--
-- Name: historico_solicitacao_id_historico_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historico_solicitacao_id_historico_seq OWNED BY public.historico_solicitacao.id_historico;


--
-- Name: mensagem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mensagem (
    id_mensagem integer NOT NULL,
    id_remetente integer NOT NULL,
    id_destinatario integer NOT NULL,
    id_solicitacao integer,
    conteudo text NOT NULL,
    data_envio timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lida boolean DEFAULT false NOT NULL
);


ALTER TABLE public.mensagem OWNER TO postgres;

--
-- Name: mensagem_id_mensagem_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mensagem_id_mensagem_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mensagem_id_mensagem_seq OWNER TO postgres;

--
-- Name: mensagem_id_mensagem_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mensagem_id_mensagem_seq OWNED BY public.mensagem.id_mensagem;


--
-- Name: mensagens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mensagens (
    id integer NOT NULL,
    ambulante_id integer NOT NULL,
    remetente character varying(20) NOT NULL,
    usuario_id integer,
    assunto character varying(120) NOT NULL,
    texto text NOT NULL,
    lida boolean DEFAULT false NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT mensagens_remetente_check CHECK (((remetente)::text = ANY ((ARRAY['ambulante'::character varying, 'gestor'::character varying, 'sistema'::character varying])::text[])))
);


ALTER TABLE public.mensagens OWNER TO postgres;

--
-- Name: mensagens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mensagens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mensagens_id_seq OWNER TO postgres;

--
-- Name: mensagens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mensagens_id_seq OWNED BY public.mensagens.id;


--
-- Name: pontos_venda; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pontos_venda (
    id integer NOT NULL,
    ambulante_id integer,
    descricao_local character varying(255),
    bairro character varying(100),
    geometria public.geometry(Point,4326),
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'disponível'::character varying,
    CONSTRAINT pontos_venda_status_check CHECK (((status)::text = ANY ((ARRAY['disponível'::character varying, 'ocupado'::character varying])::text[])))
);


ALTER TABLE public.pontos_venda OWNER TO postgres;

--
-- Name: pontos_venda_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pontos_venda_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pontos_venda_id_seq OWNER TO postgres;

--
-- Name: pontos_venda_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pontos_venda_id_seq OWNED BY public.pontos_venda.id;


--
-- Name: solicitacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitacao (
    id_solicitacao integer NOT NULL,
    id_ambulante integer NOT NULL,
    id_ponto integer NOT NULL,
    data_solicitacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status_solicitacao character varying(20) DEFAULT 'PENDENTE'::character varying NOT NULL,
    justificativa text,
    data_avaliacao timestamp without time zone,
    id_avaliador integer
);


ALTER TABLE public.solicitacao OWNER TO postgres;

--
-- Name: solicitacao_id_solicitacao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitacao_id_solicitacao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solicitacao_id_solicitacao_seq OWNER TO postgres;

--
-- Name: solicitacao_id_solicitacao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitacao_id_solicitacao_seq OWNED BY public.solicitacao.id_solicitacao;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    nome character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    senha_hash character varying(255) NOT NULL,
    tipo_usuario character varying(20) NOT NULL,
    data_cadastro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT usuario_tipo_usuario_check CHECK (((tipo_usuario)::text = ANY ((ARRAY['AMBULANTE'::character varying, 'ADMIN'::character varying, 'ATENDENTE'::character varying])::text[])))
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_usuario_seq OWNER TO postgres;

--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    cpf character varying(14) NOT NULL,
    senha_hash character varying(100) NOT NULL,
    perfil character varying(20) NOT NULL,
    ambulante_id integer,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    senha_alterada_em timestamp with time zone,
    CONSTRAINT usuarios_perfil_check CHECK (((perfil)::text = ANY ((ARRAY['ambulante'::character varying, 'gestor'::character varying])::text[]))),
    CONSTRAINT usuarios_perfil_vinculo_chk CHECK (((((perfil)::text = 'ambulante'::text) AND (ambulante_id IS NOT NULL)) OR (((perfil)::text = 'gestor'::text) AND (ambulante_id IS NULL))))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: ambulantes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ambulantes ALTER COLUMN id SET DEFAULT nextval('public.ambulantes_id_seq'::regclass);


--
-- Name: atividade id_atividade; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atividade ALTER COLUMN id_atividade SET DEFAULT nextval('public.atividade_id_atividade_seq'::regclass);


--
-- Name: documento id_documento; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documento ALTER COLUMN id_documento SET DEFAULT nextval('public.documento_id_documento_seq'::regclass);


--
-- Name: etapa_formalizacao id_etapa; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etapa_formalizacao ALTER COLUMN id_etapa SET DEFAULT nextval('public.etapa_formalizacao_id_etapa_seq'::regclass);


--
-- Name: formalizacao id_formalizacao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formalizacao ALTER COLUMN id_formalizacao SET DEFAULT nextval('public.formalizacao_id_formalizacao_seq'::regclass);


--
-- Name: historico_solicitacao id_historico; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_solicitacao ALTER COLUMN id_historico SET DEFAULT nextval('public.historico_solicitacao_id_historico_seq'::regclass);


--
-- Name: mensagem id_mensagem; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagem ALTER COLUMN id_mensagem SET DEFAULT nextval('public.mensagem_id_mensagem_seq'::regclass);


--
-- Name: mensagens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagens ALTER COLUMN id SET DEFAULT nextval('public.mensagens_id_seq'::regclass);


--
-- Name: pontos_venda id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pontos_venda ALTER COLUMN id SET DEFAULT nextval('public.pontos_venda_id_seq'::regclass);


--
-- Name: solicitacao id_solicitacao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacao ALTER COLUMN id_solicitacao SET DEFAULT nextval('public.solicitacao_id_solicitacao_seq'::regclass);


--
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: ambulantes ambulantes_cpf_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ambulantes
    ADD CONSTRAINT ambulantes_cpf_key UNIQUE (cpf);


--
-- Name: ambulantes ambulantes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ambulantes
    ADD CONSTRAINT ambulantes_pkey PRIMARY KEY (id);


--
-- Name: atividade atividade_nome_atividade_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atividade
    ADD CONSTRAINT atividade_nome_atividade_key UNIQUE (nome_atividade);


--
-- Name: atividade atividade_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atividade
    ADD CONSTRAINT atividade_pkey PRIMARY KEY (id_atividade);


--
-- Name: documento documento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documento
    ADD CONSTRAINT documento_pkey PRIMARY KEY (id_documento);


--
-- Name: etapa_formalizacao etapa_formalizacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etapa_formalizacao
    ADD CONSTRAINT etapa_formalizacao_pkey PRIMARY KEY (id_etapa);


--
-- Name: formalizacao formalizacao_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formalizacao
    ADD CONSTRAINT formalizacao_cnpj_key UNIQUE (cnpj);


--
-- Name: formalizacao formalizacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.formalizacao
    ADD CONSTRAINT formalizacao_pkey PRIMARY KEY (id_formalizacao);


--
-- Name: historico_solicitacao historico_solicitacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_solicitacao
    ADD CONSTRAINT historico_solicitacao_pkey PRIMARY KEY (id_historico);


--
-- Name: mensagem mensagem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagem
    ADD CONSTRAINT mensagem_pkey PRIMARY KEY (id_mensagem);


--
-- Name: mensagens mensagens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagens
    ADD CONSTRAINT mensagens_pkey PRIMARY KEY (id);


--
-- Name: pontos_venda pontos_venda_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pontos_venda
    ADD CONSTRAINT pontos_venda_pkey PRIMARY KEY (id);


--
-- Name: solicitacao solicitacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacao
    ADD CONSTRAINT solicitacao_pkey PRIMARY KEY (id_solicitacao);


--
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- Name: usuarios usuarios_ambulante_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_ambulante_id_key UNIQUE (ambulante_id);


--
-- Name: usuarios usuarios_cpf_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_cpf_key UNIQUE (cpf);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_mensagens_ambulante; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mensagens_ambulante ON public.mensagens USING btree (ambulante_id, criado_em DESC);


--
-- Name: etapa_formalizacao etapa_formalizacao_id_formalizacao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.etapa_formalizacao
    ADD CONSTRAINT etapa_formalizacao_id_formalizacao_fkey FOREIGN KEY (id_formalizacao) REFERENCES public.formalizacao(id_formalizacao) ON DELETE CASCADE;


--
-- Name: solicitacao fk_solicitacao_avaliador; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitacao
    ADD CONSTRAINT fk_solicitacao_avaliador FOREIGN KEY (id_avaliador) REFERENCES public.usuarios(id);


--
-- Name: historico_solicitacao historico_solicitacao_id_solicitacao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_solicitacao
    ADD CONSTRAINT historico_solicitacao_id_solicitacao_fkey FOREIGN KEY (id_solicitacao) REFERENCES public.solicitacao(id_solicitacao) ON DELETE CASCADE;


--
-- Name: mensagem mensagem_id_destinatario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagem
    ADD CONSTRAINT mensagem_id_destinatario_fkey FOREIGN KEY (id_destinatario) REFERENCES public.usuario(id_usuario);


--
-- Name: mensagem mensagem_id_remetente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagem
    ADD CONSTRAINT mensagem_id_remetente_fkey FOREIGN KEY (id_remetente) REFERENCES public.usuario(id_usuario);


--
-- Name: mensagem mensagem_id_solicitacao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagem
    ADD CONSTRAINT mensagem_id_solicitacao_fkey FOREIGN KEY (id_solicitacao) REFERENCES public.solicitacao(id_solicitacao);


--
-- Name: mensagens mensagens_ambulante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagens
    ADD CONSTRAINT mensagens_ambulante_id_fkey FOREIGN KEY (ambulante_id) REFERENCES public.ambulantes(id) ON DELETE CASCADE;


--
-- Name: mensagens mensagens_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mensagens
    ADD CONSTRAINT mensagens_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: pontos_venda pontos_venda_ambulante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pontos_venda
    ADD CONSTRAINT pontos_venda_ambulante_id_fkey FOREIGN KEY (ambulante_id) REFERENCES public.ambulantes(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_ambulante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_ambulante_id_fkey FOREIGN KEY (ambulante_id) REFERENCES public.ambulantes(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict bUdo0vqTSJvlIif4GjdVDUaPyAqmNNzZ1o6ejLYgLAi1dGABBaIGUtCesgLFiJH

