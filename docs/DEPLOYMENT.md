# Optional advanced local setup

The default demo uses only the frontend. This guide is for studying the inherited Go/MongoDB/Redis mode. No public deployment is included or claimed by this learning edition.

## Full stack in Docker

With Docker Desktop running, use the repository root:

```bash
docker compose up --build
```

Open `http://localhost`. Compose starts MongoDB as a single-node replica set, Redis, the Go API, and nginx serving the frontend. The frontend Dockerfile builds live mode explicitly. Compose volumes retain local data after restart.

```bash
curl --fail http://localhost/api/livez
curl --fail http://localhost/api/readyz
docker compose logs -f backend
```

To work on the frontend separately:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Then in `frontend`:

```bash
VITE_PULSEPOLL_MODE=live VITE_PROXY_TARGET=http://localhost:8082 npm run dev
```

The override exposes MongoDB at `27019`, Redis at `6390`, and Go at `8082`. The native frontend opens at `5173`.

## Advanced verification

Demo tests do not exercise this backend. Before presenting its guarantees, run its unit/race checks and full-stack browser/integration tests against Compose. Integration tests create local fixture accounts and polls.

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://localhost npm run test:e2e
```

The Go checks require the version declared in `backend/go.mod`:

```bash
cd backend
go test -race ./...
go test -tags=integration ./tests -count=1 -v
```

See `docs/ARCHITECTURE.md` for the durable vote/outbox design. Old `docs/evidence/` files describe inherited experiments, not new measurements of this learning edition.

## Deployment boundary

Cloud configuration files are reference material and do not establish that an instance is deployed. Before any future deployment, review provider pricing, dependency advisories, database credentials, allowed origins, backups, HTTPS, and all live-mode checks. Keep credentials out of the browser and repository.
