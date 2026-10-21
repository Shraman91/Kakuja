# Kakuja

Kakuja is a full-stack research discovery platform built around arXiv papers. It crawls and indexes academic papers, extracts useful metadata and textual signals, and provides a polished reader experience with semantic search and related-paper recommendations.

This project includes:
- a FastAPI backend for paper ingestion, indexing, and search
- a React + Vite frontend for browsing and reading papers
- PostgreSQL + pgvector for persistence and semantic similarity
- Docker support for both frontend and backend services

## Features

- Search and fetch papers from arXiv by ID or query
- Background job processing for paper ingestion and analysis
- Pagination and category filtering for the paper library
- Full-text search and metadata filtering
- Semantic similarity via pgvector
- Related paper recommendations
- Interactive paper reader experience
- Dockerized backend and frontend deployment

## Architecture

Kakuja is split into two main parts:

- backend/
  - FastAPI application
  - database models and repositories
  - arXiv crawler and analysis logic
  - API endpoints for jobs, health, and papers

- frontend/
  - React application
  - Vite build tooling
  - paper library UI
  - paper detail/reader pages

## Tech Stack

Backend:
- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL
- pgvector
- Alembic
- PyMuPDF
- sentence-transformers
- httpx
- feedparser
- pytest

Frontend:
- React
- TypeScript
- Vite
- Lucide React

## Repository Structure

```text
Kakuja/
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── analysis/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   └── router.py
│   │   ├── core/
│   │   ├── crawler/
│   │   ├── db/
│   │   ├── schemas/
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── .env.example (if present in your setup)
├── frontend/
│   ├── public/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── README.md
├── .gitignore
└── README.md
