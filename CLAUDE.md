# OGCR App - Claude Code Notes

## Always use the OGCR Design System

Every piece of UI in this app must use the OGCR Design System. This is a requirement,
not a preference. How the app consumes it (token mirror, ported components, porting
conventions) is in `design_system_integration.md`; the live reference is `/design`.

- **Colour, type, spacing, radius, elevation:** use the design system's named tokens
  from `src/ogcr-theme.css` (`var(--text-primary)`, `var(--text-secondary)`,
  `var(--surface-light)`, `var(--space-m)`, `var(--radius-l)`, the `text-h1` / `text-body`
  classes, ...). Do not pick a colour from the Skeleton ramps (`text-surface-600-400`,
  `bg-primary-300`, ...): most ramp steps are interpolated and match no design system
  token. Never hard-code hex values or pixel sizes that a token already covers.
- **Components:** use the ported components in `src/lib/components/` (`Card`, `Pill`,
  `Kpi`, `Table`) rather than hand-rolling the same thing. If the design system has a
  component that is not ported yet, port it (see "Porting conventions" in
  `design_system_integration.md`) rather than inventing a look.
- **No design system answer?** Ask before inventing one. Dark mode is the documented
  exception: the design system has no dark palette, so components add a
  `:global([data-mode='dark'])` block using the Skeleton dark surfaces.
- **Existing code:** much of the app predates this rule (for example, around 180 uses of
  `text-surface-600-400`). Bring the lines you are already changing onto design system
  tokens, but do not sweep files the task does not touch.

## OBP API Dynamic Endpoints Discovery

Dynamic entity structures change over time. Always fetch the current documentation before working with endpoints.

### How to Discover Dynamic Endpoints

Fetch the resource docs to list all dynamic endpoints and their structures:

```
GET /obp/v6.0.0/resource-docs/v6.0.0/obp?content=dynamic
```

This lists all dynamic endpoints (all verbs, all entities) and returns for each:
- `request_verb` - HTTP method (GET, POST, PUT, DELETE)
- `request_url` - URL pattern
- `specified_url` - Full endpoint path
- `typed_request_body` - JSON schema for request body
- `example_request_body` - Example request payload
- `success_response_body` - Example successful response
- `description_markdown` - Property descriptions

### URL Pattern for Dynamic Entities

The OGCR entities are defined at bank level (OBP v7.0.0), in the bank named by
`OBP_ENTITY_SPACE_ID` (default `ogcr`). All CRUD operations use
`/obp/dynamic-entity/banks/{BANK_ID}/{entity_name}`:

- **List all:** `GET /obp/dynamic-entity/banks/{BANK_ID}/{entity_name}`
- **Get single:** `GET /obp/dynamic-entity/banks/{BANK_ID}/{entity_name}/{id}`
- **Create:** `POST /obp/dynamic-entity/banks/{BANK_ID}/{entity_name}`
- **Update:** `PUT /obp/dynamic-entity/banks/{BANK_ID}/{entity_name}/{id}`
- **Delete:** `DELETE /obp/dynamic-entity/banks/{BANK_ID}/{entity_name}/{id}`

Never write these paths by hand: build them with `entityPath()` from
`$lib/constants/entities`, which applies the configured space. Roles for the
records are granted at that bank id (`ENTITY_ROLE_BANK_ID`).

Do NOT use the `/management/.../dynamic-entities` endpoints for CRUD operations; they manage definitions.

### POST Request Pattern

For creating dynamic entities:
- **Request:** Send flat object with properties only (no wrapper, no ID)
- **Response:** Returns wrapped object with generated ID

### Response Pattern

- **List response:** `{ "{entity_name}_list": [...] }`
- **Single response:** `{ "{entity_name}": {...} }`

### Important: Field Naming

The resource docs examples may show camelCase (e.g., `ogcr5_projectId`) but the actual API returns snake_case (e.g., `ogcr5_project_id`). Always verify field names from actual API responses, not just the documentation examples.
