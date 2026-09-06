"""
===============================================================================
PAIMANA Composite Risk Scoring Engine
===============================================================================
Combines ML ensemble risk probabilities (60% weight) and temporal variance / schedule
trend metrics (40% weight) into a unified 0-100 composite risk score per project.

Classifies each project into risk bands:
- Green: composite_risk_score < 35 (Low Risk / On Track)
- Amber: 35 <= composite_risk_score <= 70 (Moderate Risk / Monitoring Required)
- Red: composite_risk_score > 70 (High Risk / Immediate Intervention Needed)

Persists evaluation results and top SHAP factors to database `risk_scores` table.
===============================================================================
"""

import os
import json
import datetime
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from models.ml_ensemble import explain_prediction

DB_URL = os.getenv("DATABASE_URL", "sqlite:///paimana.db")

# Default Risk Engine Weights (Configurable)
RISK_WEIGHT_ML_COST = 0.35
RISK_WEIGHT_ML_TIME = 0.25
RISK_WEIGHT_SCHEDULE_VARIANCE = 0.25
RISK_WEIGHT_MILESTONE_SLIPPAGE = 0.15


def calculate_composite_risk(df_features):
    """
    Computes 0-100 composite risk score for each project's latest snapshot.
    """
    print("Calculating composite project risk scores...")
    df_features["month"] = pd.to_datetime(df_features["month"])

    # Get latest snapshot per project
    latest_snapshots = df_features.sort_values("month").groupby("project_id").last().reset_index()

    # Get ML XGBoost models
    from models.ml_ensemble import ENGINEERED_FIELDS
    import joblib
    xgb_cost_path = os.path.join("models/saved", "xgb_cost_model.joblib")
    xgb_time_path = os.path.join("models/saved", "xgb_time_model.joblib")

    if not os.path.exists(xgb_cost_path):
        from models.ml_ensemble import train_and_evaluate
        train_and_evaluate()

    model_cost = joblib.load(xgb_cost_path)
    model_time = joblib.load(xgb_time_path)

    X_mat = latest_snapshots[ENGINEERED_FIELDS].fillna(0.0)
    cost_probs = model_cost.predict_proba(X_mat)[:, 1]
    time_probs = model_time.predict_proba(X_mat)[:, 1]

    risk_records = []
    for idx, row in latest_snapshots.iterrows():
        pid = row["project_id"]
        c_prob = float(cost_probs[idx])
        t_prob = float(time_probs[idx])

        # Normalize schedule & milestone variance to 0-1
        sched_var = float(np.clip(max(0.0, row.get("time_variance_pct", 0.0)), 0.0, 1.0))
        mile_var = float(np.clip(row.get("milestone_slippage_rate", 0.0), 0.0, 1.0))

        # Composite score formula (0 to 100)
        raw_score = (
            (c_prob * RISK_WEIGHT_ML_COST) +
            (t_prob * RISK_WEIGHT_ML_TIME) +
            (sched_var * RISK_WEIGHT_SCHEDULE_VARIANCE) +
            (mile_var * RISK_WEIGHT_MILESTONE_SLIPPAGE)
        ) * 100.0

        comp_score = round(float(np.clip(raw_score, 0.0, 100.0)), 1)

        # Risk band assignment
        if comp_score > 70.0:
            band = "Red"
        elif comp_score >= 35.0:
            band = "Amber"
        else:
            band = "Green"

        # Get SHAP explanation
        explanation = explain_prediction(pid, df_features)
        top_factors_json = json.dumps(explanation.get("top_5_risk_factors", []))

        risk_records.append({
            "project_id": pid,
            "score_date": datetime.date.today().strftime("%Y-%m-%d"),
            "cost_overrun_risk": round(c_prob, 3),
            "time_overrun_risk": round(t_prob, 3),
            "composite_risk_score": comp_score,
            "risk_band": band,
            "top_factors": top_factors_json
        })

    df_risk = pd.DataFrame(risk_records)
    print(f"Risk evaluation complete for {len(df_risk)} projects:")
    print(df_risk["risk_band"].value_counts())
    return df_risk


def save_risk_scores_to_db(df_risk):
    engine = create_engine(DB_URL)
    is_sqlite = DB_URL.startswith("sqlite")

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM risk_scores;"))

    df_risk.to_sql("risk_scores", con=engine, if_exists="append", index=False)
    print("Risk scores successfully saved to database table `risk_scores`.")


if __name__ == "__main__":
    df_feat = pd.read_parquet(os.path.join("data", "features.parquet"))
    df_r = calculate_composite_risk(df_feat)
    save_risk_scores_to_db(df_r)
