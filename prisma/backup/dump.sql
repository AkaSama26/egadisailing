--
-- PostgreSQL database dump
--

\restrict OzZ8fbcJPJtn8zMNqTeESZJjGJW2DB4TiZ9G1yc4Gzavj0l0ZvxI5qPlzLR1ef9

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

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

ALTER TABLE IF EXISTS ONLY public.trips DROP CONSTRAINT IF EXISTS trips_service_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trip_crew DROP CONSTRAINT IF EXISTS trip_crew_trip_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trip_crew DROP CONSTRAINT IF EXISTS trip_crew_crew_member_id_fkey;
ALTER TABLE IF EXISTS ONLY public.services DROP CONSTRAINT IF EXISTS services_boat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.pricing_periods DROP CONSTRAINT IF EXISTS pricing_periods_service_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_trip_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;
DROP INDEX IF EXISTS public.users_email_key;
DROP INDEX IF EXISTS public.trip_crew_trip_id_crew_member_id_key;
DROP INDEX IF EXISTS public.customers_email_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.trips DROP CONSTRAINT IF EXISTS trips_pkey;
ALTER TABLE IF EXISTS ONLY public.trip_crew DROP CONSTRAINT IF EXISTS trip_crew_pkey;
ALTER TABLE IF EXISTS ONLY public.services DROP CONSTRAINT IF EXISTS services_pkey;
ALTER TABLE IF EXISTS ONLY public.pricing_periods DROP CONSTRAINT IF EXISTS pricing_periods_pkey;
ALTER TABLE IF EXISTS ONLY public.portal_syncs DROP CONSTRAINT IF EXISTS portal_syncs_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.crew_members DROP CONSTRAINT IF EXISTS crew_members_pkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_pkey;
ALTER TABLE IF EXISTS ONLY public.boats DROP CONSTRAINT IF EXISTS boats_pkey;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.trips;
DROP TABLE IF EXISTS public.trip_crew;
DROP TABLE IF EXISTS public.services;
DROP TABLE IF EXISTS public.pricing_periods;
DROP TABLE IF EXISTS public.portal_syncs;
DROP TABLE IF EXISTS public.customers;
DROP TABLE IF EXISTS public.crew_members;
DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.boats;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TYPE IF EXISTS public."UserRole";
DROP TYPE IF EXISTS public."TripStatus";
DROP TYPE IF EXISTS public."ServiceType";
DROP TYPE IF EXISTS public."DurationType";
DROP TYPE IF EXISTS public."CrewRole";
DROP TYPE IF EXISTS public."BookingStatus";
DROP TYPE IF EXISTS public."BookingChannel";
--
-- Name: BookingChannel; Type: TYPE; Schema: public; Owner: egadisailing
--

CREATE TYPE public."BookingChannel" AS ENUM (
    'WEBSITE',
    'GET_YOUR_GUIDE',
    'AIRBNB',
    'CLICK_AND_BOAT',
    'MUSEMENT',
    'VIATOR',
    'SAMBOAT',
    'MANUAL'
);


ALTER TYPE public."BookingChannel" OWNER TO egadisailing;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: egadisailing
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'CONFIRMED',
    'PENDING',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."BookingStatus" OWNER TO egadisailing;

--
-- Name: CrewRole; Type: TYPE; Schema: public; Owner: egadisailing
--

CREATE TYPE public."CrewRole" AS ENUM (
    'SKIPPER',
    'CHEF',
    'HOSTESS'
);


ALTER TYPE public."CrewRole" OWNER TO egadisailing;

--
-- Name: DurationType; Type: TYPE; Schema: public; Owner: egadisailing
--

CREATE TYPE public."DurationType" AS ENUM (
    'FULL_DAY',
    'HALF_DAY_MORNING',
    'WEEK'
);


ALTER TYPE public."DurationType" OWNER TO egadisailing;

--
-- Name: ServiceType; Type: TYPE; Schema: public; Owner: egadisailing
--

CREATE TYPE public."ServiceType" AS ENUM (
    'SOCIAL_BOATING',
    'EXCLUSIVE_EXPERIENCE',
    'CABIN_CHARTER',
    'BOAT_SHARED',
    'BOAT_EXCLUSIVE'
);


ALTER TYPE public."ServiceType" OWNER TO egadisailing;

