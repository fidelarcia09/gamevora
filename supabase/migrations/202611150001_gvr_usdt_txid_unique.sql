-- Evita que el mismo TXID de BNB Smart Chain se vincule a más de una solicitud GVR.
-- Se mantiene la unicidad incluso si una solicitud fue rechazada: un TXID ya utilizado
-- no debe poder presentarse como un pago nuevo sin revisión manual.
create unique index if not exists gvr_purchase_requests_payment_txid_unique
  on public.gvr_purchase_requests (lower(btrim(payment_txid)))
  where payment_txid is not null
    and btrim(payment_txid) <> '';

comment on index public.gvr_purchase_requests_payment_txid_unique is
  'Impide reutilizar un TXID USDT en cualquier solicitud GVR (sin distinguir mayúsculas).';
