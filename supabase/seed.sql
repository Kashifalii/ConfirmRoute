-- ConfirmRoute — fictional demo data (matches src/lib/data/seed/seed-data.ts).
-- Idempotent: fixed primary keys + ON CONFLICT DO NOTHING, so re-running the
-- seed never duplicates records.
-- Demo only: do not apply this fixed-organization seed to a multi-tenant
-- workspace. Supabase Auth workspaces are provisioned on confirmed signup.

insert into organizations (id, name, created_at) values
  ('a1b2c3d4-0000-4000-8000-000000000001', 'K2 Horizon Travels', '2026-09-15T08:00:00Z')
on conflict (id) do nothing;

insert into customers (id, organization_id, name, email, phone, created_at) values
  ('a1b2c3d4-0000-4000-8000-00000000c001', 'a1b2c3d4-0000-4000-8000-000000000001', 'Ahmed Khan', 'ahmed.khan@example.com', '+92 300 5550101', '2026-09-12T09:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000c002', 'a1b2c3d4-0000-4000-8000-000000000001', 'Fatima Raza', 'fatima.raza@example.com', '+92 300 5550102', '2026-09-13T09:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000c003', 'a1b2c3d4-0000-4000-8000-000000000001', 'Bilal Sheikh', 'bilal.sheikh@example.com', '+92 300 5550103', '2026-09-14T09:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000c004', 'a1b2c3d4-0000-4000-8000-000000000001', 'Ayesha Malik', 'ayesha.malik@example.com', '+92 300 5550104', '2026-09-15T09:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000c005', 'a1b2c3d4-0000-4000-8000-000000000001', 'Usman Tariq', 'usman.tariq@example.com', '+92 300 5550105', '2026-09-16T09:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000c006', 'a1b2c3d4-0000-4000-8000-000000000001', 'Hira Qureshi', 'hira.qureshi@example.com', '+92 300 5550106', '2026-09-17T09:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000c007', 'a1b2c3d4-0000-4000-8000-000000000001', 'Daniyal Hussain', 'daniyal.hussain@example.com', '+92 300 5550107', '2026-09-18T09:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000c008', 'a1b2c3d4-0000-4000-8000-000000000001', 'Sana Iqbal', 'sana.iqbal@example.com', '+92 300 5550108', '2026-09-19T09:00:00Z')
on conflict (id) do nothing;

insert into suppliers (id, organization_id, name, service_type, created_at) values
  ('a1b2c3d4-0000-4000-8000-00000000s001', 'a1b2c3d4-0000-4000-8000-000000000001', 'Mountain View Resort', 'hotel', '2026-09-01T08:30:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000s002', 'a1b2c3d4-0000-4000-8000-000000000001', 'SkyWing Airlines', 'flight', '2026-09-02T08:30:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000s003', 'a1b2c3d4-0000-4000-8000-000000000001', 'Silk Route Tours', 'tour', '2026-09-03T08:30:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000s004', 'a1b2c3d4-0000-4000-8000-000000000001', 'Coastal Pearl Hotels', 'hotel', '2026-09-04T08:30:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000s005', 'a1b2c3d4-0000-4000-8000-000000000001', 'Indus Car Services', 'transfer', '2026-09-05T08:30:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000s006', 'a1b2c3d4-0000-4000-8000-000000000001', 'Thar Desert Safaris', 'tour', '2026-09-06T08:30:00Z')
on conflict (id) do nothing;

