"""
===============================================================================
PAIMANA Feature Engineering Pipeline
===============================================================================
Extracts monthly project snapshots from the database or data files and engineers
predictive risk features for machine learning models.

FEATURE DICTIONARY & PREDICTIVE RATIONALE:
------------------------------------------
1. cost_variance_pct:
   (cumulative_expenditure_cr - expected_expenditure_to_date) / original_cost_cr
   Signals whether spending is outpacing actual physical progress.

2. time_variance_pct:
   (pct_time_elapsed - physical_progress_pct) / 100.0
   Quantifies physical schedule slippage relative to elapsed time ratio.

3. milestone_slippage_rate:
   milestones_delayed / max(1, num_milestones)
   Measures proportion of contractual milestones missed or behind schedule.

4. agency_track_record:
   Historical average overrun % for the project's implementing_agency calculated
   LEAVE-ONE-OUT (excluding the target project itself) to prevent data leakage.
   Reflects agency-level operational efficiency & procurement delays.

5. sector_avg_overrun:
   Historical average overrun % for the project's sector calculated LEAVE-ONE-OUT.
   Captures sector-wide structural risk (e.g., linear land acquisition vs brownfield).

6. Issue Flags (land_acquisition_delay, contractor_delay, weather_disruption, fund_delay, clearance_delay):
   Binary indicators extracted from reported_issues free text in monthly progress logs.
   Serves as strong early warning signals occurring in months 1-12.

7. months_since_approval, pct_time_elapsed, pct_budget_spent:
   Temporal and budget lifecycle progression metrics.
===============================================================================
"""

import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine

DB_URL = os.getenv("DATABASE_URL", "sqlite:///paimana.db")


def load_raw_data():
    """Loads projects and monthly progress tables from DB or fallback CSVs."""
    projects_csv = os.path.join("data", "projects.csv")
    monthly_csv = os.path.join("data", "monthly_progress.csv")

    if os.path.exists(projects_csv) and os.path.exists(monthly_csv):
        df_projects = pd.read_csv(projects_csv)
        df_monthly = pd.read_csv(monthly_csv)
    else:
        engine = create_engine(DB_URL)
        df_projects = pd.read_sql("SELECT * FROM projects", con=engine)
        df_monthly = pd.read_sql("SELECT * FROM monthly_progress", con=engine)

    return df_projects, df_monthly


def compute_agency_track_record(df_projects):
    """
    Computes Leave-One-Out (LOO) historical overrun rate per agency.
    Ensures a project's own overrun is NEVER included in its agency track record score.
    """
    # Overrun ratio = (revised_cost_cr - original_cost_cr) / original_cost_cr
    df_projects = df_projects.copy()
    df_projects["overrun_pct"] = (df_projects["revised_cost_cr"] - df_projects["original_cost_cr"]) / df_projects["original_cost_cr"]

    agency_stats = df_projects.groupby("implementing_agency")["overrun_pct"].agg(["sum", "count"])

    loo_scores = {}
    for idx, row in df_projects.iterrows():
        pid = row["project_id"]
        agency = row["implementing_agency"]
        self_overrun = row["overrun_pct"]

        total_sum = agency_stats.loc[agency, "sum"]
        total_cnt = agency_stats.loc[agency, "count"]

        if total_cnt > 1:
            loo_avg = (total_sum - self_overrun) / (total_cnt - 1)
        else:
            # Fallback to global average if agency only has 1 project
            loo_avg = df_projects["overrun_pct"].mean()

        loo_scores[pid] = loo_avg

    return loo_scores


def compute_sector_avg_overrun(df_projects):
    """
    Computes Leave-One-Out (LOO) historical overrun rate per sector.
    """
    df_projects = df_projects.copy()
    df_projects["overrun_pct"] = (df_projects["revised_cost_cr"] - df_projects["original_cost_cr"]) / df_projects["original_cost_cr"]

    sector_stats = df_projects.groupby("sector")["overrun_pct"].agg(["sum", "count"])

    loo_scores = {}
    for idx, row in df_projects.iterrows():
        pid = row["project_id"]
        sector = row["sector"]
        self_overrun = row["overrun_pct"]

        total_sum = sector_stats.loc[sector, "sum"]
        total_cnt = sector_stats.loc[sector, "count"]

        if total_cnt > 1:
            loo_avg = (total_sum - self_overrun) / (total_cnt - 1)
        else:
            loo_avg = df_projects["overrun_pct"].mean()

        loo_scores[pid] = loo_avg

    return loo_scores


