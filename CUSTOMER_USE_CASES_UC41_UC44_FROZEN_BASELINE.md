# Customer Use Cases UC-C41 to UC-C44 — Frozen Baseline

This baseline extends the customer functional catalogue from UC-C40 to UC-C44.

## UC-C41 — Optional Customer Identity Verification / KYC

Policy: **OPTIONAL BY DEFAULT**. Normal customer registration and ordinary household-service requests do not require KYC unless a separately approved service, organization, risk, or regulatory rule explicitly requires it.

Sub-use cases:
- UC-C41.1 View Identity Verification Status
- UC-C41.2 Determine Whether Verification Is Required
- UC-C41.3 Start Optional Identity Verification
- UC-C41.4 Select Identity Document Type
- UC-C41.5 Submit Identity Evidence
- UC-C41.6 Complete Verification Check
- UC-C41.7 Handle Manual Verification Review
- UC-C41.8 Display Customer Verification Indicator
- UC-C41.9 Handle Verification Expiry / Re-verification
- UC-C41.10 View Verification History

Core attributes:
`identity_verification_id, customer_id, verification_type, verification_level, status, provider_name, document_type, document_reference, document_expiry_date, verification_score, verification_started_at, verified_at, rejected_at, rejection_reason, expires_at, reverification_required, created_at, updated_at`.

Rules:
- Raw identity documents are not exposed to ordinary service providers.
- Providers see only permitted verification indicators/levels.
- Identity evidence requires strict access controls and retention rules.
- Failed KYC does not automatically imply fraud.

## UC-C42 — Manage Multi-Location Customer Requests

A multi-location request is a grouping/container. Each physical location still gets its own `service_request_id` and its own canonical FixIt Service Area, address snapshot, provider matching, schedule, cost, payment, and status.

Sub-use cases:
- UC-C42.1 Start Multi-Location Request
- UC-C42.2 Add Existing Saved Location / Address
- UC-C42.3 Add New One-Time Location
- UC-C42.4 Apply Common Service Details
- UC-C42.5 Customize Details Per Location
- UC-C42.6 Submit Multi-Location Request Group
- UC-C42.7 Track Multi-Location Group
- UC-C42.8 Compare Providers Per Location
- UC-C42.9 Select Different Providers Per Location
- UC-C42.10 Schedule Visits Per Location
- UC-C42.11 Cancel One Location
- UC-C42.12 Cancel Entire Multi-Location Group
- UC-C42.13 View Group Cost / Payment Summary

Core attributes:
`multi_location_request_id, customer_id, request_group_name, category_id, service_id, group_status, created_at, updated_at, child_service_request_id, location_id, address_id, sequence_no, preferred_date, preferred_time_from, preferred_time_to, assigned_provider_id, child_status`.

Rules:
- Matching is independent per child location.
- Providers are never assumed eligible in another location because they accepted one child request.
- Child requests may have different providers, schedules, statuses, costs, and payments.
- Group actions never erase child-level history.

## UC-C43 — Manage Business / Organization Customer Account

Optional organization customer model for businesses, property managers, offices, shops, resorts, and other organizations.

Sub-use cases:
- UC-C43.1 Create Organization Customer Account
- UC-C43.2 Manage Organization Profile
- UC-C43.3 Add Organization Locations / Properties
- UC-C43.4 Invite Organization Member
- UC-C43.5 Accept Organization Invitation
- UC-C43.6 Assign Organization Role / Permissions
- UC-C43.7 Create Organization Service Request
- UC-C43.8 Approve Organization Request
- UC-C43.9 Approve Organization Cost / Payment
- UC-C43.10 View Organization Requests
- UC-C43.11 Manage Organization Billing Details
- UC-C43.12 Remove / Disable Organization Member

Core attributes:
`organization_id, organization_name, organization_type, registration_number, billing_name, billing_email, billing_phone, billing_address_id, tax_reference, status, created_at, organization_user_id, user_id, organization_role, permissions, invited_at, joined_at, is_active, organization_location_id, organization_address_id, location_label`.

Rules:
- Personal customer accounts remain supported.
- Organization membership and roles are scoped separately from provider/admin roles.
- Requests record organization ownership separately from the acting/requesting user.
- Organization members only access permitted requests/locations.
- Historical ownership and approval events are preserved.

## UC-C44 — Manage Localization & Language Preferences

Core target languages for Maldives: **English and Dhivehi**.

Sub-use cases:
- UC-C44.1 Select Preferred Language
- UC-C44.2 Use English Interface
- UC-C44.3 Use Dhivehi Interface
- UC-C44.4 Set Fallback Language
- UC-C44.5 Localize Service Categories / Services
- UC-C44.6 Localize Notifications
- UC-C44.7 Localize Dates and Times
- UC-C44.8 Localize Currency / Number Display
- UC-C44.9 Set Communication Language Preference
- UC-C44.10 Translate Provider / Customer Message Where Supported

Core attributes:
`customer_id, preferred_language, preferred_locale, fallback_language, timezone, date_format, time_format, number_format, currency_display_format, content_language, translation_enabled, notification_language, created_at, updated_at`.

Rules:
- Localization never changes canonical IDs/status codes.
- Stored status enums remain language-neutral; display labels are localized.
- User-generated content remains stored in original form.
- Machine translation, if later used, is displayed as translated content while preserving the original.
- Notification templates use customer language preference when available.
- Timezone-aware display does not mutate stored timestamps.

## Updated Customer Baseline

The customer functional catalogue now spans **UC-C01 through UC-C44**.
