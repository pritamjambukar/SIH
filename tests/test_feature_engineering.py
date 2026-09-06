"""
===============================================================================
Unit Tests: Feature Engineering & Data Leakage Protection
===============================================================================
"""

import pytest
import pandas as pd
import numpy as np
from feature_engineering import compute_agency_track_record, compute_sector_avg_overrun, extract_issue_flags


def test_compute_agency_track_record_no_leakage():
    """
    Verifies that compute_agency_track_record uses Leave-One-Out (LOO),
    ensuring a project's own overrun is NEVER included in its agency track record score.
    """
    dummy_data = pd.DataFrame([
        {"project_id": "P1", "implementing_agency": "NHAI", "original_cost_cr": 100.0, "revised_cost_cr": 150.0}, # 50% overrun
        {"project_id": "P2", "implementing_agency": "NHAI", "original_cost_cr": 100.0, "revised_cost_cr": 110.0}, # 10% overrun
        {"project_id": "P3", "implementing_agency": "NHAI", "original_cost_cr": 100.0, "revised_cost_cr": 100.0}, # 0% overrun
    ])

    loo_scores = compute_agency_track_record(dummy_data)

    # For P1 (50% overrun), average of P2 (10%) and P3 (0%) should be 5% (0.05)
    assert pytest.approx(loo_scores["P1"], abs=1e-4) == 0.05

    # For P2 (10% overrun), average of P1 (50%) and P3 (0%) should be 25% (0.25)
    assert pytest.approx(loo_scores["P2"], abs=1e-4) == 0.25

    # For P3 (0% overrun), average of P1 (50%) and P2 (10%) should be 30% (0.30)
    assert pytest.approx(loo_scores["P3"], abs=1e-4) == 0.30


def test_compute_sector_avg_overrun_no_leakage():
    """
    Verifies that compute_sector_avg_overrun uses Leave-One-Out (LOO) for sector statistics.
    """
    dummy_data = pd.DataFrame([
        {"project_id": "P1", "sector": "Roads & Highways", "original_cost_cr": 100.0, "revised_cost_cr": 140.0}, # 40%
        {"project_id": "P2", "sector": "Roads & Highways", "original_cost_cr": 100.0, "revised_cost_cr": 120.0}, # 20%
    ])

    loo_scores = compute_sector_avg_overrun(dummy_data)

    # For P1, LOO score must equal P2's overrun (20% -> 0.20)
    assert pytest.approx(loo_scores["P1"], abs=1e-4) == 0.20
    # For P2, LOO score must equal P1's overrun (40% -> 0.40)
    assert pytest.approx(loo_scores["P2"], abs=1e-4) == 0.40


def test_extract_issue_flags():
    """
    Verifies keyword extraction from issue text.
    """
    text = "Severe land acquisition delay and contractor mobilization issues due to monsoon disruption"
    flags = extract_issue_flags(text)

    assert flags["land_acquisition_delay"] == True
    assert flags["contractor_delay"] == True
    assert flags["weather_disruption"] == True
    assert flags["fund_delay"] == False
    assert flags["clearance_delay"] == False
