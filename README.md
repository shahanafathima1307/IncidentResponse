# OnCall Memory

An incident response tool for on-call engineers that institutionalizes remediation memory.

## Architecture

- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router
- **Design System**: Utilitarian, high-density operations tool (inspired by Linear, Sentry, PagerDuty). Restricted palette (#FAF9F7 warm background, #1C1B19 text, #2F4B7C accent, desaturated semantic tags, IBM Plex typography).
- **Dark Mode**: Automatic via `prefers-color-scheme`, plus manual toggle in the navigation bar.

## Project Structure

```
src/
├── api.ts              # Unified API client (reads VITE_API_BASE_URL & VITE_USE_MOCKS)
├── types.ts            # Domain contracts (Incidents, Recommendations, Outcomes, Docs)
├── mockData.ts         # Realistic fixtures for 8 incidents across payments platform
├── index.css           # Design tokens, color system, font specifications
├── App.tsx             # Route definitions (/ and /incidents/:id)
├── components/
│   ├── Header.tsx      # Top bar with live incidents in memory count & theme toggle
│   ├── Badge.tsx       # Severity and outcome badges (desaturated borders/tags)
│   ├── LogViewer.tsx   # Monospace log inspector with line numbers and error highlighting
│   ├── DocDrawer.tsx   # Runbook viewer side drawer with copy actions
│   └── OutcomeBar.tsx  # Sticky outcome rating bar with keyboard shortcuts (1/2/3)
├── pages/
│   ├── QueuePage.tsx   # Dense incident table with filters, search, and memory matches
│   └── WorkspacePage.tsx # 3-column incident workspace with live memory toggle
└── utils/
    └── time.ts         # Tabular relative time formatting
```

## Running the Application

```bash
npm install
npm run dev
```

The application starts on `http://localhost:3000`.

## Switching From Mocks to a Real Backend

By default, `VITE_USE_MOCKS` is enabled so the tool runs completely self-contained with no backend required.

To connect to a live backend service:

1. Create or edit `.env.local`:
   ```bash
   VITE_USE_MOCKS=false
   VITE_API_BASE_URL=https://api.your-internal-domain.com
   ```

2. Ensure your backend implements the API contract specified in `src/api.ts`:
   - `GET /api/incidents`
   - `GET /api/incidents/:id`
   - `POST /api/incidents/:id/outcome`
   - `GET /api/memory/stats`

3. Restart the Vite development server:
   ```bash
   npm run dev
   ```
