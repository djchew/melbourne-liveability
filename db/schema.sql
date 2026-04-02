-- Melbourne Liveability Index — Database Schema
-- PostgreSQL 17 on Neon.tech

-- Enable PostGIS for geographic data (if available on Neon)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- SUBURBS
-- ============================================================
CREATE TABLE IF NOT EXISTS suburbs (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    postcode    VARCHAR(10),
    lga         VARCHAR(100),          -- Local Government Area
    latitude    NUMERIC(9, 6),
    longitude   NUMERIC(9, 6),
    geometry    TEXT,                  -- GeoJSON polygon (suburb boundary)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suburbs_name ON suburbs (LOWER(name));

-- ============================================================
-- CRIME STATS (Crime Statistics Agency Victoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS crime_stats (
    id              SERIAL PRIMARY KEY,
    suburb_id       INT REFERENCES suburbs(id) ON DELETE CASCADE,
    year            INT NOT NULL,
    offence_count   INT,
    rate_per_100k   NUMERIC(8, 2),     -- offences per 100,000 population
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crime_suburb ON crime_stats (suburb_id, year);

-- ============================================================
-- TRANSPORT SCORES (PTV GTFS feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS transport_scores (
    id                      SERIAL PRIMARY KEY,
    suburb_id               INT REFERENCES suburbs(id) ON DELETE CASCADE,
    stop_count              INT,       -- number of stops within suburb
    services_per_day        INT,       -- avg daily services
    nearest_train_km        NUMERIC(6, 2),
    nearest_tram_km         NUMERIC(6, 2),
    nearest_bus_km          NUMERIC(6, 2),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHOOL SCORES (ACARA My School)
-- ============================================================
CREATE TABLE IF NOT EXISTS school_scores (
    id                  SERIAL PRIMARY KEY,
    suburb_id           INT REFERENCES suburbs(id) ON DELETE CASCADE,
    school_count        INT,
    avg_icsea_score     NUMERIC(6, 1),  -- Index of Community Socio-Educational Advantage
    primary_count       INT,
    secondary_count     INT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GREEN SPACE (OpenStreetMap)
-- ============================================================
CREATE TABLE IF NOT EXISTS greenspace_scores (
    id                      SERIAL PRIMARY KEY,
    suburb_id               INT REFERENCES suburbs(id) ON DELETE CASCADE,
    park_count              INT,
    total_green_area_sqm    NUMERIC(15, 2),
    green_pct_of_suburb     NUMERIC(5, 2),  -- % of suburb that is green space
    nearest_park_km         NUMERIC(6, 2),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPERTY PRICES (DFFH / Domain)
-- ============================================================
CREATE TABLE IF NOT EXISTS property_prices (
    id                  SERIAL PRIMARY KEY,
    suburb_id           INT REFERENCES suburbs(id) ON DELETE CASCADE,
    year                INT NOT NULL,
    median_house_price  INT,
    median_unit_price   INT,
    yoy_growth_pct      NUMERIC(5, 2),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_suburb ON property_prices (suburb_id, year);

-- ============================================================
-- LIVEABILITY SCORES (computed composite)
-- ============================================================
CREATE TABLE IF NOT EXISTS liveability_scores (
    id                  SERIAL PRIMARY KEY,
    suburb_id           INT REFERENCES suburbs(id) ON DELETE CASCADE,
    score_crime         NUMERIC(5, 2),      -- 0–100, higher = safer
    score_transport     NUMERIC(5, 2),      -- 0–100
    score_schools       NUMERIC(5, 2),      -- 0–100
    score_greenspace    NUMERIC(5, 2),      -- 0–100
    score_affordability NUMERIC(5, 2),      -- 0–100, higher = more affordable
    score_total         NUMERIC(5, 2),      -- weighted composite
    computed_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_liveability_suburb ON liveability_scores (suburb_id);
