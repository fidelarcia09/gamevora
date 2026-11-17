-- Permit proof submission and clearing legacy expiration timestamps.
CREATE OR REPLACE FUNCTION public.validate_gvr_usdt_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
    if old.proof_path is null and new.proof_path is not null then
        if old.payment_method = 'USDT'
           and (new.payment_txid is null
                or length(btrim(new.payment_txid)) < 10
                or length(btrim(new.payment_txid)) > 200) then
            raise exception 'Debes introducir un TxID válido.'
                using errcode = 'check_violation';
        end if;

        if old.payment_method = 'SALDO_MOVIL'
           and (new.payment_sender_phone is null
                or length(regexp_replace(new.payment_sender_phone, '[^0-9]', '', 'g')) < 8
                or length(regexp_replace(new.payment_sender_phone, '[^0-9]', '', 'g')) > 15) then
            raise exception 'Debes introducir el número desde el que realizaste la transferencia.'
                using errcode = 'check_violation';
        end if;
    end if;

    -- El vencimiento solo puede quedar vacío; nunca se permite asignar uno nuevo.
    if new.expires_at is distinct from old.expires_at and new.expires_at is not null then
        raise exception 'Las solicitudes GVR no tienen vencimiento.';
    end if;

    return new;
end;
$function$

