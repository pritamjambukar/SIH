"""
===============================================================================
PAIMANA Monthly Batch Scoring Runner
===============================================================================
Simulates the monthly PAIMANA evaluation cycle:
1. Reloads project progress snapshots & updates engineered feature dataset
2. Runs Risk Engine to score all 2,000 projects
3. Updates `risk_scores` database table
4. Generates automatic email alert logs for projects transitioning into 'Red' status
===============================================================================
"""

import os
import json
import pandas as pd
from sqlalchemy import create_engine, text
from feature_engineering import generate_feature_dataset
from risk_engine import calculate_composite_risk, save_risk_scores_to_db

DB_URL = os.getenv("DATABASE_URL", "sqlite:///paimana.db")


def run_monthly_pipeline():
    print("=========================================================")
    print("STARTING PAIMANA MONTHLY EVALUATION & SCORING PIPELINE")
    print("=========================================================")

    # 1. Feature Engineering
    df_features = generate_feature_dataset()

    # 2. Risk Calculation & Persistence
    df_risk = calculate_composite_risk(df_features)
    save_risk_scores_to_db(df_risk)

    # 3. Check for RED Alert Triggers
    engine = create_engine(DB_URL)
    red_projects = df_risk[df_risk["risk_band"] == "Red"]
    print(f"\n[ALERT MONITOR] Found {len(red_projects)} projects currently in RED high-risk band.")

    alert_records = []
    for idx, row in red_projects.iterrows():
        pid = row["project_id"]
        msg = f"CRITICAL: Project {pid} entered RED risk band with Composite Score {row['composite_risk_score']:.1f}/100. Cost overrun risk: {row['cost_overrun_risk']*100:.1f}%."
        alert_records.append({
            "project_id": pid,
            "alert_date": row["score_date"],
            "message": msg,
            "channel": "Email",
            "sent": 1
        })

    if alert_records:
        df_alerts = pd.DataFrame(alert_records)
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM alerts;"))
        df_alerts.to_sql("alerts", con=engine, if_exists="append", index=False)
        print(f"Generated and stored {len(df_alerts)} high-priority alerts in database table `alerts`.")

    print("\nMONTHLY EVALUATION PIPELINE COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    run_monthly_pipeline()
