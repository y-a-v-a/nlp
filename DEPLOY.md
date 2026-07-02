# Deploying The NLP Journey

The site is plain static files with **fully relative paths**, so it runs at a
subdomain root (e.g. `https://nlp.vincentbruijn.nl/`) — or any subpath — with no
build and no configuration. The interactive demos only need the page to be
*served over HTTP* (they `fetch` the corpus), which any web host does.

Two deployment targets are documented below: **Vercel** (recommended — zero-config,
free, automatic previews per PR) and the original **shared PHP hosting** path via
`rsync` over SSH.

## Option A: Vercel

The repo needs no build step and no dependencies, so this is a static deployment.
[`vercel.json`](./vercel.json) makes that explicit (`framework: null`, no build/install
command) instead of relying on Vercel's auto-detection, and sets a couple of baseline
security headers. [`.vercelignore`](./.vercelignore) trims the upload down to what the
browser actually requests — pages, each technique's `core.js`, `lib/`, `corpora/` —
by excluding everything else: `.github`, editor config, all Markdown (the injected
nav's README links point at GitHub, not at deployed files), `scripts/` (the homepage
scoreboard table is baked into `index.html` at build time), and the Node-only
`*/index.js` CLI entry points (the demos load `core.js`; "source" links go to GitHub).

### One-time setup

1. [vercel.com](https://vercel.com) → **Add New → Project** → import `y-a-v-a/nlp`.
2. Framework preset: leave as **Other**. Build/Output/Install commands: leave blank
   (`vercel.json` already pins these to "none").
3. Root Directory: leave as `.` (repo root).
4. Deploy. Vercel builds a Production Deployment from the default branch and a
   **Preview Deployment for every PR/branch push** automatically — no workflow file
   needed, unlike the rsync path below.

### Notes

- **Regenerate before pushing.** Unlike the rsync workflow, Vercel does not run
  `node scripts/build-site.js` for you — CI already enforces that the committed
  `index.html`/nav are in sync (see `.github/workflows/ci.yml`), so as long as that
  check passes before merge, what Vercel deploys is already correct.
- **Cache-Control** is left at Vercel's static-asset defaults (CDN-cached per
  deployment, revalidated by the browser) rather than pinning long `immutable`
  cache lifetimes — corpora and `lib/` files can change between deploys and have no
  cache-busting hash in their filenames.
- **`.md` and `index.js` links open on GitHub**, same as the rsync target (see below).
- **Verify before announcing.** After the first deploy, open the Vercel URL and click
  through a few demos (e.g. `markov/`, `tfidf/`, and `neural-lm/` → **Train**) to
  confirm the `fetch` paths resolve.

## Option B: Shared PHP hosting (rsync over SSH)

Deployment is a GitHub Actions workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
that `rsync`s the tree to your host over SSH. It runs **only when you trigger it**.

### One-time setup

#### 1. Create a deploy SSH key
On your machine (a dedicated key for this, no passphrase so CI can use it):

```bash
ssh-keygen -t ed25519 -f deploy_key -C "nlp-journey-deploy" -N ""
```

Add the **public** key to the server account that owns the subdomain:

```bash
ssh-copy-id -i deploy_key.pub user@your-host    # or append deploy_key.pub to ~/.ssh/authorized_keys on the server
```

Keep `deploy_key` (the **private** key) for the next step, then delete your local
copy. Never commit it.

#### 2. Add GitHub repository secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | What it is | Example |
|--------|-----------|---------|
| `DEPLOY_HOST` | SSH host of your provider | `ssh.yourhost.nl` |
| `DEPLOY_USER` | SSH username | `vincent` |
| `DEPLOY_PATH` | Absolute path to the subdomain's web root **(dedicated to this site)** | `/home/vincent/domains/nlp.vincentbruijn.nl/public_html` |
| `DEPLOY_SSH_KEY` | The **private** key contents (the whole `deploy_key` file) | `-----BEGIN OPENSSH PRIVATE KEY----- …` |
| `DEPLOY_PORT` | SSH port (optional, defaults to `22`) | `22` |

#### 3. Point DNS at the host
Create the `nlp` subdomain (A/AAAA record to the server IP, or CNAME per your
provider) and make sure the host serves `DEPLOY_PATH` as the docroot for
`nlp.vincentbruijn.nl`. Add TLS (Let's Encrypt) for `https://`.

### Deploying

The workflow file must be on the repository's **default branch** for the button
to appear. After that:

1. Repo → **Actions → "Deploy to nlp.vincentbruijn.nl" → Run workflow**.
2. Pick the branch to deploy from (defaults to the default branch).
3. It regenerates the homepage/nav, then `rsync`s everything up.

### Notes

- **`--delete` is off by default** so a deploy can never wipe unrelated files on a
  shared account. Once `DEPLOY_PATH` is confirmed dedicated to this site, add
  `--delete` to the `rsync` line in the workflow for a pristine mirror that also
  removes files you've deleted from the repo.
- **`.md` and `index.js` links serve as raw text.** The bottom-of-page "README" /
  "source" links and the homepage links to `OVERVIEW.md` / `TASKS.md` will display
  raw Markdown/JS on a plain host (same as GitHub Pages). If you'd prefer they open
  on GitHub instead, say so and I'll switch those links to absolute GitHub URLs.
- **Verify before announcing.** After the first deploy, open the live URL and click
  through a few demos (e.g. `markov/`, `tfidf/`, and `neural-lm/` → **Train**) to
  confirm the served `fetch` paths and MIME types are happy on your host.

### Manual alternative (no CI)

Same result from your laptop, any time:

```bash
# rsync over SSH (mirror; add --delete once DEPLOY_PATH is dedicated)
rsync -avz --exclude='.git' --exclude='.github' \
  ./ user@your-host:/path/to/nlp.vincentbruijn.nl/public_html/

# or SFTP-only hosts, with lftp:
lftp -u user,PASS sftp://your-host -e \
  "mirror -R --exclude .git/ --exclude .github/ ./ /path/to/public_html/; bye"
```
