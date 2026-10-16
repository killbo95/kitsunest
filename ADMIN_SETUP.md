# KitsuNest Admin — secure setup

The admin page is `admin.html`. Writes are handled by `worker.js`, not by browser code. GitHub tokens and OAuth secrets must only exist as Cloudflare Worker secrets.

## 1. Create a GitHub OAuth App
In GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
- Application name: `KitsuNest Admin`
- Homepage URL: `https://killbo95.github.io/kitsunest/`
- Authorization callback URL: your deployed Worker URL plus `/auth/callback`, e.g. `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/auth/callback`.
Copy the Client ID. Generate a Client Secret. Never put the secret in this repository.

## 2. Deploy the Cloudflare Worker
Create a Worker in Cloudflare and paste the contents of `worker.js`. Deploy it, then add these **Variables and Secrets** in Worker Settings:
- Variables: `GITHUB_OWNER=killbo95`, `GITHUB_REPO=kitsunest`, `GITHUB_BRANCH=main`, `ADMIN_GITHUB_LOGIN=YOUR_EXACT_GITHUB_USERNAME`, `ALLOWED_ORIGIN=https://killbo95.github.io`
- Secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_TOKEN`, `SESSION_SECRET`

For `GITHUB_TOKEN`, create a fine-grained personal access token scoped only to this repository with **Contents: Read and write** permission. Store it as a Worker secret; do not paste it into HTML, JavaScript, issues, or chat. For `SESSION_SECRET`, use a long random secret (at least 32 random characters) generated locally or with a password manager.

Set the OAuth app callback URL to the exact deployed Worker URL plus `/auth/callback`. If your site uses a different public origin, set `ALLOWED_ORIGIN` to that exact origin and redeploy.

## 3. Open the admin page
Open `https://killbo95.github.io/kitsunest/admin.html`. The first time, click **Continue with GitHub**, paste the Worker URL when prompted, and it will be remembered in that browser. Only the exact GitHub username configured in `ADMIN_GITHUB_LOGIN` can access admin actions.

## Notes
- The session cookie is HttpOnly, Secure, signed server-side, and expires after 8 hours. The Worker rechecks the authorized GitHub username on every API request.
- The Worker writes anime JSON files and updates the catalogue array in `index.html`, so new/edited/deleted anime appear on the home page.
- Episode URLs must be HTTPS embed links from providers that expressly permit embedding/sharing. Do not use unauthorized copies.
- This project is a static GitHub Pages site plus a separate Worker API. The admin is **not secure until the Worker is deployed and all variables/secrets are set correctly**.
