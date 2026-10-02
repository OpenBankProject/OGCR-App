# Release Notes

## 2026-10-02

### Breaking: the registry now reads the `registry/activities-query` Dynamic Query

The public registry (`/registry`, `/registry/activities`, `/registry/certificates/…`)
now calls `GET /obp/dynamic-endpoint/dynamic-resource-doc/registry/activities-query`
instead of the Scala Dynamic Resource Doc at `…/registry/activities`. The host still
comes from `PUBLIC_OBP_BASE_URL`; the response shape is unchanged.

**Action required** on each OBP instance the app points at, before deploying:

1. OBP-API must include the "Dynamic Query" commit (`fd8f70691`). Older versions reject
   the doc with `OBP-40049`.
2. Create the doc from OGCR-DynamicEntities, with `OBP_ENTITY_SPACE_ID` set to the
   entity space (it is created at that bank):

   ```sh
   python3 dynamic_resource_docs.py create registry_activities_query
   ```

3. The `activity`, `country`, `operator`, `activity_verification` and
   `certificate_of_compliance` Dynamic Entities must have public access. Otherwise
   signed-out visitors get a 403 and the registry pages show an error with no data.

Check it with an anonymous call; it should return `{"activities": [...], "count": N}`:

```sh
curl "$PUBLIC_OBP_BASE_URL/obp/dynamic-endpoint/dynamic-resource-doc/registry/activities-query"
```

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
