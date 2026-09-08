# Bob-n-Pam Drive

Simple ride booking for South Carolina — not Uber. Customers pick a time slot or
request ASAP; drivers call to confirm.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) for the customer page.

Driver board: [http://localhost:3001/driver](http://localhost:3001/driver)

**Note:** Port 3001 is used on purpose. Port 3000 is often taken by other local tools
(e.g. WrenAI). Customers on your real website will use your domain, not localhost.

Default driver password: `changeme` (set `DRIVER_PASSWORD` in `.env.local`).

## Docs

- [docs/PLAN.md](docs/PLAN.md) — product requirements
- [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) — technical details

## Email

Without `RESEND_API_KEY`, confirmation emails log to the server console.

Set `RESEND_API_KEY`, `EMAIL_FROM`, and optionally `DRIVER_ALERT_EMAIL` for production.
