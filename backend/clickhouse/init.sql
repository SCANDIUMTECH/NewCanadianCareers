-- ============================================================
-- Orion RUM (Real User Monitoring) — ClickHouse Schema
-- ============================================================

-- Raw web vitals events
CREATE TABLE IF NOT EXISTS web_vitals (
    timestamp DateTime,
    session_id String,
    page_url String,
    page_path String,
    metric_name LowCardinality(String),   -- 'LCP', 'CLS', 'INP'
    metric_value Float64,
    rating LowCardinality(String),        -- 'good', 'needs-improvement', 'poor'
    navigation_type LowCardinality(String),
    device_type LowCardinality(String),   -- 'mobile', 'desktop', 'tablet'
    connection_type LowCardinality(String),
    release String,
    trace_id String,
    site_id LowCardinality(String) DEFAULT 'orion'
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, metric_name, timestamp)
TTL timestamp + INTERVAL 90 DAY;


-- Hourly rollup (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS web_vitals_hourly
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (site_id, metric_name, hour, device_type)
AS SELECT
    toStartOfHour(timestamp) AS hour,
    site_id,
    metric_name,
    device_type,
    count() AS sample_count,
    sum(metric_value) AS value_sum,
    quantileState(0.75)(metric_value) AS p75_state,
    quantileState(0.95)(metric_value) AS p95_state
FROM web_vitals
GROUP BY hour, site_id, metric_name, device_type;


-- Daily rollup (materialized view)
CREATE MATERIALIZED VIEW IF NOT EXISTS web_vitals_daily
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (site_id, metric_name, day)
AS SELECT
    toStartOfDay(timestamp) AS day,
    site_id,
    metric_name,
    count() AS sample_count,
    sum(metric_value) AS value_sum,
    quantileState(0.75)(metric_value) AS p75_state,
    quantileState(0.95)(metric_value) AS p95_state
FROM web_vitals
GROUP BY day, site_id, metric_name;
