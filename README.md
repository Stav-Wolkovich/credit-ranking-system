# דוח דירוג פנימי — Ranking App (React + Python)

Full-stack starter: a Python (FastAPI) backend serving the ranking-report
data, and a React (Vite) frontend rendering the main page shown in the
original mock — right-side collapsible sidebar, action bar, summary cards,
and the ranking table.

Only the **"דוח דירוג פנימי"** page is wired to real data for now. Every
other sidebar item renders a placeholder page — the shell is built so
adding a new page is: one backend route + one React page component + one
line in `PageContent`'s switch in `frontend/src/App.jsx`.

## Project layout

```
ranking-app/
├── backend/
│   ├── main.py            FastAPI app + in-memory "database"
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── vite.config.js      dev proxy: /api -> http://localhost:8000
    └── src/
        ├── main.jsx
        ├── App.jsx         shell: top bar, sidebar, page router
        ├── api.js          fetch wrapper for the backend
        ├── styles.css
        ├── components/
        │   ├── TopBar.jsx
        │   ├── Sidebar.jsx
        │   └── ui.jsx      Badge, StatCard, PageHeader, Placeholder
        └── pages/
            └── ReportPage.jsx
```

## Running it locally

### 1. Backend

Use a virtual environment — it keeps this project's dependencies isolated
from your system Python and from any other project on your machine, and
makes `requirements.txt` actually reproducible.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Deactivate later with `deactivate`. `.venv/` is already in `.gitignore` —
don't commit it.

Check it's alive: `curl http://localhost:8000/api/health` → `{"ok": true}`

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The dev server
proxies any `/api/...` request to the backend on port 8000, so no CORS
setup is needed while developing.

### Production build

```bash
cd frontend
npm run build       # outputs static files to frontend/dist
```

Serve `frontend/dist` with any static host (nginx, Vercel, S3+CloudFront,
or have FastAPI serve it directly with `StaticFiles`), and point it at
your deployed backend URL.

## Next steps (as this grows)

- **Real database**: replace the in-memory lists in `backend/main.py` with
  a real connection (Postgres via SQLAlchemy is a natural fit for FastAPI).
  The route handlers are already thin, so this is mostly a swap inside
  `compute_summary()` and the list comprehensions.
- **Excel import/export**: add an `openpyxl` or `pandas`-based endpoint,
  e.g. `POST /api/report/import` (upload) and `GET /api/report/export`
  (download `.xlsx`), and a button in `ReportPage.jsx` to trigger them.
- **Auth**: FastAPI has first-class support for OAuth2/JWT — worth adding
  before this touches real data.
- **More pages**: each additional sidebar item just needs its own
  `GET /api/<page>` route and a `<PageName>Page.jsx` file following the
  same pattern as `ReportPage.jsx`.
