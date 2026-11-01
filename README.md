# Little Bean

Baby-food shop for the Maldives: shop, age finder, basket and checkout by BML
transfer with slip checking, customer accounts with Bean Points, and a full
admin (orders, products, inventory and costing, POS, team logins, settings).

It runs on **Cloudflare Workers** with a **D1** database and an **R2** bucket.
Built with TanStack Start, React 19, Vite and Tailwind.

> This is a full web app, not a single HTML page. Accounts, orders, admin and
> Bean Points need the server and database, so it deploys to Cloudflare
> (free plan is enough to start).

## Folder layout

```
app/
  src/routes/        pages (home, shop, product, checkout, account, admin) and /api routes
  src/components/tt/ Little Bean components (header, carousel, age finder, admin screens…)
  src/lib/           server logic (orders, auth, slip check, notifications)
  migrations/        database tables, applied in order (0001 … 0019)
  public/            images, cut-outs, fonts
  wrangler.jsonc     Cloudflare settings (database + storage)
.github/workflows/deploy.yml   optional one-click deploy from GitHub
```

## Deploy (first time, from your computer)

You need [Bun](https://bun.sh) and a free [Cloudflare](https://dash.cloudflare.com) account.

```bash
cd app
bun install

# 1. Sign in to Cloudflare (opens your browser)
bunx wrangler@4 login

# 2. Create the database and the media bucket
bunx wrangler@4 d1 create little-bean-db
#    → copy the "database_id" it prints into app/wrangler.jsonc
#      (replace REPLACE_WITH_YOUR_D1_DATABASE_ID)
bunx wrangler@4 r2 bucket create little-bean-media

# 3. Create the tables
bunx wrangler@4 d1 migrations apply little-bean-db --remote

# 4. Set the Super Admin password (you type it; it is stored encrypted at Cloudflare)
bunx wrangler@4 secret put ADMIN_PASSWORD

# 5. Build and publish
bunx vite build
bunx wrangler@4 deploy
```

Wrangler prints your site address (`https://little-bean.<your-name>.workers.dev`).

Then open `/admin`, sign in as **superadmin** with the password from step 4,
and in **Settings** fill in the shop details, bank account, WhatsApp/CallMeBot
and Telegram keys. Those keys are saved in your database, not in this code.

## Updating later

```bash
cd app
bunx vite build
bunx wrangler@4 d1 migrations apply little-bean-db --remote   # only if new migrations were added
bunx wrangler@4 deploy
```

### Or deploy from GitHub

After the first-time setup (steps 1–4), you can deploy from the repo instead:

1. In GitHub: **Settings → Secrets and variables → Actions**, add
   `CLOUDFLARE_API_TOKEN` (Cloudflare → My Profile → API Tokens → "Edit Cloudflare Workers"
   template, plus D1 Edit) and `CLOUDFLARE_ACCOUNT_ID`.
2. Make sure `app/wrangler.jsonc` has your real database id committed.
3. **Actions → Deploy to Cloudflare → Run workflow.**

## Run it locally

```bash
cd app
bun install
bunx vite build
echo 'ADMIN_PASSWORD=pick-a-local-password' > .dev.vars
bunx wrangler@4 d1 migrations apply little-bean-db --local
bunx wrangler@4 dev
```

## Your own domain

Cloudflare dashboard → **Workers & Pages → little-bean → Settings → Domains & Routes → Add custom domain**.
The domain must be on Cloudflare (you can move its DNS there for free).

## Good to know

- A new Cloudflare database starts with the sample products and settings from
  the migrations. Products, customers and orders from the current
  tinnytummies.higgsfield.app site are **not** copied over automatically.
- Photos you upload in admin go to the R2 bucket. Payment slips are stored there too.
- The `app/packages/` folder holds UI libraries the app is built on. Leave it in place.
