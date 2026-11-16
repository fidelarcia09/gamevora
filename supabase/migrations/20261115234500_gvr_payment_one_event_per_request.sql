-- A single payment notification can be associated with at most one GVR request.
-- Ambiguous or competing notifications remain unlinked for manual review.
create unique index if not exists gvr_payment_notification_one_event_per_request_uidx
  on public.gvr_payment_notification_events (matched_request_id)
  where matched_request_id is not null;

comment on index public.gvr_payment_notification_one_event_per_request_uidx is
  'Prevents one GVR purchase request from being matched to multiple payment notification events.';
