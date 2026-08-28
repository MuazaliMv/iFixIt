# FixIt Maldives — Complete Application Suite Implementation Contract

This branch adopts the user-supplied Complete Application Suite GUI as the visual and interaction source of truth.

## Non-negotiable behavior

- Keep the existing production authentication/session implementation; do not simulate login or introduce demo users.
- One permanent identity may access Customer, Provider, and Admin workspaces according to server-authorized capabilities.
- Workspace changes are explicit user actions and must continue to use the existing SSOT permission boundary.
- Customer addresses, service requests, photos, provider applications, geographic areas, and audit logs must come from persistent backend data, never in-memory prototype arrays.
- Provider application submission creates a pending review state. It must never auto-approve the provider.
- Rule 23 applies to provider coverage and service delivery geography: disabled service areas cannot be used for new coverage or requests.
- Customer request media remains visible to authorized providers/admins through the existing attachment pipeline.
- Mobile controls use at least 44px touch targets and role-specific fixed navigation.

## Visual tokens

- Primary: #0ea5e9
- Success: #10b981
- Warning: #f59e0b
- Destructive: #f43f5e
- Primary mobile layout follows the supplied 410px reference while remaining responsive on larger screens.

## Implementation approach

The supplied HTML is a visual/interaction reference only. Its demo arrays and simulated mutations are intentionally not copied into production. Existing working Next.js/Supabase/API flows are preserved and presented using the supplied GUI.