insert into bookings (id, organization_id, reference, normalized_reference, customer_id, supplier_id, service_type, start_date, end_date, amount, currency, status, notes, created_at, updated_at) values
  ('a1b2c3d4-0000-4000-8000-00000000b001', 'a1b2c3d4-0000-4000-8000-000000000001', 'MVR-1025', 'MVR1025', 'a1b2c3d4-0000-4000-8000-00000000c001', 'a1b2c3d4-0000-4000-8000-00000000s001', 'hotel', '2026-11-15', '2026-11-18', 75000, 'PKR', 'pending_review', 'Mountain-view room requested. Confirmation received by email.', '2026-10-06T10:12:00Z', '2026-10-06T10:12:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b002', 'a1b2c3d4-0000-4000-8000-000000000001', 'SWA-8842', 'SWA8842', 'a1b2c3d4-0000-4000-8000-00000000c002', 'a1b2c3d4-0000-4000-8000-00000000s002', 'flight', '2026-12-01', '2026-12-07', 132500, 'PKR', 'approved', 'Islamabad – Dubai return, economy class.', '2026-09-28T08:40:00Z', '2026-09-28T08:40:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b003', 'a1b2c3d4-0000-4000-8000-000000000001', 'HGD-2091', 'HGD2091', 'a1b2c3d4-0000-4000-8000-00000000c003', 'a1b2c3d4-0000-4000-8000-00000000s004', 'hotel', '2026-10-20', null, 58000, 'PKR', 'pending_review', 'Confirmation lists the arrival date but the departure date is missing.', '2026-10-09T14:05:00Z', '2026-10-09T14:05:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b004', 'a1b2c3d4-0000-4000-8000-000000000001', 'TRS-5510', 'TRS5510', 'a1b2c3d4-0000-4000-8000-00000000c004', 'a1b2c3d4-0000-4000-8000-00000000s006', 'tour', '2026-11-02', '2026-11-06', 44000, 'PKR', 'approved', null, '2026-09-21T11:20:00Z', '2026-09-21T11:20:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b005', 'a1b2c3d4-0000-4000-8000-000000000001', 'ICS-3377', 'ICS3377', 'a1b2c3d4-0000-4000-8000-00000000c005', 'a1b2c3d4-0000-4000-8000-00000000s005', 'transfer', '2026-10-18', '2026-10-18', 12500, 'PKR', 'approved', 'Airport pickup, sedan.', '2026-10-01T09:15:00Z', '2026-10-01T09:15:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b006', 'a1b2c3d4-0000-4000-8000-000000000001', 'MVR-1038', 'MVR1038', 'a1b2c3d4-0000-4000-8000-00000000c006', 'a1b2c3d4-0000-4000-8000-00000000s001', 'hotel', '2026-12-10', '2026-12-14', 82000, 'PKR', 'pending_review', 'Amended confirmation received with a new total.', '2026-10-04T16:45:00Z', '2026-10-04T16:45:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b007', 'a1b2c3d4-0000-4000-8000-000000000001', 'SWA-8901', 'SWA8901', 'a1b2c3d4-0000-4000-8000-00000000c007', 'a1b2c3d4-0000-4000-8000-00000000s002', 'flight', '2026-11-22', '2026-11-28', 940, 'USD', 'approved', null, '2026-09-25T13:30:00Z', '2026-09-25T13:30:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b008', 'a1b2c3d4-0000-4000-8000-000000000001', 'TRS-5564', 'TRS5564', 'a1b2c3d4-0000-4000-8000-00000000c008', 'a1b2c3d4-0000-4000-8000-00000000s006', 'tour', '2026-10-25', '2026-10-29', 39500, 'PKR', 'archived', 'Trip cancelled by the customer; kept for reference.', '2026-09-18T10:00:00Z', '2026-09-18T10:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b009', 'a1b2c3d4-0000-4000-8000-000000000001', 'HGD-2140', 'HGD2140', 'a1b2c3d4-0000-4000-8000-00000000c001', 'a1b2c3d4-0000-4000-8000-00000000s004', 'hotel', '2027-01-05', '2027-01-09', 65000, 'PKR', 'pending_review', null, '2026-10-11T09:50:00Z', '2026-10-11T09:50:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b010', 'a1b2c3d4-0000-4000-8000-000000000001', 'ICS-3402', 'ICS3402', 'a1b2c3d4-0000-4000-8000-00000000c002', 'a1b2c3d4-0000-4000-8000-00000000s005', 'transfer', '2026-11-30', '2026-11-30', 350, 'AED', 'approved', 'Dubai airport transfer for the December trip.', '2026-10-03T12:10:00Z', '2026-10-03T12:10:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b011', 'a1b2c3d4-0000-4000-8000-000000000001', 'SRT-7204', 'SRT7204', 'a1b2c3d4-0000-4000-8000-00000000c003', 'a1b2c3d4-0000-4000-8000-00000000s003', 'tour', '2026-12-18', '2026-12-22', 1250, 'EUR', 'approved', null, '2026-09-30T15:25:00Z', '2026-09-30T15:25:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000b012', 'a1b2c3d4-0000-4000-8000-000000000001', 'trs 5510', 'TRS5510', 'a1b2c3d4-0000-4000-8000-00000000c005', 'a1b2c3d4-0000-4000-8000-00000000s006', 'tour', '2026-11-02', '2026-11-06', 41000, 'PKR', 'pending_review', 'Received from a second sales contact; reference looks like an existing booking.', '2026-10-12T17:35:00Z', '2026-10-12T17:35:00Z')
