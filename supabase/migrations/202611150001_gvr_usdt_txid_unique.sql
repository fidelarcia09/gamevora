-- Prevent the same BNB Smart Chain transaction from being attached to
-- more than one GVR purchase request. Existing audit found no stored TXIDs.
create unique index if not exists gvr_purchase_requests_payment_txid_unique
  on public.gvr_purchase_requests (lower(btrim(payment_txid)))
  where payment_txid is not null and btrim(payment_txid) <> '';

comment on index public.gvr_purchase_requests_payment_txid_unique is
  'Prevents reuse of a USDT payment TXID across GVR purchase requests (case-insensitive).';
