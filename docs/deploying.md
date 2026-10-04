# Deploying

The site is static. `npm run build` writes everything to `dist/`, and any web server or
static host can serve it. This page is for whoever runs a copy; contributors need none of it.

## Settings

Copy [.env.example](../.env.example) to `.env`, or set the same names as environment
variables (they win over `.env`). Visitor statistics stay off unless they're set up
correctly; a wrong setting is left out, and the build says why. The disclaimer page
describes whatever is on.

## Serving dist/

What the server should do (`npm run dev` does the same locally):

- **Clean addresses**: `/beats-101` serves `beats-101.html`.
- **Missing pages**: anything that isn't there gets `404.html`, with status 404.
- **Compression**: every file has `.br` and `.gz` twins; send those rather than
  compressing on each request.
- **Caching**: files in `assets/` have a hash of their contents in their names and never
  change, so they can be cached for a year. Pages should be revalidated on every visit, so
  a new release shows up at once.
- **Security headers**: a Content-Security-Policy that allows only the site's own files,
  plus `X-Content-Type-Options: nosniff` and a `Referrer-Policy`. The pages need no inline
  scripts or styles, so the policy can be strict:

  ```
  default-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
  ```

  With statistics, add the Umami server to `script-src` and `connect-src`; its session
  recorder also starts a worker from a `blob:` address (all on one line):

  ```
  default-src 'self'; script-src 'self' https://stats.example.org; connect-src 'self' https://stats.example.org; worker-src 'self' blob:; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
  ```

For example, with [Caddy](https://caddyserver.com), serving the release that `current`
points to (see below):

```caddyfile
music.example.org {
	root * /var/www/music/current
	try_files {path} {path}.html
	file_server {
		precompressed br gzip
	}

	@assets path /assets/*
	header @assets Cache-Control "public, max-age=31536000, immutable"
	@pages not path /assets/*
	header @pages Cache-Control "no-cache"

	header {
		Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}

	# error routes don't inherit the site's root
	handle_errors 404 {
		root * /var/www/music/current
		rewrite * /404.html
		file_server {
			precompressed br gzip
		}
	}
}
```

## Deploying with Gitea Actions

[.gitea/workflows/deploy.yml](../.gitea/workflows/deploy.yml) tests every push to `main` on
the web server itself, builds it, and makes it live. It does nothing until it's set up:

1. Run a Gitea (or Forgejo) Actions runner on the web server, in host mode, with the label
   `deploy`. The machine needs Node 22.13+, and the runner's user needs `sudo` for
   `install` (to create the releases folder once).
2. In the repository's **Settings → Actions → Variables**, set:
   - `DEPLOY_DIR`: where releases go, e.g. `/var/www/music`. Each is built into
     `DEPLOY_DIR/releases/<commit>`, and `DEPLOY_DIR/current` then switches to it in one
     step. Serve `DEPLOY_DIR/current`.
   - `SITE_URL`: the live address, e.g. `https://music.example.org`, checked after each
     deploy.
   - `KEEP`: how many releases to keep for rolling back (5 if unset).
   - the site's settings, named as in [.env.example](../.env.example).

To roll back, run the workflow again (**Run workflow**) on an older commit, as long as it's
among the releases kept.

### Keep in mind

The deploy runner runs whatever is on `main` — including the build tools that `npm ci`
installs — on your web server. Protect `main` (pull requests only, with a review), look
closely at changes to `.gitea/`, `scripts/` and `package.json`, and run the runner as a user
that can write to `DEPLOY_DIR` and little else.
