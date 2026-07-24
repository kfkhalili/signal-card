-- Remove the RPC that existed only for the retired handle-new-user Edge
-- Function. Profile provisioning now happens through
-- public.handle_auth_user_created() and the on_auth_user_created trigger.
--
-- Do not use CASCADE: an unexpected dependency must stop this migration so it
-- can be investigated rather than removed implicitly.

BEGIN;

DROP FUNCTION IF EXISTS public.handle_user_created_webhook(jsonb);

COMMIT;
