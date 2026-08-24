# Request submission fix

Scheduling has been removed from the customer request flow. Customer requests must not require or submit a preferred/scheduled date. Existing saved drafts that contain `SCHEDULE` should be normalized to `STANDARD` on load. The submit-request client should surface a safe backend error message and log detailed diagnostics for developers.
