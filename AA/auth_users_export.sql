--
-- PostgreSQL database dump
--

\restrict UegUuePlniOxVnlSEU28fRE5PdPyfyvnxREe1skxPOGNCNz2DGJvNXQ2wZT7mun

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

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
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	34593b19-5835-4fdc-8ff2-f563c49a6ed1	authenticated	authenticated	a@a.a	$2a$10$XK1S9G2f9kgdbPCUTPAYKOzYNfwZA9h4Hzdl.2p.WEfTonJdOA722	2025-09-03 11:35:02.544843+00	\N		\N		\N			\N	2025-10-05 09:10:59.367621+00	{"provider": "email", "providers": ["email"]}	{"name": "Djamel ZIGHED", "role": "admin", "email_verified": true}	\N	2025-09-03 11:35:02.528232+00	2025-10-05 09:10:59.398909+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	91687a45-ccf3-4aaf-8852-1c2a8e3187f9	authenticated	authenticated	zighed@parene.org	$2a$10$SJbSDddsHjLv4pUqXoeTi.vSjwRUyvIslNeNropGvP9lJNTMsjjQG	2025-09-04 06:49:02.923661+00	\N		\N		\N			\N	2025-09-08 16:33:08.86085+00	{"provider": "email", "providers": ["email"]}	{"name": "Zighed", "email_verified": true}	\N	2025-09-04 06:49:02.915616+00	2025-09-09 12:04:37.386096+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	4391ed4a-bf0f-406d-8cd0-7101a1167733	authenticated	authenticated	zighed@zighed.com	$2a$10$wxa.f9zIUpck1qw9JBx6FeKxGjeunGDIeygE.a9p.xZgTfn.9ndGO	2025-09-27 06:06:16.367057+00	\N		\N		\N			\N	2025-10-02 07:25:10.709904+00	{"provider": "email", "providers": ["email"]}	{"name": "zighed", "email_verified": true}	\N	2025-09-27 06:06:16.362259+00	2025-10-02 20:02:08.629472+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	cca13e6d-bb9b-457c-b19c-9ea6acc8cd5e	authenticated	authenticated	abdelkader@zighed.com	$2a$10$tfJWTLbi43HlWno4ZK0DVe559V2PSJ1cD5Ns4I/IR44HtNuVTpY5C	2025-10-05 09:03:21.930622+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"name": "abdelkader zighed", "email_verified": true}	\N	2025-10-05 09:03:21.913772+00	2025-10-05 09:03:21.931522+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
91687a45-ccf3-4aaf-8852-1c2a8e3187f9	91687a45-ccf3-4aaf-8852-1c2a8e3187f9	{"sub": "91687a45-ccf3-4aaf-8852-1c2a8e3187f9", "email": "zighed@parene.org", "email_verified": false, "phone_verified": false}	email	2025-09-04 06:49:02.920105+00	2025-09-04 06:49:02.920164+00	2025-09-04 06:49:02.920164+00	7a709e76-00b5-4378-b734-9da056f31c44
34593b19-5835-4fdc-8ff2-f563c49a6ed1	34593b19-5835-4fdc-8ff2-f563c49a6ed1	{"sub": "34593b19-5835-4fdc-8ff2-f563c49a6ed1", "email": "a@a.a", "email_verified": false, "phone_verified": false}	email	2025-09-03 11:35:02.539557+00	2025-09-03 11:35:02.539628+00	2025-09-03 11:35:02.539628+00	15cd4c30-5f81-4d0f-80ae-91aed35b91cc
4391ed4a-bf0f-406d-8cd0-7101a1167733	4391ed4a-bf0f-406d-8cd0-7101a1167733	{"sub": "4391ed4a-bf0f-406d-8cd0-7101a1167733", "email": "zighed@zighed.com", "email_verified": false, "phone_verified": false}	email	2025-09-27 06:06:16.364272+00	2025-09-27 06:06:16.364325+00	2025-09-27 06:06:16.364325+00	75134a38-d062-4986-a545-43e9059c98e5
cca13e6d-bb9b-457c-b19c-9ea6acc8cd5e	cca13e6d-bb9b-457c-b19c-9ea6acc8cd5e	{"sub": "cca13e6d-bb9b-457c-b19c-9ea6acc8cd5e", "email": "abdelkader@zighed.com", "email_verified": false, "phone_verified": false}	email	2025-10-05 09:03:21.924452+00	2025-10-05 09:03:21.924519+00	2025-10-05 09:03:21.924519+00	72fad0f5-36cf-436b-8cba-5240be8b56e3
\.


--
-- PostgreSQL database dump complete
--

\unrestrict UegUuePlniOxVnlSEU28fRE5PdPyfyvnxREe1skxPOGNCNz2DGJvNXQ2wZT7mun

