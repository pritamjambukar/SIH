-- Migration 001: Initial PAIMANA Database Schema
-- Enables PostGIS extension and creates core analytical tables

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    project_id VARCHAR(32) PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    ministry VARCHAR(128) NOT NULL,
    sector VARCHAR(128) NOT NULL,
    implementing_agency VARCHAR(128) NOT NULL,
    state VARCHAR(64) NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    geom GEOGRAPHY(Point, 4326),
    approval_date DATE NOT NULL,
    original_cost_cr NUMERIC(12, 2) NOT NULL,
    revised_cost_cr NUMERIC(12, 2) NOT NULL,
    approved_completion_date DATE NOT NULL,
    revised_completion_date DATE NOT NULL,
    cumulative_expenditure_cr NUMERIC(12, 2) DEFAULT 0.0,
    num_milestones INT DEFAULT 0,
    milestones_completed INT DEFAULT 0,
    milestones_delayed INT DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'Ongoing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Monthly Progress Log Table
CREATE TABLE IF NOT EXISTS monthly_progress (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    month DATE NOT NULL,
    cumulative_expenditure_cr NUMERIC(12, 2) NOT NULL,
    physical_progress_pct NUMERIC(5, 2) NOT NULL,
    reported_issues TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Risk Scores Table
CREATE TABLE IF NOT EXISTS risk_scores (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    score_date DATE NOT NULL,
    cost_overrun_risk FLOAT NOT NULL,
    time_overrun_risk FLOAT NOT NULL,
    composite_risk_score FLOAT NOT NULL,
    risk_band VARCHAR(16) NOT NULL CHECK (risk_band IN ('Green', 'Amber', 'Red')),
    top_factors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(32) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
    message TEXT NOT NULL,
    channel VARCHAR(32) DEFAULT 'Email',
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookup & GIS querying
CREATE INDEX IF NOT EXISTS idx_projects_sector ON projects(sector);
CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(state);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_geom ON projects USING GIST(geom);

CREATE INDEX IF NOT EXISTS idx_monthly_progress_project_month ON monthly_progress(project_id, month);
CREATE INDEX IF NOT EXISTS idx_risk_scores_project_band ON risk_scores(project_id, risk_band);
CREATE INDEX IF NOT EXISTS idx_risk_scores_date ON risk_scores(score_date);
CREATE INDEX IF NOT EXISTS idx_alerts_sent ON alerts(sent, project_id);
