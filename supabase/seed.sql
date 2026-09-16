-- Local/dev-only seed data. Test agent/dirigeant accounts are intentionally
-- NOT created here: account provisioning is admin-provisioned via Supabase
-- Studio (Authentication > Users) in this app, so seeding matches the real
-- provisioning flow. After `supabase start`, create at least:
--   - one user with raw_user_meta_data { "role": "dirigeant", "full_name": "..." }
--   - one or two users with raw_user_meta_data { "role": "agent", "full_name": "..." }
-- See README.md "Local dev setup" for the exact steps.

insert into public.sites (id, name, address, sensitivity_level, client_name, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Entrepôt Nord', '12 rue des Frères Lumière, 69100 Villeurbanne', 2, 'Logistique Rhône SAS', true),
  ('22222222-2222-2222-2222-222222222222', 'Siège Actemium', '45 avenue Jean Jaurès, 69007 Lyon', 1, 'Actemium', true),
  ('33333333-3333-3333-3333-333333333333', 'Data Center Sud', '8 rue de la Presqu''île, 69002 Lyon', 3, 'DataCore', true),
  ('44444444-4444-4444-4444-444444444444', 'Parking Relais Gerland', '150 avenue Tony Garnier, 69007 Lyon', 1, 'Ville de Lyon', true)
on conflict (id) do nothing;

-- Coordinates geocoded via Nominatim during development (Phase 3). Two of
-- the four addresses above are fictional/not in OSM, so those fall back to
-- their postal-code centroid rather than a precise rooftop point -- fine
-- for demo data, not a general geocoding strategy.
update public.sites set lat = 45.7710634, lng = 4.8889992 where id = '11111111-1111-1111-1111-111111111111'; -- Entrepôt Nord (postal-code fallback)
update public.sites set lat = 45.7501703, lng = 4.8449909 where id = '22222222-2222-2222-2222-222222222222'; -- Siège Actemium
update public.sites set lat = 45.7483978, lng = 4.8256273 where id = '33333333-3333-3333-3333-333333333333'; -- Data Center Sud (postal-code fallback)
update public.sites set lat = 45.7259009, lng = 4.8399728 where id = '44444444-4444-4444-4444-444444444444'; -- Parking Relais Gerland
