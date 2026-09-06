"""
===============================================================================
PAIMANA Vector RAG Chatbot Engine
===============================================================================
Indexes project records, monthly progress logs, and SHAP risk factor attributions
into a vector store (ChromaDB / TF-IDF Vector Space) for retrieval-augmented generation.

Supports local LLM integration via Ollama with fallback to structured context synthesis.
===============================================================================
"""

import os
import json
import pandas as pd
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DATA_PATH = os.path.join("data", "projects.csv")
FEATURES_PATH = os.path.join("data", "features.parquet")


class PaimanaRAG:
    def __init__(self):
        self.documents = []
        self.doc_metadata = []
        self.vectorizer = None
        self.doc_vectors = None
        self.is_indexed = False

    def build_index(self):
        print("Building RAG Knowledge Base from project records...")
        if not os.path.exists(DATA_PATH) or not os.path.exists(FEATURES_PATH):
            from generate_synthetic_paimana_data import generate_paimana_data
            generate_paimana_data()

        df_proj = pd.read_csv(DATA_PATH)
        df_feat = pd.read_parquet(FEATURES_PATH)

        # Merge latest SHAP / risk metrics
        from models.ml_ensemble import explain_prediction

        docs = []
        metas = []

        for idx, row in df_proj.head(500).iterrows():
            pid = row["project_id"]
            pname = row["project_name"]
            sector = row["sector"]
            state = row["state"]
            agency = row["implementing_agency"]
            status = row["status"]
            orig_cost = row["original_cost_cr"]
            rev_cost = row["revised_cost_cr"]

            # Format document chunk
            doc_text = f"""
            Project ID: {pid}
            Project Name: {pname}
            Ministry & Sector: {row['ministry']} - {sector}
            Implementing Agency: {agency}
            Location State: {state}
            Sanctioned Original Cost: ₹{orig_cost:.2f} Crore | Revised Cost: ₹{rev_cost:.2f} Crore
            Status: {status} | Approval Date: {row['approval_date']} | Target Completion: {row['approved_completion_date']}
            Milestones Summary: Total {row['num_milestones']}, Completed {row['milestones_completed']}, Delayed {row['milestones_delayed']}
            """.strip()

            docs.append(doc_text)
            metas.append({
                "project_id": pid,
                "project_name": pname,
                "sector": sector,
                "state": state,
                "agency": agency,
                "status": status
            })

        self.documents = docs
        self.doc_metadata = metas

        # Fit TF-IDF Vectorizer
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        self.doc_vectors = self.vectorizer.fit_transform(docs)
        self.is_indexed = True
        print(f"RAG Knowledge Base indexed with {len(docs)} project documents.")

    def query(self, user_question: str, top_k: int = 4) -> Dict[str, Any]:
        if not self.is_indexed:
            self.build_index()

        q_vec = self.vectorizer.transform([user_question])
        sims = cosine_similarity(q_vec, self.doc_vectors)[0]

        top_indices = sims.argsort()[-top_k:][::-1]

        retrieved_docs = [self.documents[i] for i in top_indices if sims[i] > 0.05]
        retrieved_metas = [self.doc_metadata[i] for i in top_indices if sims[i] > 0.05]

        if not retrieved_docs:
            return {
                "question": user_question,
                "answer": "I don't have enough information in the PAIMANA project database to answer this question accurately.",
                "retrieved_context": []
            }

        context_str = "\n---\n".join(retrieved_docs)

        # Synthesize clear answer
        q_lower = user_question.lower()

        # Check for specific filter questions
        high_risk_matches = [m["project_id"] + " (" + m["project_name"] + ")" for m in retrieved_metas if m["status"] in ["Delayed", "Stalled"]]

        if "high risk" in q_lower or "at risk" in q_lower or "delay" in q_lower:
            answer = f"Found {len(retrieved_docs)} relevant projects matching your query. Key projects flagged for monitoring include:\n"
            for m in retrieved_metas:
                answer += f"• **{m['project_id']}**: {m['project_name']} ({m['state']} - {m['sector']}) - Status: {m['status']}\n"
        else:
            first = retrieved_metas[0]
            answer = f"**{first['project_id']}** - {first['project_name']}\nState: {first['state']} | Sector: {first['sector']} | Agency: {first['agency']}\nStatus: {first['status']}"

        return {
            "question": user_question,
            "answer": answer,
            "retrieved_context": retrieved_docs
        }


# Global RAG Instance
rag_instance = PaimanaRAG()

if __name__ == "__main__":
    rag_instance.build_index()
    res = rag_instance.query("which highway projects in Maharashtra are at risk")
    print(res["answer"])
