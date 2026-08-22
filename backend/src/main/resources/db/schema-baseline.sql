--
-- PostgreSQL database dump
--

-- Dumped from database version 12.22 (Debian 12.22-1.pgdg120+1)
-- Dumped by pg_dump version 12.22 (Debian 12.22-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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

CREATE SCHEMA public;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: login_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_event (
    id bigint NOT NULL,
    login_at timestamp(6) with time zone NOT NULL,
    user_id bigint NOT NULL
);


--
-- Name: login_event_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_event_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refreshtoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refreshtoken (
    id bigint NOT NULL,
    expiry_date timestamp(6) with time zone NOT NULL,
    token character varying(255) NOT NULL,
    user_id bigint
);


--
-- Name: refreshtoken_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refreshtoken_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registration_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_request (
    id bigint NOT NULL,
    approved_at timestamp(6) with time zone,
    approved_by character varying(255),
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    requested_at timestamp(6) with time zone NOT NULL,
    status character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    CONSTRAINT registration_request_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying])::text[])))
);


--
-- Name: registration_request_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registration_request_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: song; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song (
    id bigint NOT NULL,
    album character varying(255) NOT NULL,
    artist character varying(255) NOT NULL,
    bpm integer,
    cadence character varying(255),
    capo integer,
    composer character varying(255),
    html_content text,
    interpret_version character varying(255),
    key_root character varying(255),
    key_suffix character varying(255),
    language character varying(255),
    lyricist character varying(255),
    name character varying(255) NOT NULL,
    play character varying(255),
    producer character varying(255),
    running_number bigint,
    song_year integer,
    time_signature character varying(255),
    mode character varying(255)
);


--
-- Name: song_genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_genres (
    song_id bigint NOT NULL,
    genre character varying(255) NOT NULL,
    genre_order integer NOT NULL
);


--
-- Name: song_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_line (
    id bigint NOT NULL,
    order_index integer,
    text text NOT NULL,
    song_id bigint NOT NULL
);


--
-- Name: song_line_chord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_line_chord (
    song_line_id bigint NOT NULL,
    name character varying(14) NOT NULL,
    "position" integer NOT NULL
);


--
-- Name: song_line_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.song_line_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: song_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_list (
    id bigint NOT NULL,
    name character varying(120) NOT NULL
);


--
-- Name: song_list_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_list_item (
    id bigint NOT NULL,
    order_index integer NOT NULL,
    song_id bigint NOT NULL,
    song_list_id bigint NOT NULL
);


--
-- Name: song_list_item_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.song_list_item_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: song_list_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.song_list_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: song_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.song_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    CONSTRAINT user_role_check CHECK (((role)::text = ANY ((ARRAY['USER'::character varying, 'ADMIN'::character varying])::text[])))
);


--
-- Name: user_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_event login_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_event
    ADD CONSTRAINT login_event_pkey PRIMARY KEY (id);


--
-- Name: refreshtoken refreshtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refreshtoken
    ADD CONSTRAINT refreshtoken_pkey PRIMARY KEY (id);


--
-- Name: registration_request registration_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_request
    ADD CONSTRAINT registration_request_pkey PRIMARY KEY (id);


--
-- Name: song_genres song_genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_genres
    ADD CONSTRAINT song_genres_pkey PRIMARY KEY (song_id, genre_order);


--
-- Name: song_line song_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_line
    ADD CONSTRAINT song_line_pkey PRIMARY KEY (id);


--
-- Name: song_list_item song_list_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_list_item
    ADD CONSTRAINT song_list_item_pkey PRIMARY KEY (id);


--
-- Name: song_list song_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_list
    ADD CONSTRAINT song_list_pkey PRIMARY KEY (id);


--
-- Name: song song_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song
    ADD CONSTRAINT song_pkey PRIMARY KEY (id);


--
-- Name: user uk5c856itaihtmi69ni04cmpc4m; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT uk5c856itaihtmi69ni04cmpc4m UNIQUE (username);


--
-- Name: refreshtoken uk81otwtvdhcw7y3ipoijtlb1g3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refreshtoken
    ADD CONSTRAINT uk81otwtvdhcw7y3ipoijtlb1g3 UNIQUE (user_id);


--
-- Name: song ukc9mfcuku15ape2x085ouwyl48; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song
    ADD CONSTRAINT ukc9mfcuku15ape2x085ouwyl48 UNIQUE (running_number);


--
-- Name: user ukhl4ga9r00rh51mdaf20hmnslt; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT ukhl4ga9r00rh51mdaf20hmnslt UNIQUE (email);


--
-- Name: refreshtoken ukor156wbneyk8noo4jstv55ii3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refreshtoken
    ADD CONSTRAINT ukor156wbneyk8noo4jstv55ii3 UNIQUE (token);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: song_line fk2opgy7yfvxbl7f4jovh36u97d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_line
    ADD CONSTRAINT fk2opgy7yfvxbl7f4jovh36u97d FOREIGN KEY (song_id) REFERENCES public.song(id);


--
-- Name: song_line_chord fk2q780fbqbcmj6rky19jiiat92; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_line_chord
    ADD CONSTRAINT fk2q780fbqbcmj6rky19jiiat92 FOREIGN KEY (song_line_id) REFERENCES public.song_line(id);


--
-- Name: refreshtoken fkcdgfthp36gfrn5yphlwc3us2g; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refreshtoken
    ADD CONSTRAINT fkcdgfthp36gfrn5yphlwc3us2g FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: song_genres fkd4r59fcov363jityut0n3dv41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_genres
    ADD CONSTRAINT fkd4r59fcov363jityut0n3dv41 FOREIGN KEY (song_id) REFERENCES public.song(id);


--
-- Name: song_list_item fkdptohrrhwo02xf88w6sa483a0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_list_item
    ADD CONSTRAINT fkdptohrrhwo02xf88w6sa483a0 FOREIGN KEY (song_id) REFERENCES public.song(id);


--
-- Name: song_list_item fkkltb51hi2gjpsawu7agoerb30; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_list_item
    ADD CONSTRAINT fkkltb51hi2gjpsawu7agoerb30 FOREIGN KEY (song_list_id) REFERENCES public.song_list(id);


--
-- Name: login_event fkr5kdpqmj97her6t296wyt7qy6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_event
    ADD CONSTRAINT fkr5kdpqmj97her6t296wyt7qy6 FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- PostgreSQL database dump complete
--
