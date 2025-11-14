--
-- PostgreSQL database dump
--

\restrict GgOGZMff1ph1d0s2dzZuZcgMXZfvorMy1tyvOqeXwSZRjoTAPhdMZWwugI3VEUd

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

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '34593b19-5835-4fdc-8ff2-f563c49a6ed1', 'authenticated', 'authenticated', 'a@a.a', '$2a$10$XK1S9G2f9kgdbPCUTPAYKOzYNfwZA9h4Hzdl.2p.WEfTonJdOA722', '2025-09-03 11:35:02.544843+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-10-05 09:10:59.367621+00', '{"provider": "email", "providers": ["email"]}', '{"name": "Djamel ZIGHED", "role": "admin", "email_verified": true}', NULL, '2025-09-03 11:35:02.528232+00', '2025-10-05 10:15:51.083325+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '91687a45-ccf3-4aaf-8852-1c2a8e3187f9', 'authenticated', 'authenticated', 'zighed@parene.org', '$2a$10$SJbSDddsHjLv4pUqXoeTi.vSjwRUyvIslNeNropGvP9lJNTMsjjQG', '2025-09-04 06:49:02.923661+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-09-08 16:33:08.86085+00', '{"provider": "email", "providers": ["email"]}', '{"name": "Zighed", "email_verified": true}', NULL, '2025-09-04 06:49:02.915616+00', '2025-09-09 12:04:37.386096+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', '4391ed4a-bf0f-406d-8cd0-7101a1167733', 'authenticated', 'authenticated', 'zighed@zighed.com', '$2a$10$wxa.f9zIUpck1qw9JBx6FeKxGjeunGDIeygE.a9p.xZgTfn.9ndGO', '2025-09-27 06:06:16.367057+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-10-02 07:25:10.709904+00', '{"provider": "email", "providers": ["email"]}', '{"name": "zighed", "email_verified": true}', NULL, '2025-09-27 06:06:16.362259+00', '2025-10-02 20:02:08.629472+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'cca13e6d-bb9b-457c-b19c-9ea6acc8cd5e', 'authenticated', 'authenticated', 'abdelkader@zighed.com', '$2a$10$tfJWTLbi43HlWno4ZK0DVe559V2PSJ1cD5Ns4I/IR44HtNuVTpY5C', '2025-10-05 09:03:21.930622+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"name": "abdelkader zighed", "email_verified": true}', NULL, '2025-10-05 09:03:21.913772+00', '2025-10-05 09:03:21.931522+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.identities VALUES ('91687a45-ccf3-4aaf-8852-1c2a8e3187f9', '91687a45-ccf3-4aaf-8852-1c2a8e3187f9', '{"sub": "91687a45-ccf3-4aaf-8852-1c2a8e3187f9", "email": "zighed@parene.org", "email_verified": false, "phone_verified": false}', 'email', '2025-09-04 06:49:02.920105+00', '2025-09-04 06:49:02.920164+00', '2025-09-04 06:49:02.920164+00', DEFAULT, '7a709e76-00b5-4378-b734-9da056f31c44');
INSERT INTO auth.identities VALUES ('34593b19-5835-4fdc-8ff2-f563c49a6ed1', '34593b19-5835-4fdc-8ff2-f563c49a6ed1', '{"sub": "34593b19-5835-4fdc-8ff2-f563c49a6ed1", "email": "a@a.a", "email_verified": false, "phone_verified": false}', 'email', '2025-09-03 11:35:02.539557+00', '2025-09-03 11:35:02.539628+00', '2025-09-03 11:35:02.539628+00', DEFAULT, '15cd4c30-5f81-4d0f-80ae-91aed35b91cc');
INSERT INTO auth.identities VALUES ('4391ed4a-bf0f-406d-8cd0-7101a1167733', '4391ed4a-bf0f-406d-8cd0-7101a1167733', '{"sub": "4391ed4a-bf0f-406d-8cd0-7101a1167733", "email": "zighed@zighed.com", "email_verified": false, "phone_verified": false}', 'email', '2025-09-27 06:06:16.364272+00', '2025-09-27 06:06:16.364325+00', '2025-09-27 06:06:16.364325+00', DEFAULT, '75134a38-d062-4986-a545-43e9059c98e5');
INSERT INTO auth.identities VALUES ('cca13e6d-bb9b-457c-b19c-9ea6acc8cd5e', 'cca13e6d-bb9b-457c-b19c-9ea6acc8cd5e', '{"sub": "cca13e6d-bb9b-457c-b19c-9ea6acc8cd5e", "email": "abdelkader@zighed.com", "email_verified": false, "phone_verified": false}', 'email', '2025-10-05 09:03:21.924452+00', '2025-10-05 09:03:21.924519+00', '2025-10-05 09:03:21.924519+00', DEFAULT, '72fad0f5-36cf-436b-8cba-5240be8b56e3');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 338, 'x3jgfhv5be65', '34593b19-5835-4fdc-8ff2-f563c49a6ed1', true, '2025-10-05 09:10:59.384689+00', '2025-10-05 10:15:51.062355+00', NULL, 'd32f048f-1d44-420f-b0a1-74fee4398977');
INSERT INTO auth.refresh_tokens VALUES ('00000000-0000-0000-0000-000000000000', 339, 'nvb3ayljb2dc', '34593b19-5835-4fdc-8ff2-f563c49a6ed1', false, '2025-10-05 10:15:51.072274+00', '2025-10-05 10:15:51.072274+00', 'x3jgfhv5be65', 'd32f048f-1d44-420f-b0a1-74fee4398977');


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 339, true);


--
-- PostgreSQL database dump complete
--

\unrestrict GgOGZMff1ph1d0s2dzZuZcgMXZfvorMy1tyvOqeXwSZRjoTAPhdMZWwugI3VEUd

