<div align="center">

# TRACE

### Not confidence. Coverage.

**AI Decision Underwriting Engine**

<br/>

![Status](https://img.shields.io/badge/status-prototype-gold?style=for-the-badge)
![Python FastAPI](https://img.shields.io/badge/Python-FastAPI-111827?style=for-the-badge&logo=python&logoColor=white)
![Next.js TypeScript](https://img.shields.io/badge/Next.js-TypeScript-111827?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL pgvector](https://img.shields.io/badge/PostgreSQL-pgvector-111827?style=for-the-badge&logo=postgresql&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.x-111827?style=for-the-badge)

<br/>

[The Question](#the-question) &bull;
[Core Capabilities](#core-capabilities) &bull;
[Architecture](#architecture) &bull;
[Quick Start](#quick-start)

</div>

---

## The Question

Most analytics products ask:

> *"How confident are we in this prediction?"*

TRACE asks:

> **"What does it cost if we're wrong, and exactly when does our coverage end?"**

TRACE converts abstract business decisions into structured underwriting problems. Instead of producing a single recommendation or fabricated confidence score, TRACE mathematically evaluates downside exposure, prices the risk, defines explicit coverage limits, and binds the outcome to an immutable decision record.

The goal is not to manufacture certainty. The goal is to make **limits visible**.

---

## Core Capabilities

### 1. Decision Premium Pricing
Calculates a **Decision Premium**—the explicit financial cost of accepting the risk of the decision being wrong. This premium is derived mathematically from data-quality loads, verification failure loads, counter-evidence penalties, and probabilistic exposure mapping.

### 2. Downside Exposure & Scenarios
Runs seeded Monte Carlo simulations against historical baselines to project the distribution of outcomes, isolating the **P10 Tail Loss**, **Average Worst 10%**, and **Worst Plausible Case**. 

### 3. Coverage Lapse Tripwires
A recommendation is only valid until its underlying assumptions break. TRACE calculates explicit **Tripwires** (e.g., "Margin compression > 1.2%"). If crossed in the real world, the decision loses coverage.

### 4. Semantic Engine & Data Health
Automatically ingests raw data, audits it for anomalies, and maps it to a canonical business domain. Suspicious data doesn't just trigger an alert—it mathematically inflates the risk load on the final decision.

### 5. Deterministic Financial Truth
LLMs are powerful narrative engines, but they are not numerical authorities. In TRACE, **LLMs do not do math.** All financial exposure, simulations, and premium calculations execute in isolated, deterministic Python engines.

### 6. Counter-Decision Analysis (Red Teaming)
Actively builds the strongest possible case *against* the primary recommendation. If the counter-evidence outweighs the primary evidence, TRACE automatically downgrades the verdict to `REFER` or `DECLINE`.

### 7. Human Governance & Immutable Ledger
TRACE recommends and prices. **The human decides.** Human approval writes a cryptographically hashed Decision Record to the **Loss History Ledger** for future outcome tracking and rate card recalibration.

---

## Technology Stack

**Frontend:**
- Next.js (App Router), React, Tailwind CSS, TypeScript
- Recharts (Data visualization), Lucide (Iconography)

**Backend:**
- Python, FastAPI
- SQLAlchemy, PostgreSQL + `pgvector`
- Pydantic (Data validation)

**Intelligence:**
- Provider-agnostic LLM adapter (OpenAI, Anthropic, Gemini)

---

## Quick Start

### 1. Database
Requires PostgreSQL with the `pgvector` extension.
```bash
docker run -d --name trace-db -p 5432:5432 -e POSTGRES_PASSWORD=trace -e POSTGRES_USER=trace -e POSTGRES_DB=trace ankane/pgvector
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .env\Scriptsctivate
pip install -r requirements.txt
cp .env.example .env      # Add your database URL and API keys
python -m uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Architectural Principles

1. **Deterministic Truth:** Numerical outputs must come from executable logic, not LLM generations.
2. **Independent Verification:** Findings must survive independent recalculation.
3. **Explicit Uncertainty:** Missing or weak evidence must remain visible.
4. **Provenance:** Important numbers must be mathematically traceable to their source data.
5. **Human Control:** The system supports decisions; humans authorize them.
6. **Honest Failure:** The system prefers to `REFER` or `DECLINE` rather than fabricate certainty.

---

<div align="center">

### TRACE

*Not confidence. Coverage.*

</div>
