IMPORTANT: USE MY EXISTING PORTIQ PROJECT AS THE SOURCE OF TRUTH.

I have an existing PORTIQ — Smart Port Yard Optimizer project created in another Figma account.

EXISTING PROJECT / LIVE DESIGN LINK:

[PASTE MY OLD FIGMA LINK HERE]

I want you to use this existing project as the PRIMARY DESIGN REFERENCE.

DO NOT rebuild PORTIQ from scratch.

DO NOT redesign the dashboard.

DO NOT simplify the application.

DO NOT replace the 3D yard with a generic illustration.

DO NOT change the existing visual design unnecessarily.

DO NOT change the existing information architecture.

DO NOT remove existing screens.

DO NOT replace existing components with generic components.

DO NOT create "Under Construction" pages.

DO NOT change the existing colors, typography, spacing, layout, navigation, cards, charts, 3D yard, container inspector, crane visualization, optimization interface, or analytics unless required for the new login flow.

The goal is:

EXISTING PORTIQ DESIGN
+
NEW DEMO LOGIN SYSTEM

Everything else should remain visually and functionally as close to the existing project as possible.

==================================================
PRIMARY CHANGE REQUIRED
==================================================

Modify ONLY the authentication/login experience.

I need TWO separate ways to enter PORTIQ.

OPTION 1 — NORMAL LOGIN

Keep a standard login system with:

USER ID

PASSWORD

Button:

SIGN IN

Below the input fields, visibly display:

DEMO CREDENTIALS

ID: user1

Password: 12345

Also provide:

USE DEMO CREDENTIALS

Clicking this should automatically populate:

ID = user1

Password = 12345

The user can then click SIGN IN.

==================================================
OPTION 2 — AUTO DEMO LOGIN
==================================================

This is VERY IMPORTANT.

Create a completely separate and highly visible demo access option.

Button:

ENTER DEMO MODE — NO LOGIN REQUIRED

Supporting text:

Instant access to the PORTIQ operations dashboard.
No ID or password required.

This must be a real separate entry path.

The user must NOT have to enter:

ID

Password

or any other credentials.

When the user clicks:

ENTER DEMO MODE — NO LOGIN REQUIRED

immediately navigate to the existing PORTIQ main dashboard.

Do not show another login screen.

Do not request credentials.

Do not show an authentication error.

Do not require a password.

Do not require an ID.

==================================================
LOGIN SCREEN LAYOUT
==================================================

Preserve the visual style of the existing PORTIQ design.

Add the following structure to the existing login screen:

PORTIQ

SMART PORT YARD OPTIMIZER

Welcome back

[ USER ID ]

[ PASSWORD ]

[ SIGN IN ]

DEMO CREDENTIALS

ID: user1
Password: 12345

[ USE DEMO CREDENTIALS ]

---------------- OR ----------------

[ ENTER DEMO MODE — NO LOGIN REQUIRED ]

Instant demo access • No credentials required

The AUTO DEMO LOGIN button must be clearly visible and noticeable.

It must not be hidden in:

menus
settings
tooltips
documentation
secondary pages

It must be visible directly on the login screen.

==================================================
IMPORTANT: PRESERVE EXISTING APPLICATION
==================================================

After login/demo access, preserve the existing PORTIQ application.

Do NOT rebuild the following unless necessary:

- Sidebar
- Header
- Overview
- KPI cards
- 3D container yard
- Container blocks
- Container IDs
- RTG cranes
- Crane routes
- Container inspector
- Blocking container visualization
- Optimization modal
- Retrieval route
- Search
- Filters
- Map controls
- Analytics
- Container management
- Crane operations
- Optimization Center
- Tasks
- Alerts
- Reports
- Settings
- Notifications
- Charts
- Tables
- Existing interactions

The existing PORTIQ dashboard is already approved as the design.

Your task is to EXTEND it, not redesign it.

==================================================
EXISTING CORE DEMONSTRATION FLOW
==================================================

Preserve the existing workflow:

SEARCH CONTAINER
→ LOCATE CONTAINER IN 3D YARD
→ SELECT CONTAINER
→ IDENTIFY BLOCKING CONTAINERS
→ OPTIMIZE RETRIEVAL
→ PREVIEW CRANE ROUTE
→ APPLY OPTIMIZATION
→ MONITOR RETRIEVAL

The demonstration container remains:

CNU-48291

Location:

BLOCK B03
BAY 17
ROW 04
LEVEL 05

Assigned crane:

CRANE-04

Optimized retrieval:

6m 24s

Current plan:

8m 42s

Time saved:

2m 18s

==================================================
PROTOTYPE REQUIREMENTS
==================================================

Make sure these prototype interactions work:

NORMAL LOGIN:

user1 + 12345
→ existing PORTIQ dashboard

USE DEMO CREDENTIALS
→ automatically populate user1 / 12345

AUTO DEMO LOGIN:

ENTER DEMO MODE — NO LOGIN REQUIRED
→ immediately open existing PORTIQ dashboard

SEARCH:

CNU-48291
→ focus existing 3D yard on CNU-48291

CONTAINER:

Click CNU-48291
→ existing container inspector

OPTIMIZE:

Click OPTIMIZE RETRIEVAL
→ existing optimization modal

PREVIEW ROUTE
→ existing crane route visualization

APPLY OPTIMIZATION
→ existing optimized state

==================================================
DESIGN PRESERVATION RULE
==================================================

PRIORITY ORDER:

1. Preserve existing PORTIQ design.
2. Preserve existing components.
3. Preserve existing prototype interactions.
4. Add the new login functionality.
5. Only modify elements required for authentication/demo access.

If something in the existing design conflicts with this request, do NOT redesign the entire application.

Make the smallest possible changes necessary.

The final result should look like:

THE SAME PORTIQ PROJECT

but with an improved login screen containing:

NORMAL LOGIN

+

VISIBLE DEMO CREDENTIALS

+

ONE-CLICK AUTO DEMO LOGIN WITHOUT CREDENTIALS.

==================================================
FINAL QUALITY CHECK
==================================================

Before finishing, verify:

✓ Existing PORTIQ visual design preserved
✓ Existing 3D yard preserved
✓ Existing dashboard preserved
✓ Existing sidebar preserved
✓ Existing navigation preserved
✓ Existing charts preserved
✓ Existing container workflow preserved
✓ Existing optimization workflow preserved
✓ Normal login works
✓ Demo credentials are visible
✓ ID = user1
✓ Password = 12345
✓ USE DEMO CREDENTIALS works
✓ ENTER DEMO MODE — NO LOGIN REQUIRED works
✓ Auto Demo Login requires NO credentials
✓ Auto Demo Login goes directly to dashboard
✓ No page says "Under Construction"
✓ No major existing feature was removed
✓ No unnecessary redesign was performed

IMPORTANT:

Treat the linked existing PORTIQ project as the source of truth.

DO NOT recreate the application from the text description.

MODIFY THE EXISTING DESIGN.