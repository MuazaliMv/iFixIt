# FixIt P0 Unified UI System

This document is the implementation reference for the Customer and Provider UI. The goal is one visual system across every screen while preserving role-specific information architecture and the frozen provider workflow.

## Source of truth

- `app/design-system.css` — exact color, spacing, radius, typography, shadow and control tokens.
- `app/unified-ui.css` — final cascade normalization for buttons, inputs, cards, typography, status, messaging, customer surfaces, provider surfaces and mobile navigation.
- Screen CSS may keep layout-specific rules, but reusable visual decisions must resolve to the tokens above.

## Universal buttons

### Primary
- `#2563EB`, hover `#1D4ED8`, active `#1A4CB8`
- white text, 16px / 700
- min-height 48px, padding 12px 24px, radius 12px
- for create/send/save/continue/start-work style primary workflow actions

### Secondary
- white background, `#172033` text, `#E4E9F1` border
- 16px / 600, min-height 48px, radius 12px
- hover `#F8FAFC` with primary border

### Ghost
- transparent, primary-blue text
- min-height 40px, radius 12px

### Danger
- `#B42318`, hover `#9E1F14`, active `#851A11`
- destructive actions only
- provider request Decline uses this variant

### Success
- `#168451`, hover `#0F6D42`, active `#0A5633`
- provider request Accept and Mark Complete use this positive semantic variant

Icon-only controls are at least 44x44 and require an accessible name.

## Universal inputs

Text input, select and textarea use:
- white surface
- `#172033` text
- 15px / 400
- 48px minimum control height
- 13px 14px padding
- radius 12px
- `#E4E9F1` border
- primary-blue focus border with a 3px blue ring

Textarea minimum height is 120px. File upload zones use `#F8FAFC`, dashed `#E4E9F1`, 12px radius and 32px padding.

## Universal cards

Standard card:
- white
- 20px padding
- 16px radius
- 1px `#E4E9F1` border
- shared card shadow

Compact card: 16px padding. Large card: 24px padding. Interactive cards use the shared hover shadow and -2px lift.

## Typography

Inter is the primary Latin UI font. Dhivehi retains Noto Sans Thaana / MV Boli / Tahoma with RTL direction.

- Display: 48px / 900; mobile 36px
- H1: 36px / 800; mobile 28px
- H2: 28px / 700; mobile 22px
- H3: 22px / 700; mobile 18px
- H4: 18px / 600; mobile 16px
- Body large: 16px / 400
- Body: 15px / 400
- Body small: 14px / 400
- Caption: 12px / 400
- Form label: 14px / 700

## Color semantics

Primary: `#2563EB`
Success: `#168451`
Warning: `#A15C00`
Danger: `#B42318`
Provider accent / stars / counters only: `#F59E0B`
Page: `#F4F7FB`
Surface: `#FFFFFF`
Alternate surface: `#F8FAFC`
Text: `#172033`
Secondary text: `#667085`
Border: `#E4E9F1`

Provider orange is an accent, not the primary interaction color.

## Customer navigation

Mobile: Home / My Requests / New Request / Messages / Profile.

The primary New Request icon stays visually prominent, but active/navigation colors are shared with the system.

## Provider navigation

Mobile: Today / Calendar / Listings / Messages / Menu.

Jobs are grouped under Today, Availability under Calendar, Services under Listings and Earnings under Menu.

Provider headers do not render the compact Customer Mode button. Log Out remains a distinct account action.

## Provider workflow

The visible provider lifecycle remains frozen:

`ACCEPTED → CONFIRMED → IN PROGRESS → COMPLETED → CUSTOMER CONFIRMED`

There is no visible SCHEDULED stage. Scheduling may remain internal operational metadata.

Contact remains locked until customer confirmation. CUSTOMER CONFIRMED is closed/read-only.

## Semantic provider actions

- Accept request → Success
- Decline request → Danger
- Schedule & Begin → Primary
- Start Work → Primary
- Mark Complete → Success
- Call / Message / Directions → Secondary

## Screen coverage

The universal final cascade covers Customer Home, the five-step Request Wizard, My Requests, Request Detail, Messages, Profile, Provider Today, Customer Work, Job Detail, Calendar, Availability, Listings & Pricing, Services, Messages, Earnings, Subscription, Menu and Setup.

Layout-specific CSS is allowed where necessary. Reusable color, radius, control, card and type decisions must not introduce a new visual language.

## QA acceptance checklist

Before a screen is accepted:

- all primary controls are blue and >=48px high
- all secondary controls use the standard outline system
- destructive controls are danger red
- completion controls are success green
- inputs are 48px / 12px with labels above
- cards are 16px with the shared border/shadow system
- typography follows the defined hierarchy
- semantic status colors are consistent
- provider orange is accent-only
- focus is visible and keyboard usable
- mobile controls meet minimum tap target size
- Customer and Provider feel like the same product
- provider privacy and frozen lifecycle behavior remain unchanged

## Migration policy

New UI work must use the token names in `design-system.css`. Existing screen-specific CSS is considered legacy compatibility CSS. When a legacy screen is touched for product work, move its reusable visual constants to tokens rather than adding another hardcoded visual value.
