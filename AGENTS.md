ALWAYS USE a rubric to evaluate ideas and decisions.

Principles we MUST follow when writing code:

- Simplicity as a scaling strategy (dumb, explicit, predictable components)
- Minimal moving parts
- Maintainability
- Code as documentation (comments should only be used for non-obvious decisions
  or for JSDoc).
- Functions should fail fast.
- Files and modules must not be god files. Modularization is encouraged where it
  makes sense and makes the codebase maintanable.
- As a general rule, files should not be more than 70 lines long. If we have to
  add comments to subdivide a file, that's a sign it should be split into
  multiple files.

Use bun. Use context7 when needing to read up to date documentation from packages. Never assume a bug or fix, always test thing isolated first. NO guess work. Use sentence case, no title case.

---

Core user personas & access permissions

| Persona | Access Scope | Primary objective |
| -- | -- | -- |
| Executive | Personal leads, personal sales, personal tickets. | High-velocity calling and accurate data entry. |
| Supervisor | Data for their assigned team only. | Real-time floor monitoring and team coaching. |
| Back-office | Branch-wide validation queue (sales pending approval). | Auditing sales via call recordings and status updates. |
| Sales manager | All data within their specific branch. | Strategy configuration (scripts, products) and overrides. |
| Logistics | Warehouse and inventory records only. | Stock entry, serial number tracking, and hardware audits. |
| HR (RRHH) | All personnel and attendance records. | Employee lifecycle management and geolocation auditing. |
| Administrator | Global system settings and data ingestion. | CSV lead uploads, number cleaning, and IT auditing. |
| Superuser | Unrestricted access. | System-wide emergency maintenance. |

Functional modules & operational requirements

- HR & attendance management
*   All attendance actions must capture GPS coordinates.
*   Agents must toggle statuses: *Available, Feedback, Break, Services, Training, or Unavailable*.
*   Agents must be able to leave comments for HR (e.g., explaining tardiness).
*   Dedicated history of employee hire dates and termination dates ("bajas").

Lead ingestion & assignment engine
*   The system must accept massive, non-segmented CSV uploads.
*   Backend pre-processing to filter invalid numbers before agents see them.
*   A lead is only assigned when an agent is "Available" and their "Buffer" is low.
*   Once Branch A claims a company (RUC), that organization and all its contacts are permanently locked to Branch A.
*   Automated pull model (e.g., maintain 5 active leads in backlog) up to a daily maximum.

B2B entity mapping
*   The system must distinguish between a Company (RUC) and the multiple People (DNI) working there.
*   Executives must see the full interaction history of an Organization, including calls made by other agents or from the sister branch, to prevent customer annoyance.
*   Leads contacted within a configurable window (e.g., last 24 hours) cannot be re-assigned.

VoIP integration
*   VoIP audio must survive browser reloads, tab crashes, and navigation between CRM pages.
*   Every VoIP call must be automatically recorded and linked to the lead interaction.
*   For non-VoIP calls, the system must force a manual recording upload before the sale can progress.

The circular sales workflow (for "nota de cargo")
*   Full-page form for product selection and document uploads (No modals).
*   Each service (Mobile, Fiber) generates its own Charge Note; notes can be duplicated for multi-service clients.
*   If back-office rejects a sale, the **original record** returns to the Executive.
*   The Executive UI must red-highlight specific fields flagged by the reviewer and display reviewer notes.
*   When a file is replaced during a fix, the previous version is preserved for auditing.

Logistics & Inventory Integrity
*   Selecting a serial number (S/N) for a sale reserves that unit.
*   Soft-locks must expire (e.g., 30 mins) if the sale isn't submitted, returning stock to the pool.
*   Sales cannot be submitted without an available, locked hardware unit.

Administrative autonomy (self-sufficiency)
*   Sales Managers must be able to edit call script templates without code changes.
*   Managers control pricing, plan subtypes (Mono/Duo/Trio), and MB/data values.
*   Configurable limits for call attempts and time-in-stage alerts.

3. Data Flows

1.  Lead flow: Admin Upload -> Global Pool -> Atomic Claim (Branch Lock) -> Executive Backlog -> Interaction Log.
2.  Sales flow: Interaction -> Soft-Lock Stock -> Charge Note Submission -> Validation Tray (Back-Office) -> [Approved | Rejected (Loop to Exec) | Dropped].
3.  Audit flow: Every transition (Executive -> Back-Office -> Executive) logs a timestamped "Stage Change" for SLA math.

4. Required screens (titles and names are unofficial, you can change them for better ones if you decide)

*   authentication: Login, Passkey Setup, and Recovery.
*   executive sales: Lead queue, Global Timeline, VoIP controls, and Script display.
*   sales registration page: Multi-step linear form for service data and document uploads.
*   rejection resolution view: View-only form with red-highlighted errors and specific reviewer feedback.
*   back-office validation tray: Queue of pending sales with integrated audio player for verification.
*   post-sales ticket hub: Dashboard for tracking scaled client issues and resolutions.
*   supervisor command center: Grid view of active agents with real-time status indicators (available/on-call/break).
*   management config portal: CRUD interfaces for product catalog, script templates, and outcome dropdowns.
*   warehouse dashboard: Inventory entry, serial number status tracking, and stock request management.
*   HR personnel heatmap: Attendance logs, geolocation mapping, and employee records.
*   Admin data center: CSV processing status, data injection logs, and system-wide audit tables.

