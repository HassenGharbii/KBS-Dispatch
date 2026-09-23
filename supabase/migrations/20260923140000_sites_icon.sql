-- Lets a dirigeant pick a visual icon per site (warehouse, parking, data
-- center, etc.) in the web console. Stored as a short key, not a raw icon
-- name/SVG, so the icon set can be re-themed without touching data.
alter table public.sites
  add column icon text not null default 'building';
