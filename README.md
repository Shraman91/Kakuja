# Kakuja

**Kakuja** is a full-stack research discovery platform built around arXiv papers. It crawls and indexes academic papers, extracts metadata and textual signals, and offers a polished reader experience with semantic search and related-paper recommendations.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Running with Docker](#running-with-docker)
- [Running Tests](#running-tests)
- [Database Migrations](#database-migrations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

## Features

- **arXiv ingestion**: fetch papers by arXiv ID or by search query
- **Background job processing**: ingestion and analysis run as tracked jobs
- **Full-text search** with metadata and category filtering
- **Semantic search** powered by sentence-transformers embeddings and pgvector
- **Related paper recommendations** based on vector similarity
- **Library browsing** with pagination and category filters
- **Interactive paper reader** with extracted text and metadata
- **Dockerized** backend and frontend for easy deployment

## How It Works

### Paper ingestion and analysis pipeline

When a paper (or a batch of papers) is requested, the API creates a job and hands the heavy work to a background task, so the client never waits on crawling, PDF parsing, or embedding.

```mermaid
flowchart TD
    A([User / Frontend]) -->|POST /jobs: arXiv ID or query| B[FastAPI<br/>Jobs Endpoint]
    B --> C[(PostgreSQL<br/>Job record: PENDING)]
    B -->|Returns job ID| A
    B -.->|Schedules| D[Background Worker]

    subgraph PIPE [Ingestion and Analysis Pipeline]
        direction TB
        D --> E[Update job: RUNNING]
        E --> F[arXiv Crawler<br/>httpx + feedparser]
        F -->|Title, authors, abstract,<br/>categories, dates| G{Paper already<br/>indexed?}
        G -->|Yes| K
        G -->|No| H[Download PDF]
        H --> I[PyMuPDF<br/>Extract full text]
        I --> J[Analysis Module<br/>Clean text, extract signals]
        J --> L[sentence-transformers<br/>Generate embedding]
    end

    L --> M[(PostgreSQL + pgvector<br/>Save paper, text, embedding)]
    M --> K[Update job: COMPLETED]
    F -.->|On error| X[Update job: FAILED<br/>store error message]
    H -.->|On error| X
    I -.->|On error| X

    A -->|Poll GET /jobs/id| C
    A -->|Browse, search, read| N[Papers Endpoint]
    N --> M
```

**Pipeline stages**

| Stage | What happens | Key tools |
|-------|--------------|-----------|
| 1. Job creation | API validates the request and stores a job with `PENDING` status | FastAPI, SQLAlchemy |
| 2. Crawl | Metadata is fetched from the arXiv API and parsed | httpx, feedparser |
| 3. Dedup check | Already-indexed papers skip re-processing | PostgreSQL |
| 4. PDF extraction | PDF is downloaded and its text extracted | PyMuPDF |
| 5. Analysis | Text is cleaned and textual signals are extracted | `app/analysis` |
| 6. Embedding | A dense vector is generated for semantic similarity | sentence-transformers |
| 7. Persist | Paper, text, and vector are stored | PostgreSQL + pgvector |
| 8. Completion | Job is marked `COMPLETED` (or `FAILED` with an error) | Jobs repository |

### Search and recommendation flow

```mermaid
flowchart LR
    Q[Search query] --> E[Embed query<br/>sentence-transformers]
    E --> V[pgvector<br/>cosine similarity search]
    Q --> T[Full-text search<br/>+ category filters]
    V --> R[Ranked results]
    T --> R
    R --> UI[Paper library UI]
    P[Open a paper] --> S[Nearest neighbours<br/>of its embedding]
    S --> REL[Related papers]
```

## Architecture

Kakuja is split into two main parts:

**`backend/`**
- FastAPI application and routing
- Database models and repositories
- arXiv crawler and analysis logic
- API endpoints for jobs, health, and papers

**`frontend/`**
- React application built with Vite
- Paper library UI with search, filters, and pagination
- Paper detail and reader pages

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic, httpx, feedparser, PyMuPDF, sentence-transformers, pytest |
| Database | PostgreSQL with pgvector |
| Frontend | React, TypeScript, Vite, Lucide React |
| DevOps | Docker (separate images for frontend and backend) |

## Repository Structure

```text
Kakuja/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── analysis/         # Text analysis and embedding logic
│   │   ├── api/
│   │   │   ├── endpoints/    # jobs, health, papers
│   │   │   └── router.py
│   │   ├── core/             # Config and settings
│   │   ├── crawler/          # arXiv crawler
│   │   ├── db/               # Models and repositories
│   │   ├── schemas/          # Pydantic schemas
│   │   └── main.py           # FastAPI entrypoint
│   ├── tests/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 15+ with the [pgvector](https://github.com/pgvector/pgvector) extension
- Docker (optional)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/Kakuja.git
cd Kakuja
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # then edit values (see below)
```

Example `.env`:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/kakuja
```

Enable pgvector and run migrations:

```bash
psql -d kakuja -c "CREATE EXTENSION IF NOT EXISTS vector;"
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Running with Docker

Build and run each service from its folder:

```bash
# Backend
cd backend
docker build -t kakuja-backend .
docker run -p 8000:8000 --env-file .env kakuja-backend

# Frontend
cd ../frontend
docker build -t kakuja-frontend .
docker run -p 5173:80 kakuja-frontend
```

## Running Tests

```bash
cd backend
pytest
```

## Database Migrations

```bash
# Create a new migration after changing models
alembic revision --autogenerate -m "describe change"

# Apply migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1
```

## Roadmap

- [ ] Scheduled/periodic crawling of new arXiv papers
- [ ] User accounts, saved papers, and reading lists
- [ ] Paper summaries and key-insight extraction
- [ ] Citation graph visualization
- [ ] `docker-compose.yml` for one-command full-stack startup

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/my-feature`
2. Commit your changes: `git commit -m "Add my feature"`
3. Push the branch: `git push origin feature/my-feature`
4. Open a pull request

## Acknowledgements

- [arXiv](https://arxiv.org) for open access to research papers
- [pgvector](https://github.com/pgvector/pgvector) for vector similarity in PostgreSQL
- [sentence-transformers](https://www.sbert.net) for embeddings
