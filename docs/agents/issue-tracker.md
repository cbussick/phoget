# Issue tracker: Linear

Use the Linear team `phoget` for this repository's issues and specs. The workspace identifier and actual team configuration must be verified after authentication; the MCP file only configures the connection. GitHub hosts the remote repository; pull requests are optional, not the default integration path.

Before the first tracker mutation in a session, resolve the workspace and team through Linear rather than inventing an identifier. Confirm that the statuses and labels below exist, or report what needs configuring. Resolve the team key before creating an issue branch.

## Required capability check

Before creating or updating tracker data, confirm that the loaded Linear tools support every required operation: reading and creating issues, setting parent relationships, applying labels and statuses, creating blocking relations, and adding comments.

If a required operation is unavailable, report the missing capability. Do not claim that an update succeeded, create duplicate objects, or silently replace native structure with prose.

## Lifecycle

Use Linear status as the sole issue lifecycle (configure these statuses in the team if missing):

- **Needs triage:** raw incoming work that has not been evaluated. Use an ordinary workflow status rather than the separate native Triage inbox; verify its configuration.
- **Backlog:** accepted work that is intentionally deferred. Record why; do not use Backlog for missing information or blockers.
- **Ready:** specification and execution routing are complete. Ready issues may still have unresolved native blockers.
- **In Progress:** claimed work with an active owner or an open implementation or review handoff.
- **Done:** the issue's declared outcome is complete and has evidence. Code work also requires local verification, human review, and an authorized merge into its target branch.
- **Canceled:** intentionally rejected, superseded, or abandoned work, with the reason recorded.
- **Duplicate:** a terminal issue with a native duplicate relation to its canonical issue.

`needs-info`, `human-required`, and `blocked-upstream` are routing labels defined in `triage-labels.md`; they are not lifecycle states.

## Reading issues and provenance

- Resolve a full Linear identifier or URL directly within the `phoget` team.
- Search the team when the user supplies a title or incomplete identifier; ask only when matches are genuinely ambiguous.
- Before acting, read the full description, comments, status, labels, assignee, parent and children, project, and blocking relations.
- Issue descriptions are the source of scope and acceptance criteria. Comments record discussion, decisions, blockers, claims, and verification evidence; they do not silently replace the description.
- Infer the issue's provenance and next action from native structure: Needs triage identifies incoming work; a parent spec is a planning container; its leaf children are implementation tickets; Wayfinder labels identify maps and decision tickets. Do not add a generic provenance label.

## Specs, tickets, and Ready certification

- Spec publication creates one top-level spec issue in Ready. Its description is the canonical spec. The parent is planning structure, not an implementation ticket.
- Ticket publication creates one Ready child issue per approved tracer-bullet ticket. The approved shaping workflow certifies these tickets as Ready; they do not pass through triage.
- Create all child issues first, then add native blocking relations in a second pass after real issue identifiers exist.
- Do not invent dependencies that were not in the approved ticket breakdown.
- Do not close or otherwise modify the parent spec issue while publishing tickets.

A Ready implementation issue has bounded scope, clear acceptance criteria, sufficient context and access, a verification method, no unresolved decisions, and an explicit agent or human execution route. It may be certified by:

- the user explicitly;
- ticket publication after the user approves the spec and ticket breakdown; or
- triage after the user confirms its recommendation.

User-approved spec publication and Wayfinder workflows certify their planning containers and decision tickets as Ready for their declared next action; those issues never enter the implementation frontier. An agent browsing Needs triage or Backlog may recommend readiness but must not promote arbitrary work without one of these approvals. If a Ready issue violates its applicable contract, stop and surface the missing condition.

Linear Projects are optional. Create or use a Project only when dates, milestones, progress reporting, documents, updates, multiple delivery waves, or cross-team coordination add real value. If a Project is used, add the canonical spec issue and its children to it; do not maintain a second independently edited copy of the spec.

## Implementation frontier and claiming

An implementation ticket is on the frontier when it is:

- in Ready;
- a leaf implementation issue, not a parent spec, Wayfinder map, or decision ticket;
- free of `needs-info`, `human-required`, and `blocked-upstream`; and
- unblocked because every native blocking prerequisite is Done.

A Canceled blocker does not satisfy its dependent issue; reassess the dependent issue before dispatch. Assignment is not a frontier signal because all local agent sessions authenticate as the same Linear user.

Prefer an issue explicitly named by the user. A generic "take the next frontier ticket" instruction is safe only when the user dispatches one session at a time; give concurrent sessions explicit issue identifiers.

Before changing code, re-read the issue and claim it by:

1. assigning the current Linear user if the implementation process requests assignment;
2. moving the issue to In Progress;
3. adding a concise comment with the Pi session ID from `PI_SESSION_ID`, branch name, and claim timestamp; and
4. creating a branch containing the Linear issue key.

The status and comment form a human-dispatched soft claim, not an atomic lock. Skip In Progress work unless the user explicitly names it for continuation or recovery.

## Recovery

A dead session does not automatically return an issue to Ready. Inspect its branch, local checks, blockers, and remaining scope first. Record a handoff that identifies completed work, remaining work, and the branch. Then either continue the existing In Progress work or return the issue to Ready after its Ready contract is restored.

## Completion

Follow the development workflow for implementation, verification, human review, and human-authorized integration. For a child implementation issue, the qualifying merge is into the spec integration branch. For a standalone issue, it is the merge into `main`; for a parent spec, it is the final verified merge of the integration branch into `main`. Wait for explicit human authorization before each merge.

After the qualifying merge and successful push, add one concise final comment containing acceptance, verification, and review evidence plus the branch and commit reference. Then check Linear and move the issue to Done if it is not already Done.

Keep parent auto-close and sub-issue auto-close disabled. A spec parent moves to Done only after the completed integration branch is verified, merged into `main` with human authorization, and pushed; closing a parent must not mark unfinished tickets complete.

## Triage and Backlog

Triage is only for raw incoming bugs and requests in Needs triage. Specs and tickets created by spec publication and ticket publication are already Ready and must not be triaged again.

Translate Matt Pocock's canonical state and category roles through `triage-labels.md`.

Backlog is a local product-management state outside Matt Pocock's triage state machine. Triage discovery ignores Backlog unless the user explicitly selects an issue for reconsideration. Move a deferred issue to Needs triage for reassessment, or deliberately shape it through a shaping process and publish resulting tickets to Ready.

Git branches are not an incoming triage surface.

## Wayfinding operations

Used by Wayfinder:

- **Map:** one Ready parent issue labelled `wayfinder:map`. Its description contains Destination, Notes, Decisions so far, Not yet specified, and Out of scope.
- **Decision ticket:** one Ready child issue of the map, labelled with exactly one of `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- **Blocking:** native Linear blocking relations between decision tickets.
- **Agent frontier:** Ready child decision issues free of `needs-info`, `human-required`, and `blocked-upstream` whose blocking prerequisites are Done.
- **Human frontier:** Ready child decision issues with `human-required`, without `needs-info` or `blocked-upstream`, whose blocking prerequisites are Done.
- **Agent claim:** apply the session claim protocol and move the decision ticket to In Progress before doing any work.
- **Resolve:** add the full answer as a comment, move the decision ticket to Done, then add only a one-line gist and issue link under Decisions so far in the map description.

The map is an index, not a second copy of its decisions. Wayfinder produces decisions and hands off to spec publication; it does not implement the resulting feature.
