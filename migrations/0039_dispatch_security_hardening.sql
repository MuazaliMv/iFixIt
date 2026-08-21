-- Keep dispatch internals callable only by the database/service gateway.
ALTER FUNCTION public.dispatch_tier_for_urgency(TEXT) SET search_path=public;
ALTER FUNCTION public.dispatch_window_for_tier(TEXT) SET search_path=public;
REVOKE ALL ON FUNCTION public.initialize_request_dispatch() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_request_dispatch_terminal_state() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_and_secure_provider_response() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_request_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_request_dispatch_terminal_state() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_and_secure_provider_response() TO service_role;
