# OGCR App - Claude Code Notes

## OBP API Dynamic Endpoints Discovery

Dynamic entity structures change over time. Always fetch the current documentation before working with endpoints.

### How to Discover Dynamic Endpoints

Fetch the resource docs to get current endpoint structures:

```
GET /obp/v6.0.0/resource-docs/v6.0.0/obp?content=dynamic
```

This returns all dynamic endpoints with:
- `request_verb` - HTTP method (GET, POST, PUT, DELETE)
- `request_url` - URL pattern
- `specified_url` - Full endpoint path
- `typed_request_body` - JSON schema for request body
- `example_request_body` - Example request payload
- `success_response_body` - Example successful response
- `description_markdown` - Property descriptions

### URL Pattern for Dynamic Entities

All dynamic entity CRUD operations use `/obp/dynamic-entity/{entity_name}`:

- **List all:** `GET /obp/dynamic-entity/{entity_name}`
- **Get single:** `GET /obp/dynamic-entity/{entity_name}/{id}`
- **Create:** `POST /obp/dynamic-entity/{entity_name}`
- **Update:** `PUT /obp/dynamic-entity/{entity_name}/{id}`
- **Delete:** `DELETE /obp/dynamic-entity/{entity_name}/{id}`

Do NOT use `/obp/v5.1.0/management/system-dynamic-entities/` for CRUD operations.

### POST Request Pattern

For creating dynamic entities:
- **Request:** Send flat object with properties only (no wrapper, no ID)
- **Response:** Returns wrapped object with generated ID

### Response Pattern

- **List response:** `{ "{entity_name}_list": [...] }`
- **Single response:** `{ "{entity_name}": {...} }`

### Important: Field Naming

The resource docs examples may show camelCase (e.g., `ogcr5_projectId`) but the actual API returns snake_case (e.g., `ogcr5_project_id`). Always verify field names from actual API responses, not just the documentation examples.
