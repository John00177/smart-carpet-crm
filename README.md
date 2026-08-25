# Smart Carpet Distribution CRM

Full-stack CRM for a carpet distribution business: a central warehouse buys carpets in
bulk and distributes them to 5 branch stores, which sell to customers and pay back the
central warehouse in installments.

## Structure

```
smart-carpet-crm/
  backend/    Node.js + Express + Sequelize + PostgreSQL API (JWT auth)
  frontend/   React (CRA) client, plain CSS
```

## Roles

- **admin** — money-only dashboard (stock value, debt, income/outcome)
- **warehouse** — central stock, purchases from manufacturer, transfers to branches
- **branch** — branch stock, sales to customers, payments to admin

## Local development

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to a local/hosted Postgres instance and a real JWT_SECRET
npm install
npm run seed   # creates tables and seed data (drops existing tables!)
npm run dev    # starts on http://localhost:5000
```

Demo accounts created by the seed script:

| Role      | Email                        | Password     |
|-----------|-------------------------------|---------------|
| admin     | admin@smartcarpet.uz          | admin123      |
| admin     | son@smartcarpet.uz            | admin123      |
| warehouse | warehouse1@smartcarpet.uz     | warehouse123  |
| warehouse | warehouse2@smartcarpet.uz     | warehouse123  |
| branch    | branch1@smartcarpet.uz (Davronbek) | branch123 |
| branch    | branch2@smartcarpet.uz (Tursunboy) | branch123 |
| branch    | branch3@smartcarpet.uz (Globus)    | branch123 |
| branch    | branch4@smartcarpet.uz (Branch 4)  | branch123 |
| branch    | branch5@smartcarpet.uz (Branch 5)  | branch123 |

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# edit .env: REACT_APP_API_URL should point at the backend (e.g. http://localhost:5000/api)
npm install
npm start      # starts on http://localhost:3000
```

## Deployment (Railway)

1. Push this repo to GitHub.
2. In Railway, create a new project → **Deploy from GitHub repo**, pick the repo, and set
   the service **root directory** to `backend`.
3. Add a **PostgreSQL** plugin to the Railway project. Railway will inject `DATABASE_URL`
   automatically into the backend service — no need to set it manually.
4. Set environment variables on the backend service:
   - `JWT_SECRET` — a long random string
   - `NODE_ENV=production`
   - `CLIENT_URL` — the deployed frontend URL (for CORS, once you know it)
5. Deploy. Once live, run the seed script once against production (Railway shell or a
   one-off run of `npm run seed`) to create the demo accounts and warehouses/products.
   **Warning: the seed script drops and recreates all tables** — only run it once, on a
   fresh database.
6. Frontend: either
   - **Same service**: run `npm run build` in `frontend` before deploy and let the backend
     serve the static build (already wired in `backend/src/server.js` — it serves
     `frontend/build` if present), or
   - **Separate Railway service**: create a second service rooted at `frontend`, with
     build command `npm run build` and a static file server, or deploy to Vercel instead
     and point `REACT_APP_API_URL` at the Railway backend URL.
7. Point `myandijan.uz` (via UzCloud DNS) at the Railway/Vercel deployment using a CNAME
   or the platform's custom-domain instructions, then add the domain in the
   Railway/Vercel dashboard.

## Notes

- Currency is USD only for now; UZS support and Uzbek/Russian UI localization are planned
  for a later iteration.
- Every transfer and purchase records the warehouse staff member (`created_by`) who
  performed it.
- Branch debt = total sell-value of stock ever transferred to that branch − total
  payments made by that branch.
