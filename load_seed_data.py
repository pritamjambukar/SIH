"""
===============================================================================
PAIMANA Seed Data Loader
===============================================================================
Loads generated `projects.csv` and `monthly_progress.csv` into the database.
Supports both PostgreSQL (with PostGIS) and SQLite for local development.
===============================================================================
"""

import os
import sys
import pandas as pd
import psycopg2
import sqlite3
from sqlalchemy import create_engine, text

# Environment database URL with PostgreSQL default & SQLite fallback
DB_URL = os.getenv("DATABASE_URL", "postgresql://paimana:paimana_secret@localhost:5432/paimana_db")


def load_schema_and_seed():
    print(f"Connecting to database at: {DB_URL.split('@')[-1] if '@' in DB_URL else DB_URL}")

    # Check if using SQLite or PostgreSQL
    is_sqlite = DB_URL.startswith("sqlite")

    projects_csv = os.path.join("data", "projects.csv")
    monthly_csv = os.path.join("data", "monthly_progress.csv")

    if not os.path.exists(projects_csv) or not os.path.exists(monthly_csv):
        print("CSV files missing in data/. Running generate_synthetic_paimana_data.py first...")
        import generate_synthetic_paimana_data
        generate_synthetic_paimana_data.generate_paimana_data()

    df_projects = pd.read_csv(projects_csv)
    df_monthly = pd.read_csv(monthly_csv)

    engine = create_engine(DB_URL)

    with engine.begin() as conn:
        if is_sqlite:
            print("Applying SQLite schema fallback...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS projects (
                    project_id TEXT PRIMARY KEY,
                    project_name TEXT NOT NULL,
                    ministry TEXT NOT NULL,
                    sector TEXT NOT NULL,
                    implementing_agency TEXT NOT NULL,
                    state TEXT NOT NULL,
                    latitude REAL,
                    longitude REAL,
                    approval_date TEXT NOT NULL,
                    original_cost_cr REAL NOT NULL,
                    revised_cost_cr REAL NOT NULL,
                    approved_completion_date TEXT NOT NULL,
                    revised_completion_date TEXT NOT NULL,
                    cumulative_expenditure_cr REAL DEFAULT 0.0,
                    num_milestones INTEGER DEFAULT 0,
                    milestones_completed INTEGER DEFAULT 0,
                    milestones_delayed INTEGER DEFAULT 0,
                    status TEXT NOT NULL
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS monthly_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    month TEXT NOT NULL,
                    cumulative_expenditure_cr REAL NOT NULL,
                    physical_progress_pct REAL NOT NULL,
                    reported_issues TEXT,
                    FOREIGN KEY(project_id) REFERENCES projects(project_id)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS risk_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    score_date TEXT NOT NULL,
                    cost_overrun_risk REAL NOT NULL,
                    time_overrun_risk REAL NOT NULL,
                    composite_risk_score REAL NOT NULL,
                    risk_band TEXT NOT NULL,
                    top_factors TEXT,
                    FOREIGN KEY(project_id) REFERENCES projects(project_id)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    alert_date TEXT NOT NULL,
                    message TEXT NOT NULL,
                    channel TEXT DEFAULT 'Email',
                    sent INTEGER DEFAULT 0,
                    FOREIGN KEY(project_id) REFERENCES projects(project_id)
                );
            """))
        else:
            print("Applying PostgreSQL migration schema...")
            migration_file = os.path.join("migrations", "001_initial_schema.sql")
            if os.path.exists(migration_file):
                with open(migration_file, "r") as f:
                    sql_statements = f.read()
                # Execute migration
                conn.execute(text(sql_statements))

        print("Clearing existing table records...")
        conn.execute(text("DELETE FROM monthly_progress;"))
        conn.execute(text("DELETE FROM risk_scores;"))
        conn.execute(text("DELETE FROM alerts;"))
        conn.execute(text("DELETE FROM projects;"))

    print(f"Seeding {len(df_projects)} projects into database...")
    df_projects.to_sql("projects", con=engine, if_exists="append", index=False)

    print(f"Seeding {len(df_monthly)} monthly progress logs into database...")
    df_monthly.to_sql("monthly_progress", con=engine, if_exists="append", index=False)

    # Post-process PostgreSQL geometry field if PostGIS is enabled
    if not is_sqlite:
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE projects
                SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
            """))

    print("Seed data loaded successfully!")


if __name__ == "__main__":
    load_schema_and_seed()