5. Evaluation criteria

*   Can an executive log an interaction in under 3 clicks?
*   Can a manager see exactly why a sale was rejected and how long the "fix" took?
*   Can Branch A ever see a lead that Branch B has claimed? (Target: Zero leakage).
*   Can a Sales Manager update a plan price in under 60 seconds without calling IT?

--

the following document describes the complete user experience, screen requirements, and interaction flows for the mission-critical telesales crm. the system is designed to provide a continuous, high-velocity environment for agents while maintaining strict control and visibility for management.

1. user personas and accessibility

executive: handles assigned leads, interactions, and sales entry. has access only to personal data.
supervisor: monitors a specific team of executives. has access to team metrics and approval requests.
back-office: validates sales submitted by executives. has access to the branch-wide validation queue.
sales manager: configures system rules, scripts, and products. has access to all branch data and overrides.
logistics: manages physical hardware and serial numbers. has access to warehouse inventory only.
hr: manages employee lifecycle and attendance. has access to personnel records and geolocation data.
admin: manages system integrity and data ingestion. has access to csv uploads and global audit logs.

2. authentication and security experience

login screen: entry point for all users requiring email and password.
multi-factor authentication: secondary verification via totp app or physical passkey for high-privilege roles.
security setup: a dedicated flow for users to register their passkeys and download emergency recovery codes.
role-based redirection: the system automatically detects the user role and branch and redirects them to their specific dashboard.

3. the executive workspace (sales cockpit)

persistent sidebar: a navigation bar on the left that collapses to icons to maximize screen space.
status bar: a top header where executives toggle between available, feedback, break, and training states.
attendance timer: a real-time counter showing how long the user has been in their current state.
lead buffer: a side panel showing the current queue of 5 assigned leads. as one is completed, a new one is pulled automatically.
manual lead search: a tab to search for leads by dni or ruc. if a lead is found but owned by another branch, a warning is shown.
global interaction timeline: a central feed showing every historical call and note made to the organization, regardless of which agent or branch made it.
voip call bar: an interface provided by a browser extension that floats over the crm, allowing for mute, hangup, and transfer without losing context.
mandatory script viewer: a scrollable area that renders the specific sales script for the selected campaign, automatically including the customer's name and details.
interaction logger: a form to select the call outcome, add notes, and schedule callbacks with a date-time picker.

4. sales registration and circular workflow

registration page: a linear, multi-step page triggered when an interaction is marked as a sale. no pop-ups or modals are used.
product selection: dropdowns to choose the plan type (fijo or movil), subtype (mono, duo, trio), and mbs.
inventory soft-locking: the executive selects a serial number from available stock. the system reserves this unit for 30 minutes while the form is being filled.
documentation uploader: a drag-and-drop area for uploading identity documents and proof of payment.
voip recording link: the system automatically attaches the interaction recording. for manual calls, the executive must upload the file.
rejection fix view: if the back-office rejects a sale, the executive opens this view. flagged fields are outlined in red with the reviewer's specific notes visible.
file versioning: when an executive updates a document to fix a rejection, the system saves the new version but preserves the old one for audit purposes.

5. the supervisor and management experience

team floor view: a real-time grid showing every agent in the team. agent cards change border color based on status (green for calling, yellow for idle, gray for offline).
live metric cards: top-level counters showing active agents, sales today, and pending rejections for the team.
approval alerts: a notification feed for special rate requests or login anomalies (e.g., blocked geolocation).
agent performance profile: a detailed view showing an executive's attendance heatmap, commission estimates, and historical sales log.
configuration portal: a management suite where sales managers create and edit call scripts and update product prices or bandwidth values.

6. back-office and validation tray

validation queue: a list of all sales submitted in the branch, prioritized by the oldest submission first.
review interface: a single-view page with the sale data on the left and the interaction recording player on the right.
status editor: back-office agents are the only users who can move a sale to approved, rejected, or dropped.
rejection logging: a tool for reviewers to click on specific fields in the sale form and attach a reason for rejection.

7. logistics and warehouse management

stock entry: a dedicated screen for logistics to scan or type in new serial numbers, models, and quantities.
inventory audit: a searchable grid of all hardware units showing their current state (available, locked, or sold).
stock recovery: a view to manage units that were locked but never sold, allowing logistics to release them back to the pool manually.

8. hr and administrative administration

personnel directory: a master list of all active and inactive employees with hire and fire dates.
attendance geolocation map: a visual report for hr showing where every agent was located when they clocked in for the day.
csv ingestion center: an admin-only area to upload lead batches. it shows a progress bar and a summary of valid versus blocked numbers.
global audit log: a searchable table recording every significant action in the system, including who changed a sale status, what the change was, and the ip address used.

9. critical interaction flows

the lead claim flow: an executive sets their status to available. the system checks if their backlog is below the limit, finds a new lead in the pool, checks organization ownership, tags the branch, and pushes the lead to the executive's view.
the sales fix flow: a back-office agent flags a file as blurry. the executive receives a notification, opens the existing charge note, sees the red-highlighted field, uploads a new file, and resubmits. the system logs the time spent in the rejected stage.
the inventory lock flow: an executive selects a phone model. the system locks the specific serial number. if the executive closes the browser, a background process releases the lock after 30 minutes.
the voip persistence flow: the user navigates from the lead search page to the registration page. the browser extension maintains the call audio and controls throughout the transition, ensuring the customer is never disconnected.
