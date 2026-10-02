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

[Overview](#overview) &bull;
[Core Capabilities](#core-capabilities) &bull;
[Architecture](#architecture) &bull;
[Quick Start](#quick-start)

</div>

---

## The Question

Most decision systems ask: *"What should we do?"*

TRACE asks: **"What does it cost if we're wrong, and exactly when does our coverage end?"**

TRACE converts abstract business decisions into structured underwriting problems. Instead of producing a single recommendation or fabricated confidence score, TRACE mathematically evaluates downside exposure, prices the risk, defines explicit coverage limits, and binds the outcome to an immutable decision record.

The goal is not to manufacture certainty. The goal is to make **limits visible**.

```mermaid
flowchart TD
    A["<b>TRACE</b><br/>NOT CONFIDENCE. COVERAGE."]:::brand --> B[Business Data]
    B --> C[Data Health]
    C --> D[Semantic Confirmation]
    D --> E[Decision Objective]
    E --> F[Investigation Engine]

    F --> G[Analytics]
    F --> H[Verification]
    F --> I[Reasoning]

    G --> J[Scenario Modeling]
    H --> J
    I --> J

    J --> K[Counter-Decision Review]
    K --> L[Underwriting Engine]

    L --> M[Premium]
    L --> N[Exposure]
    L --> O[Coverage Lapse]

    M --> P[Decision Brief]
    N --> P
    O --> P

    P --> Q[Decision Sandbox]
    Q --> R[Human Approval]
    R --> S[Decision Record]
    S --> T[Loss History Ledger]
    T --> U[Recalibration]

    classDef brand fill:#111827,stroke:#d4af37,stroke-width:2px,color:#ffffff;
```

---

## Core Capabilities

### 1. Business Data Intelligence
Automatically ingests raw data, audits it for anomalies, and maps it to a canonical business domain.
```mermaid
flowchart TD
    A[Data] --> B[Trust]
    B --> C[Interpret]
    C --> D[Investigate]
    D --> E[Verify]
    E --> F[Challenge]
    F --> G[Simulate]
    G --> H[Price the downside]
    H --> I[Identify coverage limits]
    I --> J[Explain]
    J --> K[Human approval]
    K --> L[Record]
    L --> M[Observe outcome]
    M --> N[Recalibrate]
```

### 2. Semantic Layer
Resolves unstructured data mapping into structured, verifiable metrics.
```mermaid
flowchart TD
    A[Physical Column] --> B[Semantic Concept]
    B --> C[Business Role]
    C --> D[Metric Definition]
    D --> E[Decision Calculation]
```

### 3. Decision Objectives
Defines the financial and operational goals of the decision.
```mermaid
flowchart TD
    A["transactions.net_sales"] --> B[Net Sales]
    B --> C[Primary Financial Metric]
    C --> D["Revenue / Margin Analysis"]
```

### 4. Investigation Engine
Orchestrates the lifecycle from raw data to underwritten decision.
```mermaid
flowchart TD
    I[Investigation] --> D[Data]
    I --> A[Analytics]
    I --> V[Verification]

    D --> R[Reasoning]
    A --> R
    V --> R

    R --> S[Scenarios]
    S --> C[Counter-Decision]
    C --> X[Decision]
```

### 5. Deterministic Numerical Truth
LLMs are powerful narrative engines, but they are not numerical authorities. In TRACE, **LLMs do not do math.** All financial calculations execute in isolated Python engines.
```mermaid
flowchart LR
    F[Important Finding] --> M1[Method A]
    F --> M2[Method B]
    M1 --> C{Results agree<br/>within tolerance?}
    M2 --> C
    C -- Yes --> OK[Verified]
    C -- No --> D[Discrepancy]
    D --> U[Affects underwriting outcome]
```

### 6. Verification Engine
Ensures that all metrics and models are verifiable against ground truth data.
```mermaid
flowchart TD
    R[Recommendation] --> C[Counter-Decision]
    C --> A[Supporting evidence]
    C --> B[Adverse evidence]
    C --> D[Contradictions]
    C --> E[Unverified assumptions]
    C --> F[Coverage limitations]
```

### 7. Counter-Decision Underwriter
Actively builds the strongest possible case *against* the primary recommendation.
```mermaid
flowchart TD
    RL[Risk Load] --> A[Data-Quality Load]
    RL --> B[Verification Load]
    RL --> C[Contradiction Load]
    RL --> D[Model-Uncertainty Load]
```

### 8. Scenario Engine
Runs seeded Monte Carlo simulations against historical baselines to project the distribution of outcomes.
```mermaid
flowchart TD
    A[Statement] --> B[Metric]
    B --> C[Calculation]
    C --> D[Verification]
    D --> E[Source Records]
    E --> F[Assumptions]
    F --> G[Data Health]
    G --> H[Contradictions]
    H --> I[Retrieved Documents]
```

### 9. Decision Premium
Calculates the explicit financial cost of accepting the risk of the decision being wrong.
```mermaid
flowchart TD
    A[Baseline] --> B[User Assumption]
    B --> C[Deterministic Re-Quote]
    C --> D[Premium]
    C --> E[Exposure]
    C --> F[Lapse]
    D --> G[Verdict]
    E --> G
    F --> G
```

### 10. Exposure Report
Isolates the **P10 Tail Loss**, **Average Worst 10%**, and **Worst Plausible Case**.
```mermaid
flowchart TD
    A[Prediction] --> B[Human Action]
    B --> C[Actual Outcome]
    C --> D[Variance]
    D --> E[Lapse Events]
    E --> F["Claim / Outcome Flags"]
```

### 11. Coverage Lapse Conditions
A recommendation is only valid until its underlying assumptions break. TRACE calculates explicit **Tripwires**.
```mermaid
flowchart TD
    A[Underwrite] --> B[Approve]
    B --> C[Observe]
    C --> D[Record Outcome]
    D --> E[Compare Prediction]
    E --> F[Measure Variance]
    F --> G[Recalibrate]
    G --> A
```

### 12. Verdict Engine
Synthesizes all findings into a final, defensible verdict.
```mermaid
flowchart TD
    T[Test Scenario] --> P[Production Pipeline]
    T --> R[Independent Reference Model]
    P --> C[Comparison]
    R --> C
    C --> E[Evaluation]
```

### 13. Evidence Chain & Decision Brief
The human reads a clear, concise brief. The machine maintains a cryptographically verifiable evidence chain.
```mermaid
flowchart TB
    subgraph UI["TRACE UI — Next.js · TypeScript · App Router"]
        U1["Overview · Decisions · Data · Evidence · Ledger<br/>Rate Card · Evaluation · Sandbox"]
    end

    subgraph API["FastAPI API"]
        A1["Decision APIs"]
        A2["Data APIs"]
        A3["Investigation APIs"]
        A4["Underwriting APIs"]
        A5["Evidence APIs"]
        A6["Approval APIs"]
        A7["Ledger APIs"]
        A8["Evaluation APIs"]
    end

    subgraph DOM["Domain Services"]
        D1["Data Health"]
        D2["Semantic Layer"]
        D3["Investigation"]
        D4["Verification"]
        D5["Scenario Engine"]
        D6["Counter-Decision"]
        D7["Underwriting"]
        D8["Evidence"]
        D9["Approval"]
        D10["Ledger"]
        D11["Evaluation"]
        D12["RAG"]
    end

    subgraph INFRA["Infrastructure"]
        I1[("PostgreSQL<br/>+ pgvector")]
        I2["Deterministic<br/>Analytics"]
        I3["LLM Provider<br/>Adapter"]
    end

    UI -- "REST / JSON" --> API
    API --> DOM
    DOM --> I1
    DOM --> I2
    DOM --> I3
```

### 14. Decision Sandbox
Allows humans to stress-test the assumptions and immediately see the updated exposure and premium.
```mermaid
flowchart TD
    S1["01 · Upload Business Data"] --> S2["02 · Data Health Check"]
    S2 --> S3["03 · Semantic Confirmation"]
    S3 --> S4["04 · State a Decision"]
    S4 --> S5["05 · Investigation Plan"]
    S5 --> S6["06 · Investigation"]
    S6 --> S7["07 · Verification"]
    S7 --> S8["08 · Counter-Decision"]
    S8 --> S9["09 · Underwriting"]
    S9 --> S10["10 · Decision Brief"]
    S10 --> S11["11 · Sandbox"]
    S11 --> S12["12 · Human Approval"]
    S12 --> S13["13 · Decision Record"]
    S13 --> S14["14 · Loss History"]
    S14 --> S15["15 · Recalibration"]
```

### 15. Human Approval & Decision Records
TRACE recommends and prices. **The human decides.** Human approval writes a hashed Decision Record to the ledger.
```mermaid
flowchart LR
    A[Same Data] --> R
    B[Same Policy] --> R
    C[Same Seed] --> R
    D[Same Code] --> R
    R(["Reproducible Result"])
```

### 16. Reproducibility & Determinism
Seeded simulations and versioned logic make results completely reproducible.
```mermaid
flowchart TD
    A[Source Data] --> B[Dataset]
    B --> C[Semantic Mapping]
    C --> D[Transformation]
    D --> E[Analytics]
    E --> F[Verification]
    F --> G[Scenarios]
    G --> H[Underwriting]
    H --> I[Decision Brief]
    I --> J[Decision Record]
```

### 17. Data & Decision Provenance
Important numbers are traced mathematically through the system.
```mermaid
flowchart LR
    A[Inspect] --> B[Understand]
    B --> C[Implement]
    C --> D[Run Tests]
    D --> E[Run Type Checks]
    E --> F[Build]
    F --> G[Verify Database]
    G --> H[Run End-to-End Flow]
    H --> I[Review Provenance]
    I --> J[Commit]
```

---

## Architectural Principles

1. **Deterministic Truth:** Numerical outputs must come from executable logic, not LLM generations.
2. **Independent Verification:** Findings must survive independent recalculation.
3. **Explicit Uncertainty:** Missing or weak evidence must remain visible.
4. **Provenance:** Important numbers must be mathematically traceable to their source data.
5. **Human Control:** The system supports decisions; humans authorize them.
6. **Honest Failure:** The system prefers to `REFER` or `DECLINE` rather than fabricate certainty.

### Development Workflow
```mermaid
flowchart LR
    A[Frontend] --> B[API Contract]
    B --> C[Service]
    C --> D[Domain Logic]
    D --> E[Persistence]
```

### System Architecture
```mermaid
flowchart TD
    A[Data] --> B[Model]
    B --> C[Decision]
```

### The TRACE Mental Model
```mermaid
flowchart TD
    A[Data] --> B[Health]
    B --> C[Semantic Layer]
    C --> D[Decision]

    D --> E[Analytics]
    D --> F[Verification]
    E --> G[Scenario]
    F --> G

    G --> H[Counter-Decision]
    H --> I[Underwriting]

    I --> J[Premium]
    I --> K[Exposure]
    I --> L[Lapse]

    J --> M[Brief]
    K --> M
    L --> M

    M --> N[Sandbox]
    N --> O[Human Approval]
    O --> P[Record]
    P --> Q[Ledger]
    Q --> R[Recalibrate]
```

---

## Technology Stack

**Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript, Recharts
**Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL + `pgvector`, Pydantic
**Intelligence:** Provider-agnostic LLM adapter

---

## Quick Start

### 1. Database
Requires PostgreSQL with `pgvector`.
```bash
docker run -d --name trace-db -p 5432:5432 -e POSTGRES_PASSWORD=trace -e POSTGRES_USER=trace -e POSTGRES_DB=trace ankane/pgvector
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

<div align="center">

### TRACE
*Not confidence. Coverage.*

</div>
