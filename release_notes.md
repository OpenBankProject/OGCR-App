# Release Notes

## 2026-09-08

### Breaking: `SESSION_SECRET` is now required in production

Session cookies were previously signed with the hardcoded string `'secret'`, so
anyone could forge them. They are now signed with the value of the
`SESSION_SECRET` environment variable (commit `1f5f715`).

- **Production** (`NODE_ENV=production`): the app refuses to start unless
  `SESSION_SECRET` is set to at least 16 characters.
- **Development**: if unset or too short, the app logs a warning and falls back
  to an insecure built-in default so `npm run dev` keeps working.
- **Docker Compose**: `docker compose up` fails unless `SESSION_SECRET` is set.

**Action required:** generate a secret and add it to your `.env` (see
`.env.example`):

```sh
openssl rand -hex 32
```

Changing the secret invalidates existing sessions, so users will need to log in
again after upgrading.
