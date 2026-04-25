# SiraguWings Admin Portal

Multi-tenant coaching center management platform.  
**Stack:** FastAPI + PostgreSQL (Neon) + Firebase Auth · React 18 + MUI + Vite

---

## Project Structure

```
SiraguWings/
├── backend/        # FastAPI backend (Python 3.9+)
└── admin-web/      # React admin UI (Vite + MUI)
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Python | 3.9+ |
| Node.js | 18+ |
| npm | 9+ |

---

## Backend Setup

```bash
cd backend

# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create environment file
cp .env.example .env              # then fill in your values
```

### Backend `.env` keys

```env
DATABASE_URL=postgresql://...          # Neon PostgreSQL connection string
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Run database migrations

```bash
python run_migrations.py
```

### Start backend server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API runs at: **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

---

## Frontend Setup

```bash
cd admin-web

# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env              # already committed with defaults
```

### Frontend `.env` keys

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Start frontend dev server

```bash
npm run dev
```

App runs at: **http://localhost:5173**

---

## Run Both Together (quick start)

Open two terminal tabs:

**Tab 1 — Backend**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Tab 2 — Frontend**
```bash
cd admin-web
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Build for Production

```bash
# Frontend production build
cd admin-web
npm run build          # output → admin-web/dist/

# Backend production server (with gunicorn)
cd backend
source venv/bin/activate
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## Database Migrations

Migration files live in `backend/migrations/` and run in order:

```bash
cd backend
source venv/bin/activate
python run_migrations.py
```

| File | Description |
|---|---|
| `001_add_missing_tables.sql` | Core tables |
| `002_master_data.sql` | Master data / dropdowns |
| `003_center_enhancements.sql` | Center enhancements |
| `004_multicenter_and_master.sql` | Multi-center owner model |
| `005_subscription.sql` | Subscription plans |
| `006_billing_email_config.sql` | Billing email config |
| `007_drop_description_len_constraint.sql` | Remove description length limit |
