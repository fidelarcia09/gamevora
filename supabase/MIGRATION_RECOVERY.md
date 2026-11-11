# Supabase migration recovery notes

## Production source of truth

- Supabase project: `gsuhzcavghsiolmipnzi`
- Active game top-up provider: **RechargeGames** (`rechargegames`)
- Next Level is legacy only. Do not re-enable its catalog, order, or payment logic.

## Important repository/production mismatch

The production Supabase migration history contains these RechargeGames migrations, but the checked-in `supabase/migrations` directory did not contain their SQL files when audited:

- `20261031141146_rechargegames_public_catalog_readonly`
- `20261031144218_migrate_manual_game_orders_to_rechargegames`
- `20261031144608_retire_nextlevel_database_helpers`
- `20261031145057_configure_rechargegames_manual_payment_prices`

The repository currently contains older manual-payment migrations dated `202610260001` and `202610260002`; those historical files still refer to Next Level. Do not edit already-applied historical migrations to make them look current, and do not replay them against production.

The production migration history also contains additional migrations not represented in this repository. Therefore, this repository is not yet a complete reproducible snapshot of the production database.

## Safe recovery rule

Do not invent replacement SQL from migration names. The migration list records versions and names, not the original SQL bodies. Before rebuilding migration history for a fresh environment, recover the exact SQL from the original source/backup or create and verify a separately reviewed baseline snapshot from the live schema. Never run a guessed migration against production.

## Current RechargeGames Edge Function fixes

The deployed source and matching repository files for these functions were updated and verified:

- `rechargegames-crear-pedido`: corrected player/game-key normalization and changed reservation/final-save owner filters to the order's actual `user_id`, after the existing owner-or-support-admin authorization check.
- `rechargegames-consultar-pedido`: keeps owner access and permits cross-user lookup only after `is_support_admin()` returns true for the caller's JWT.

No product rows, prices, existing orders, payment records, RLS policies, or webhook logic were changed as part of these fixes.