def extract_issue_flags(issues_text):
    """Extracts keyword-based boolean issue flags from reported_issues free text."""
    if pd.isna(issues_text) or not isinstance(issues_text, str):
        return {
            "land_acquisition_delay": False,
            "contractor_delay": False,
            "weather_disruption": False,
            "fund_delay": False,
            "clearance_delay": False
        }

    text_lower = issues_text.lower()
    return {
        "land_acquisition_delay": any(k in text_lower for k in ["land", "acquisition", "row", "right of way"]),
        "contractor_delay": any(k in text_lower for k in ["contractor", "mobilization", "subcontractor"]),
        "weather_disruption": any(k in text_lower for k in ["monsoon", "weather", "flood"]),
        "fund_delay": any(k in text_lower for k in ["fund", "release", "financial", "payment"]),
        "clearance_delay": any(k in text_lower for k in ["clearance", "environmental", "forest", "approval"])
    }


def generate_feature_dataset():
    print("Loading raw project & monthly progress data...")
    df_projects, df_monthly = load_raw_data()

    # Pre-compute Leave-One-Out agency & sector track records
    agency_loo = compute_agency_track_record(df_projects)
    sector_loo = compute_sector_avg_overrun(df_projects)

    df_projects["agency_track_record"] = df_projects["project_id"].map(agency_loo)
    df_projects["sector_avg_overrun"] = df_projects["project_id"].map(sector_loo)

    # Convert date fields
    df_projects["approval_date"] = pd.to_datetime(df_projects["approval_date"])
    df_projects["approved_completion_date"] = pd.to_datetime(df_projects["approved_completion_date"])
    df_projects["revised_completion_date"] = pd.to_datetime(df_projects["revised_completion_date"])

    df_projects["target_cost_overrun_pct"] = (df_projects["revised_cost_cr"] - df_projects["original_cost_cr"]) / df_projects["original_cost_cr"]
    df_projects["target_cost_overrun_flag"] = (df_projects["target_cost_overrun_pct"] > 0.10).astype(int)

    df_projects["target_time_overrun_months"] = (df_projects["revised_completion_date"] - df_projects["approved_completion_date"]).dt.days / 30.4375
    df_projects["target_time_overrun_flag"] = (df_projects["target_time_overrun_months"] > 3.0).astype(int)

    df_monthly["month"] = pd.to_datetime(df_monthly["month"])

    print("Engineering features per project monthly snapshot...")
    merged = df_monthly.merge(
        df_projects[[
            "project_id", "sector", "ministry", "implementing_agency", "state",
            "approval_date", "approved_completion_date", "original_cost_cr",
            "num_milestones", "milestones_delayed", "agency_track_record", "sector_avg_overrun",
            "target_cost_overrun_pct", "target_cost_overrun_flag",
            "target_time_overrun_months", "target_time_overrun_flag"
        ]],
        on="project_id",
        how="inner"
    )

    # Derived temporal features
    merged["months_since_approval"] = ((merged["month"] - merged["approval_date"]).dt.days / 30.4375).clip(lower=0.1)
    merged["total_planned_duration_months"] = ((merged["approved_completion_date"] - merged["approval_date"]).dt.days / 30.4375).clip(lower=1.0)
    merged["pct_time_elapsed"] = ((merged["months_since_approval"] / merged["total_planned_duration_months"]) * 100.0).clip(upper=150.0)

    # Budget spent ratio
    merged["pct_budget_spent"] = (merged["cumulative_expenditure_cr"] / merged["original_cost_cr"]) * 100.0

    # Expected expenditure at this point based on linear/S-curve progress
    merged["expected_expenditure_to_date"] = merged["original_cost_cr"] * (merged["physical_progress_pct"] / 100.0)
    merged["cost_variance_pct"] = (merged["cumulative_expenditure_cr"] - merged["expected_expenditure_to_date"]) / merged["original_cost_cr"]

    # Time variance pct (physical schedule slippage)
    merged["time_variance_pct"] = (merged["pct_time_elapsed"] - merged["physical_progress_pct"]) / 100.0

    # Milestone slippage rate
    merged["milestone_slippage_rate"] = merged["milestones_delayed"] / merged["num_milestones"].clip(lower=1)

    # Extract issue flags from text
    issue_flags_df = merged["reported_issues"].apply(extract_issue_flags).apply(pd.Series)
    for col in issue_flags_df.columns:
        merged[col] = issue_flags_df[col].astype(int)

    # Clean & fill missing non-critical numerical features
    merged["cost_variance_pct"] = merged["cost_variance_pct"].fillna(0.0)
    merged["time_variance_pct"] = merged["time_variance_pct"].fillna(0.0)

    features_parquet_path = os.path.join("data", "features.parquet")
    merged.to_parquet(features_parquet_path, index=False)

    print(f"Feature engineering complete! Saved {len(merged)} snapshot rows to '{features_parquet_path}'.")
    return merged


if __name__ == "__main__":
    generate_feature_dataset()
