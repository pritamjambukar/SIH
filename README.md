# PAIMANA Predictive Analytics System

> **AI-Powered Predictive Infrastructure Monitoring Layer for MoSPI (Ministry of Statistics and Programme Implementation)**  
> Developed for Smart India Hackathon (SIH) Solution Track.

---

## Executive Summary

PAIMANA tracks 1,981+ infrastructure projects (₹150 crore+) across 22 sectors in India. The legacy system is **descriptive** — it reports cost and schedule overruns after they happen.

This system introduces a **predictive early-warning intelligence layer** built on top of PAIMANA Common Upload Form (CUF) monthly progress logs to:
1. **Predict Cost & Time Overruns** before they occur using XGBoost & LightGBM machine learning ensembles.
2. **Explain Risk Drivers (SHAP)** in plain English (e.g., land acquisition delays, contractor mobilization bottlenecks).
3. **Benchmark Projects** against sector and agency peer baselines.
4. **Dispatch Automated Alerts** to officers when projects transition into high-risk ('Red') status.
5. **Answer Natural Language Queries (RAG Chatbot)** using vector search over project metadata and monthly logs.
6. **Statistically Prove CUF Sufficiency**: Demonstrates a **+10.52% ROC-AUC improvement** when augmenting raw CUF fields with early bottleneck issue flags and leave-one-out agency track records.

---

## System Architecture

```
  ┌─────────────────────────────────────────────────────────────┐
  │              React 18 + Tailwind CSS Dashboard              │
  │   (Overview Cards, Leaflet GIS Map, SHAP Breakdown, Chat)   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ REST API (JSON)
  ┌──────────────────────────────▼──────────────────────────────┐
  │                    FastAPI Backend (Python)                 │
  │   (/projects, /dashboard, /explain, /benchmark, /chat)      │
  └───────┬──────────────────────┬──────────────────────┬───────┘
          │                      │                      │
  ┌───────▼────────┐     ┌───────▼────────┐     ┌───────▼────────┐
  │ Risk Engine    │     │ ML & SHAP      │     │  Vector RAG    │
  │ (Composite)    │     │ (XGBoost/SHAP) │     │  (Knowledge)   │
  └───────┬────────┘     └───────┬────────┘     └───────┬────────┘
          │                      │                      │
  ┌───────┴──────────────────────┴──────────────────────▼───────┐
  │                 PostgreSQL + PostGIS Database               │
  │    (projects, monthly_progress, risk_scores, alerts)        │
  └─────────────────────────────────────────────────────────────┘
```

---

## Machine Learning Results & Ablation Study

| Model | Cost Overrun ROC-AUC | Time Overrun ROC-AUC | Accuracy | Verdict |
|---|---|---|---|---|
| **Baseline (Logistic Regression)** | 0.8440 | 0.8722 | 81.69% | Linear baseline |
| **LightGBM Ensemble** | 0.9737 | 0.9193 | 92.57% | Strong tree ensemble |
| **XGBoost Ensemble (Selected)** | **0.9778** | **0.9194** | **93.95%** | **Best overall accuracy** |

### Feature Ablation Study (CUF Sufficiency Proof)
- **Raw CUF Fields Only** (Cost, Expenditure, Dates, Milestones): ROC-AUC = **0.8726**
- **CUF Fields + Engineered Signals** (Early Issue Flags, LOO Agency Track Record, Sector Risk): ROC-AUC = **0.9778**
- **Delta Improvement**: **+10.52% ROC-AUC boost** — proving that adding text keyword extraction from monthly progress notes dramatically improves early warning capability.

---

## Quickstart & Local Setup

### 1. Prerequisites
- Python 3.10+ or Python 3.14
- Node.js 18+ (for frontend)
- Docker & Docker Compose (optional for full containerized stack)

### 2. Python Environment & Pipeline Execution
```bash
# Create virtual environment & install dependencies
uv venv .venv
.venv\Scripts\activate
uv pip install -r requirements.txt # or uv pip install pandas numpy pyarrow scikit-learn xgboost lightgbm shap statsmodels fastapi uvicorn sqlalchemy psycopg2-binary pydantic pytest httpx

# 1. Generate 2,000 synthetic projects and 58,000+ monthly progress logs
python generate_synthetic_paimana_data.py

# 2. Seed database (SQLite local / PostgreSQL PostGIS)
python load_seed_data.py

# 3. Execute feature engineering pipeline
python feature_engineering.py

# 4. Train ML models & compute SHAP values
python models/ml_ensemble.py

# 5. Run monthly batch scoring engine
python run_monthly_scoring.py

# 6. Launch FastAPI backend
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Dashboard Execution
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 3-Minute Hackathon Judging Demo Script

1. **Portfolio Overview & GIS Map**:
   - Open dashboard. Show the 5 top summary cards (2,000 projects, 1,164 Green, 589 Amber, 247 Red, ₹247k Cr total cost at risk).
   - Point out the **Interactive Leaflet GIS Map** showing color-coded risk markers across India. Click a Red marker to open popup.

2. **Project Directory & Filters**:
   - Click "Project Directory" tab. Demonstrate filtering by Sector (e.g. *Roads & Highways*) and State (e.g. *Maharashtra*). Show live sorting by composite risk score.

3. **Project Detail & Plain-English SHAP Explainability**:
   - Click any Red project (e.g., `PRJ_0001`).
   - Highlight the **SHAP Risk Factor Attribution Panel**: Explain how the model attributes risk percentage breakdown (e.g., 50.8% agency track record, 24.9% physical schedule lag).
   - Show the **Sector Benchmark Peer Ranking** (e.g. 85th percentile cost overrun risk).
   - Review the **Expenditure vs Physical Progress S-Curve Trajectory**.

4. **Conversational AI RAG Assistant**:
   - Click "AI Chatbot" button in top right glass header to open drawer.
   - Type query: `"which highway projects in Maharashtra are at risk"`
   - Show vector retrieval returning relevant projects with exact status and risk drivers.

5. **Automated Alert Dispatch**:
   - Click "Dispatch Red Alerts" button in header to simulate SMTP email notification dispatch to MoSPI officers.