--
-- Name: TripStatus; Type: TYPE; Schema: public; Owner: egadisailing
--

CREATE TYPE public."TripStatus" AS ENUM (
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."TripStatus" OWNER TO egadisailing;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: egadisailing
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'STAFF'
);


ALTER TYPE public."UserRole" OWNER TO egadisailing;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO egadisailing;

--
-- Name: boats; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.boats (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    length double precision,
    year integer,
    description jsonb,
    amenities jsonb,
    images jsonb,
    cabins integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.boats OWNER TO egadisailing;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.bookings (
    id text NOT NULL,
    trip_id text NOT NULL,
    customer_id text NOT NULL,
    num_people integer NOT NULL,
    total_price numeric(10,2) NOT NULL,
    status public."BookingStatus" DEFAULT 'PENDING'::public."BookingStatus" NOT NULL,
    channel public."BookingChannel" DEFAULT 'WEBSITE'::public."BookingChannel" NOT NULL,
    stripe_payment_id text,
    cabin_number integer,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bookings OWNER TO egadisailing;

--
-- Name: crew_members; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.crew_members (
    id text NOT NULL,
    name text NOT NULL,
    role public."CrewRole" NOT NULL,
    phone text,
    email text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.crew_members OWNER TO egadisailing;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.customers (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    nationality text,
    language text DEFAULT 'it'::text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.customers OWNER TO egadisailing;

--
-- Name: portal_syncs; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.portal_syncs (
    id text NOT NULL,
    portal text NOT NULL,
    last_sync timestamp(3) without time zone,
    status text DEFAULT 'idle'::text NOT NULL,
    error_log text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.portal_syncs OWNER TO egadisailing;

--
-- Name: pricing_periods; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.pricing_periods (
    id text NOT NULL,
    service_id text NOT NULL,
    label text NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    price_per_person numeric(10,2) NOT NULL,
    year integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.pricing_periods OWNER TO egadisailing;

--
-- Name: services; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.services (
    id text NOT NULL,
    name text NOT NULL,
    type public."ServiceType" NOT NULL,
    description jsonb NOT NULL,
    duration_type public."DurationType" NOT NULL,
    duration_hours integer NOT NULL,
    capacity_max integer NOT NULL,
    min_paying integer,
    boat_id text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.services OWNER TO egadisailing;

--
-- Name: trip_crew; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.trip_crew (
    id text NOT NULL,
    trip_id text NOT NULL,
    crew_member_id text NOT NULL
);


ALTER TABLE public.trip_crew OWNER TO egadisailing;

--
-- Name: trips; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.trips (
    id text NOT NULL,
    service_id text NOT NULL,
    date date NOT NULL,
    departure_time text NOT NULL,
    return_time text NOT NULL,
    status public."TripStatus" DEFAULT 'SCHEDULED'::public."TripStatus" NOT NULL,
    available_spots integer NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.trips OWNER TO egadisailing;

--
-- Name: users; Type: TABLE; Schema: public; Owner: egadisailing
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role public."UserRole" DEFAULT 'STAFF'::public."UserRole" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO egadisailing;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
04322af8-7158-4b9c-91e6-d19226e55b0d	016665d13c8c5965475d694360d5caa88a11a1c7616e5761ec9ee10a7bda7075	2026-04-10 21:14:57.421677+00	20260410211457_init	\N	\N	2026-04-10 21:14:57.353351+00	1
\.


--
-- Data for Name: boats; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.boats (id, name, type, length, year, description, amenities, images, cabins, active, created_at, updated_at) FROM stdin;
seed-boat-trimarano	Trimarano	trimaran	\N	\N	{"en": "Trimaran for excursions and cabin charter in the Egadi Islands", "it": "Trimarano per escursioni e cabin charter nelle Isole Egadi"}	{"en": ["3 Cabins", "10 Berths", "Kitchen", "Bathroom", "Shower", "Fridge", "Speakers", "Shaded Area", "Snorkeling Gear"], "it": ["3 Cabine", "10 Posti Letto", "Cucina", "Bagno", "Doccia", "Frigo", "Casse Audio", "Zona Ombra", "Attrezzatura Snorkeling"]}	\N	3	t	2026-04-10 21:37:36.52	2026-04-10 21:37:36.52
seed-boat-barca	Barca	motorboat	\N	\N	{"en": "Motorboat for daily tours in the Egadi Islands", "it": "Barca a motore per tour giornalieri nelle Isole Egadi"}	{"en": ["10 Seats", "200 HP", "Bimini Top", "Swim Ladder", "Snorkeling Gear"], "it": ["10 Posti", "200 HP", "Tendalino", "Scaletta Bagno", "Attrezzatura Snorkeling"]}	\N	\N	t	2026-04-10 21:37:36.524	2026-04-10 21:37:36.524
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.bookings (id, trip_id, customer_id, num_people, total_price, status, channel, stripe_payment_id, cabin_number, notes, created_at, updated_at) FROM stdin;
seed-book-001	seed-trip-001	seed-cust-001	4	480.00	CONFIRMED	WEBSITE	\N	\N	\N	2026-04-15 22:07:49.238	2026-04-15 22:07:49.238
seed-book-002	seed-trip-001	seed-cust-003	2	240.00	CONFIRMED	GET_YOUR_GUIDE	\N	\N	\N	2026-04-15 22:07:49.242	2026-04-15 22:07:49.242
seed-book-003	seed-trip-001	seed-cust-005	6	720.00	CONFIRMED	AIRBNB	\N	\N	\N	2026-04-15 22:07:49.244	2026-04-15 22:07:49.244
seed-book-004	seed-trip-001	seed-cust-007	3	360.00	CONFIRMED	VIATOR	\N	\N	\N	2026-04-15 22:07:49.247	2026-04-15 22:07:49.247
seed-book-005	seed-trip-002	seed-cust-002	4	300.00	CONFIRMED	WEBSITE	\N	\N	\N	2026-04-15 22:07:49.25	2026-04-15 22:07:49.25
seed-book-006	seed-trip-002	seed-cust-004	3	225.00	CONFIRMED	MANUAL	\N	\N	\N	2026-04-15 22:07:49.253	2026-04-15 22:07:49.253
seed-book-007	seed-trip-003	seed-cust-006	20	4000.00	CONFIRMED	WEBSITE	\N	\N	\N	2026-04-15 22:07:49.256	2026-04-15 22:07:49.256
seed-book-008	seed-trip-004	seed-cust-008	5	600.00	CONFIRMED	GET_YOUR_GUIDE	\N	\N	\N	2026-04-15 22:07:49.259	2026-04-15 22:07:49.259
seed-book-009	seed-trip-004	seed-cust-009	4	480.00	CONFIRMED	CLICK_AND_BOAT	\N	\N	\N	2026-04-15 22:07:49.262	2026-04-15 22:07:49.262
seed-book-010	seed-trip-004	seed-cust-010	3	360.00	CONFIRMED	WEBSITE	\N	\N	\N	2026-04-15 22:07:49.265	2026-04-15 22:07:49.265
seed-book-011	seed-trip-005	seed-cust-001	12	900.00	CONFIRMED	MANUAL	\N	\N	\N	2026-04-15 22:07:49.268	2026-04-15 22:07:49.268
seed-book-012	seed-trip-006	seed-cust-002	3	360.00	CONFIRMED	WEBSITE	\N	\N	\N	2026-04-15 22:07:49.27	2026-04-15 22:07:49.27
seed-book-013	seed-trip-006	seed-cust-003	2	240.00	CONFIRMED	GET_YOUR_GUIDE	\N	\N	\N	2026-04-15 22:07:49.272	2026-04-15 22:07:49.272
seed-book-014	seed-trip-006	seed-cust-004	3	360.00	PENDING	AIRBNB	\N	\N	\N	2026-04-15 22:07:49.275	2026-04-15 22:07:49.275
seed-book-015	seed-trip-007	seed-cust-005	4	300.00	CONFIRMED	VIATOR	\N	\N	\N	2026-04-15 22:07:49.278	2026-04-15 22:07:49.278
seed-book-016	seed-trip-008	seed-cust-006	15	3000.00	CONFIRMED	WEBSITE	\N	\N	\N	2026-04-15 22:07:49.28	2026-04-15 22:07:49.28
seed-book-017	seed-trip-009	seed-cust-007	5	600.00	PENDING	MUSEMENT	\N	\N	\N	2026-04-15 22:07:49.283	2026-04-15 22:07:49.283
seed-book-018	seed-trip-004	seed-cust-004	2	240.00	CANCELLED	WEBSITE	\N	\N	\N	2026-04-15 22:07:49.286	2026-04-15 22:07:49.286
seed-book-019	seed-trip-002	seed-cust-008	5	375.00	REFUNDED	GET_YOUR_GUIDE	\N	\N	\N	2026-04-15 22:07:49.288	2026-04-15 22:07:49.288
\.


--
-- Data for Name: crew_members; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.crew_members (id, name, role, phone, email, active, created_at, updated_at) FROM stdin;
seed-crew-skipper	Skipper Demo	SKIPPER	+39 333 1234567	skipper@egadisailing.com	t	2026-04-10 21:37:36.605	2026-04-10 21:37:36.605
seed-crew-chef	Chef Demo	CHEF	+39 333 2345678	chef@egadisailing.com	t	2026-04-10 21:37:36.608	2026-04-10 21:37:36.608
seed-crew-hostess	Hostess Demo	HOSTESS	+39 333 3456789	hostess@egadisailing.com	t	2026-04-10 21:37:36.61	2026-04-10 21:37:36.61
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.customers (id, name, email, phone, nationality, language, notes, created_at, updated_at) FROM stdin;
seed-cust-001	Marco Rossi	marco.rossi@gmail.com	+39 340 1111111	IT	it	\N	2026-04-15 22:07:49.169	2026-04-15 22:07:49.169
seed-cust-002	Giulia Bianchi	giulia.b@outlook.com	+39 345 2222222	IT	it	\N	2026-04-15 22:07:49.171	2026-04-15 22:07:49.171
seed-cust-003	Hans Mueller	hans.mueller@web.de	+49 170 3333333	DE	de	\N	2026-04-15 22:07:49.173	2026-04-15 22:07:49.173
seed-cust-004	Sophie Dupont	sophie.dupont@free.fr	+33 6 44444444	FR	fr	\N	2026-04-15 22:07:49.174	2026-04-15 22:07:49.174
seed-cust-005	James Smith	james.smith@gmail.com	+44 7700 555555	GB	en	\N	2026-04-15 22:07:49.176	2026-04-15 22:07:49.176
seed-cust-006	Alessandro Ferretti	ale.ferretti@libero.it	+39 347 6666666	IT	it	\N	2026-04-15 22:07:49.178	2026-04-15 22:07:49.178
seed-cust-007	Anna Kowalski	anna.k@wp.pl	+48 500 777777	PL	pl	\N	2026-04-15 22:07:49.179	2026-04-15 22:07:49.179
seed-cust-008	Maria Garcia	maria.garcia@gmail.com	+34 600 888888	ES	es	\N	2026-04-15 22:07:49.181	2026-04-15 22:07:49.181
seed-cust-009	Luca Moretti	luca.moretti@gmail.com	+39 333 9999999	IT	it	\N	2026-04-15 22:07:49.183	2026-04-15 22:07:49.183
seed-cust-010	Emma Johnson	emma.j@yahoo.com	+44 7800 000000	GB	en	\N	2026-04-15 22:07:49.185	2026-04-15 22:07:49.185
\.


--
-- Data for Name: portal_syncs; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.portal_syncs (id, portal, last_sync, status, error_log, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pricing_periods; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.pricing_periods (id, service_id, label, start_date, end_date, price_per_person, year, created_at, updated_at) FROM stdin;
seed-pricing-001	seed-svc-social-boating	Bassa Stagione	2026-05-01 00:00:00	2026-05-31 00:00:00	120.00	2026	2026-04-10 21:37:36.56	2026-04-10 21:37:36.56
seed-pricing-002	seed-svc-social-boating	Media Stagione	2026-06-01 00:00:00	2026-07-15 00:00:00	135.00	2026	2026-04-10 21:37:36.563	2026-04-10 21:37:36.563
seed-pricing-003	seed-svc-social-boating	Alta Stagione	2026-07-16 00:00:00	2026-08-31 00:00:00	150.00	2026	2026-04-10 21:37:36.565	2026-04-10 21:37:36.565
seed-pricing-004	seed-svc-social-boating	Settembre	2026-09-01 00:00:00	2026-10-31 00:00:00	120.00	2026	2026-04-10 21:37:36.567	2026-04-10 21:37:36.567
seed-pricing-005	seed-svc-boat-shared-full	Bassa Stagione	2026-05-01 00:00:00	2026-05-31 00:00:00	75.00	2026	2026-04-10 21:37:36.57	2026-04-10 21:37:36.57
seed-pricing-006	seed-svc-boat-shared-full	Media Stagione	2026-06-01 00:00:00	2026-07-15 00:00:00	85.00	2026	2026-04-10 21:37:36.572	2026-04-10 21:37:36.572
seed-pricing-007	seed-svc-boat-shared-full	Alta Stagione	2026-07-16 00:00:00	2026-08-31 00:00:00	100.00	2026	2026-04-10 21:37:36.575	2026-04-10 21:37:36.575
seed-pricing-008	seed-svc-boat-shared-full	Settembre	2026-09-01 00:00:00	2026-10-31 00:00:00	75.00	2026	2026-04-10 21:37:36.577	2026-04-10 21:37:36.577
seed-pricing-009	seed-svc-boat-shared-morning	Bassa Stagione	2026-05-01 00:00:00	2026-05-31 00:00:00	60.00	2026	2026-04-10 21:37:36.579	2026-04-10 21:37:36.579
seed-pricing-010	seed-svc-boat-shared-morning	Media Stagione	2026-06-01 00:00:00	2026-07-15 00:00:00	75.00	2026	2026-04-10 21:37:36.581	2026-04-10 21:37:36.581
seed-pricing-011	seed-svc-boat-shared-morning	Alta Stagione	2026-07-16 00:00:00	2026-08-31 00:00:00	90.00	2026	2026-04-10 21:37:36.583	2026-04-10 21:37:36.583
seed-pricing-012	seed-svc-boat-shared-morning	Settembre	2026-09-01 00:00:00	2026-10-31 00:00:00	60.00	2026	2026-04-10 21:37:36.585	2026-04-10 21:37:36.585
seed-pricing-013	seed-svc-boat-exclusive-full	Bassa Stagione	2026-05-01 00:00:00	2026-05-31 00:00:00	75.00	2026	2026-04-10 21:37:36.587	2026-04-10 21:37:36.587
seed-pricing-014	seed-svc-boat-exclusive-full	Media Stagione	2026-06-01 00:00:00	2026-07-15 00:00:00	85.00	2026	2026-04-10 21:37:36.589	2026-04-10 21:37:36.589
seed-pricing-015	seed-svc-boat-exclusive-full	Alta Stagione	2026-07-16 00:00:00	2026-08-31 00:00:00	100.00	2026	2026-04-10 21:37:36.591	2026-04-10 21:37:36.591
seed-pricing-016	seed-svc-boat-exclusive-full	Settembre	2026-09-01 00:00:00	2026-10-31 00:00:00	75.00	2026	2026-04-10 21:37:36.592	2026-04-10 21:37:36.592
seed-pricing-017	seed-svc-boat-exclusive-morning	Bassa Stagione	2026-05-01 00:00:00	2026-05-31 00:00:00	60.00	2026	2026-04-10 21:37:36.594	2026-04-10 21:37:36.594
seed-pricing-018	seed-svc-boat-exclusive-morning	Media Stagione	2026-06-01 00:00:00	2026-07-15 00:00:00	75.00	2026	2026-04-10 21:37:36.596	2026-04-10 21:37:36.596
seed-pricing-019	seed-svc-boat-exclusive-morning	Alta Stagione	2026-07-16 00:00:00	2026-08-31 00:00:00	90.00	2026	2026-04-10 21:37:36.598	2026-04-10 21:37:36.598
seed-pricing-020	seed-svc-boat-exclusive-morning	Settembre	2026-09-01 00:00:00	2026-10-31 00:00:00	60.00	2026	2026-04-10 21:37:36.6	2026-04-10 21:37:36.6
seed-pricing-021	seed-svc-cabin-charter	Alta Stagione	2026-07-16 00:00:00	2026-08-31 00:00:00	2300.00	2026	2026-04-10 21:37:36.602	2026-04-10 21:37:36.602
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.services (id, name, type, description, duration_type, duration_hours, capacity_max, min_paying, boat_id, active, created_at, updated_at) FROM stdin;
seed-svc-social-boating	Social Boating	SOCIAL_BOATING	{"en": "Social boating experience on a trimaran in the Egadi Islands", "it": "Esperienza di social boating in trimarano nelle Isole Egadi"}	FULL_DAY	8	20	11	seed-boat-trimarano	t	2026-04-10 21:37:36.529	2026-04-10 21:37:36.529
seed-svc-exclusive-experience	Exclusive Experience	EXCLUSIVE_EXPERIENCE	{"en": "Exclusive experience on a trimaran in the Egadi Islands", "it": "Esperienza esclusiva in trimarano nelle Isole Egadi"}	FULL_DAY	8	20	\N	seed-boat-trimarano	t	2026-04-10 21:37:36.534	2026-04-10 21:37:36.534
seed-svc-cabin-charter	Cabin Charter	CABIN_CHARTER	{"en": "Weekly cabin charter on a trimaran in the Egadi Islands", "it": "Cabin charter settimanale in trimarano nelle Isole Egadi"}	WEEK	168	8	\N	seed-boat-trimarano	t	2026-04-10 21:37:36.538	2026-04-10 21:37:36.538
seed-svc-boat-shared-full	Boat Tour Condiviso Giornata	BOAT_SHARED	{"en": "Shared full-day motorboat tour in the Egadi Islands", "it": "Tour condiviso in barca a motore, giornata intera nelle Isole Egadi"}	FULL_DAY	8	12	\N	seed-boat-barca	t	2026-04-10 21:37:36.545	2026-04-10 21:37:36.545
seed-svc-boat-shared-morning	Boat Tour Condiviso Mattina	BOAT_SHARED	{"en": "Shared morning motorboat tour in the Egadi Islands", "it": "Tour condiviso in barca a motore, mattina nelle Isole Egadi"}	HALF_DAY_MORNING	4	12	\N	seed-boat-barca	t	2026-04-10 21:37:36.548	2026-04-10 21:37:36.548
seed-svc-boat-exclusive-full	Boat Tour Esclusivo Giornata	BOAT_EXCLUSIVE	{"en": "Exclusive full-day motorboat tour in the Egadi Islands", "it": "Tour esclusivo in barca a motore, giornata intera nelle Isole Egadi"}	FULL_DAY	8	12	\N	seed-boat-barca	t	2026-04-10 21:37:36.552	2026-04-10 21:37:36.552
seed-svc-boat-exclusive-morning	Boat Tour Esclusivo Mattina	BOAT_EXCLUSIVE	{"en": "Exclusive morning motorboat tour in the Egadi Islands", "it": "Tour esclusivo in barca a motore, mattina nelle Isole Egadi"}	HALF_DAY_MORNING	4	12	\N	seed-boat-barca	t	2026-04-10 21:37:36.556	2026-04-10 21:37:36.556
\.


--
-- Data for Name: trip_crew; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.trip_crew (id, trip_id, crew_member_id) FROM stdin;
seed-tc-001-skipper	seed-trip-001	seed-crew-skipper
seed-tc-001-ew-chef	seed-trip-001	seed-crew-chef
seed-tc-001-hostess	seed-trip-001	seed-crew-hostess
seed-tc-003-skipper	seed-trip-003	seed-crew-skipper
seed-tc-003-ew-chef	seed-trip-003	seed-crew-chef
seed-tc-006-skipper	seed-trip-006	seed-crew-skipper
seed-tc-006-ew-chef	seed-trip-006	seed-crew-chef
seed-tc-006-hostess	seed-trip-006	seed-crew-hostess
seed-tc-008-skipper	seed-trip-008	seed-crew-skipper
seed-tc-008-ew-chef	seed-trip-008	seed-crew-chef
\.


--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.trips (id, service_id, date, departure_time, return_time, status, available_spots, notes, created_at, updated_at) FROM stdin;
seed-trip-001	seed-svc-social-boating	2026-04-05	09:00	17:00	COMPLETED	5	\N	2026-04-15 22:07:49.188	2026-04-15 22:07:49.188
seed-trip-002	seed-svc-boat-shared-full	2026-04-06	09:00	17:00	COMPLETED	4	\N	2026-04-15 22:07:49.191	2026-04-15 22:07:49.191
seed-trip-003	seed-svc-exclusive-experience	2026-04-08	10:00	18:00	COMPLETED	0	\N	2026-04-15 22:07:49.193	2026-04-15 22:07:49.193
seed-trip-004	seed-svc-social-boating	2026-04-10	09:00	17:00	COMPLETED	8	\N	2026-04-15 22:07:49.195	2026-04-15 22:07:49.195
seed-trip-005	seed-svc-boat-exclusive-full	2026-04-12	09:00	17:00	COMPLETED	0	\N	2026-04-15 22:07:49.197	2026-04-15 22:07:49.197
seed-trip-006	seed-svc-social-boating	2026-04-16	09:00	17:00	SCHEDULED	12	\N	2026-04-15 22:07:49.202	2026-04-15 22:07:49.202
seed-trip-007	seed-svc-boat-shared-full	2026-04-17	09:00	17:00	SCHEDULED	8	\N	2026-04-15 22:07:49.204	2026-04-15 22:07:49.204
seed-trip-008	seed-svc-exclusive-experience	2026-04-18	10:00	18:00	SCHEDULED	20	\N	2026-04-15 22:07:49.207	2026-04-15 22:07:49.207
seed-trip-009	seed-svc-social-boating	2026-04-20	09:00	17:00	SCHEDULED	15	\N	2026-04-15 22:07:49.208	2026-04-15 22:07:49.208
seed-trip-010	seed-svc-boat-exclusive-morning	2026-04-20	09:00	13:00	SCHEDULED	12	\N	2026-04-15 22:07:49.21	2026-04-15 22:07:49.21
seed-trip-011	seed-svc-boat-shared-morning	2026-04-22	09:00	13:00	SCHEDULED	10	\N	2026-04-15 22:07:49.212	2026-04-15 22:07:49.212
seed-trip-012	seed-svc-social-boating	2026-04-25	09:00	17:00	SCHEDULED	20	\N	2026-04-15 22:07:49.214	2026-04-15 22:07:49.214
seed-trip-013	seed-svc-boat-shared-full	2026-04-09	09:00	17:00	CANCELLED	12	\N	2026-04-15 22:07:49.216	2026-04-15 22:07:49.216
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: egadisailing
--

COPY public.users (id, email, password_hash, name, role, created_at, updated_at) FROM stdin;
seed-admin-001	admin@egadisailing.com	$2b$10$Fqawt9r2bqxXRluIr8VAfeRSn36B2VB81ZZRGvpDVShEPVLythldm	Admin	ADMIN	2026-04-10 21:37:36.513	2026-04-10 21:37:36.513
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: boats boats_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.boats
    ADD CONSTRAINT boats_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: crew_members crew_members_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.crew_members
    ADD CONSTRAINT crew_members_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: portal_syncs portal_syncs_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.portal_syncs
    ADD CONSTRAINT portal_syncs_pkey PRIMARY KEY (id);


--
-- Name: pricing_periods pricing_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.pricing_periods
    ADD CONSTRAINT pricing_periods_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: trip_crew trip_crew_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.trip_crew
    ADD CONSTRAINT trip_crew_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: customers_email_key; Type: INDEX; Schema: public; Owner: egadisailing
--

CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email);


--
-- Name: trip_crew_trip_id_crew_member_id_key; Type: INDEX; Schema: public; Owner: egadisailing
--

CREATE UNIQUE INDEX trip_crew_trip_id_crew_member_id_key ON public.trip_crew USING btree (trip_id, crew_member_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: egadisailing
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: bookings bookings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: bookings bookings_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pricing_periods pricing_periods_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.pricing_periods
    ADD CONSTRAINT pricing_periods_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: services services_boat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_boat_id_fkey FOREIGN KEY (boat_id) REFERENCES public.boats(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: trip_crew trip_crew_crew_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.trip_crew
    ADD CONSTRAINT trip_crew_crew_member_id_fkey FOREIGN KEY (crew_member_id) REFERENCES public.crew_members(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: trip_crew trip_crew_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.trip_crew
    ADD CONSTRAINT trip_crew_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: trips trips_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: egadisailing
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict OzZ8fbcJPJtn8zMNqTeESZJjGJW2DB4TiZ9G1yc4Gzavj0l0ZvxI5qPlzLR1ef9

