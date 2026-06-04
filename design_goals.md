# OGCR Marketplace — Design Goals

## Core principle: the marketplace is a UI for the registry

The marketplace (this app, the CCM) is a **user-facing interface over the registry (DCR)**. It does not own carbon-activity data — the registry does. Technically, therefore, **you should not be able to *create* an activity in the marketplace.**

## You list existing registry activities — you don't create them

- The marketplace **cannot have listings that don't exist on the registry.**
- An operator should be able to **find their activity** (which already exists on the registry) and **list it**, after **proving they are that operator.**
- So **"Create Activity" should really be "List Activity"**: the operator connects an existing registry activity to the marketplace, then fills in only the information they're allowed to edit (below).

## What the operator MAY set/edit on the marketplace

**Marketing fields** (presentation only):
- Summary
- Thumbnail
- Media links (add)
- Website

**Commercial fields** (the operator's listing terms):
- **Price per credit** — operators choose the price.
- **Credits available** — operators choose how many credits to make available.

> Note: this pricing is the **activity-listing** price set by the operator. It is **different** from pricing on the **offers / Market order-book** side, which is set by the market (supply/demand, matching).

## What MUST come from the registry (read-only in the marketplace)

These are authoritative on the registry and must not be editable in the marketplace:

- Activity ID
- Description
- Operator name / id
- Technologies, practices and processes — *filled out when submitting the activity for certification; must be certified by the scheme before being allowed on the registry.*
- Activity type — *depends on the technologies, practices and processes; cannot be decided by the marketplace.*
- Cobenefits
- City
- Country code
- Coordinates
- Start/end dates of the activity and of the monitoring period
- Term commitment
- Methodologies

## Credit unit types (not yet implemented)

The credit unit types (the four CRCF categories) likewise **depend on the technologies, practices and processes** and **cannot be decided in the moment** by the marketplace. They are derived/certified upstream, not chosen on the listing. (Not implemented in the marketplace yet.)

## Implication for the app

- Rename/rework **Create Activity → List Activity**.
- The operator must be able to **connect an existing registry activity** to the marketplace (after proving they are that operator).
- The listing UI then exposes **only** the editable marketing fields (summary, thumbnail, media links, website) and commercial fields (price per credit, credits available); **all registry-authoritative fields are shown read-only.**