on conflict (id) do nothing;

insert into booking_exceptions (id, organization_id, booking_id, type, field, description, previous_value, new_value, status, resolution_note, resolved_at, created_at) values
  ('a1b2c3d4-0000-4000-8000-00000000e001', 'a1b2c3d4-0000-4000-8000-000000000001', 'a1b2c3d4-0000-4000-8000-00000000b003', 'missing_field', 'endDate', 'The confirmation does not include a departure date. Add the end date before approving this booking.', null, null, 'open', null, null, '2026-10-09T14:06:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000e002', 'a1b2c3d4-0000-4000-8000-000000000001', 'a1b2c3d4-0000-4000-8000-00000000b006', 'value_change', 'amount', 'The amended confirmation lists PKR 82,000 while the booking previously recorded PKR 78,000 — a difference of PKR 4,000. Review and confirm the new amount.', '78000', '82000', 'open', null, null, '2026-10-04T16:50:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000e003', 'a1b2c3d4-0000-4000-8000-000000000001', 'a1b2c3d4-0000-4000-8000-00000000b012', 'duplicate_reference', 'reference', 'Reference ''trs 5510'' matches the normalized reference of an existing booking (TRS-5510, Thar Desert Safaris tour). Confirm whether this is a separate booking before approving.', null, 'trs 5510', 'open', null, null, '2026-10-12T17:36:00Z')
on conflict (id) do nothing;

insert into booking_changes (id, booking_id, actor, field, previous_value, new_value, reason, created_at) values
  ('a1b2c3d4-0000-4000-8000-00000000h001', 'a1b2c3d4-0000-4000-8000-00000000b002', 'Kamran Siddiqui', 'status', 'pending_review', 'approved', 'Checked against the e-ticket; all details matched.', '2026-09-28T09:02:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000h002', 'a1b2c3d4-0000-4000-8000-00000000b004', 'Rabia Anwar', 'status', 'pending_review', 'approved', 'Safari itinerary confirmed with the supplier.', '2026-09-21T12:00:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000h003', 'a1b2c3d4-0000-4000-8000-00000000b007', 'Kamran Siddiqui', 'travelDates', '2026-11-20 → 2026-11-26', '2026-11-22 → 2026-11-28', 'Airline schedule change accepted after guest confirmation.', '2026-10-05T10:44:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000h004', 'a1b2c3d4-0000-4000-8000-00000000b005', 'Rabia Anwar', 'status', 'pending_review', 'approved', 'Driver and pickup time confirmed.', '2026-10-01T09:40:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000h005', 'a1b2c3d4-0000-4000-8000-00000000b010', 'Kamran Siddiqui', 'status', 'pending_review', 'approved', 'Transfer voucher verified.', '2026-10-03T12:30:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000h006', 'a1b2c3d4-0000-4000-8000-00000000b011', 'Rabia Anwar', 'status', 'pending_review', 'approved', 'Tour package and price confirmed.', '2026-09-30T15:40:00Z')
on conflict (id) do nothing;

insert into booking_documents (id, organization_id, booking_id, filename, mime_type, size_bytes, storage_path, source_scenario, created_at) values
  ('a1b2c3d4-0000-4000-8000-00000000d001', 'a1b2c3d4-0000-4000-8000-000000000001', 'a1b2c3d4-0000-4000-8000-00000000b001', 'mountain-view-resort-confirmation.pdf', 'application/pdf', 48213, null, null, '2026-10-06T10:12:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000d002', 'a1b2c3d4-0000-4000-8000-000000000001', 'a1b2c3d4-0000-4000-8000-00000000b002', 'skywing-eticket.pdf', 'application/pdf', 63740, null, null, '2026-09-28T08:40:00Z'),
  ('a1b2c3d4-0000-4000-8000-00000000d003', 'a1b2c3d4-0000-4000-8000-000000000001', 'a1b2c3d4-0000-4000-8000-00000000b006', 'mvr-1038-amended-confirmation.pdf', 'application/pdf', 51102, null, null, '2026-10-04T16:45:00Z')
on conflict (id) do nothing;
