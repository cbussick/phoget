# Matt Pocock triage roles in Linear

Matt Pocock's skills speak in canonical triage roles. This repository translates those roles into Linear statuses and labels; the installed skills remain unchanged.

`issue-tracker.md` is authoritative for Linear lifecycle, Ready certification, and frontier rules. This document only translates Matt Pocock's triage vocabulary.

## Triage role mapping

| Canonical role    | Linear representation                                      |
| ----------------- | ---------------------------------------------------------- |
| `needs-triage`    | Needs triage without `needs-info`.                         |
| `needs-info`      | Needs triage with `needs-info`.                            |
| `ready-for-agent` | The implementation frontier defined in `issue-tracker.md`. |
| `ready-for-human` | Ready with `human-required` and without `needs-info`.      |
| `wontfix`         | Canceled, with the reason recorded in a comment.           |

When a Matt Pocock skill says to apply, remove, or inspect a triage role, use the table and referenced frontier to determine the single canonical state role. `human-required` may independently record a known execution route while an issue is in Needs triage. Once work is claimed, Linear's In Progress and Done lifecycle supersedes its triage routing role.

## Backlog

Backlog has no canonical Matt Pocock triage role. Follow the local deferral and reassessment rules in `issue-tracker.md`.

## Category labels

Apply exactly one stable category label when triaging a raw request:

| Canonical category | Linear label  | Meaning                         |
| ------------------ | ------------- | ------------------------------- |
| `bug`              | `bug`         | Existing behavior is broken.    |
| `enhancement`      | `enhancement` | New behavior or an improvement. |

Planning containers and Wayfinder decision tickets do not require a category label merely for uniformity.

## Routing labels

- `needs-info` means triage is waiting for the reporter to answer one specific question recorded in the newest comment. When the reporter answers, remove the label, leave the issue in Needs triage, and reassess it. Internal design decisions are blocking decision issues instead.
- `human-required` means a human must perform the work itself. It does not mean that an otherwise agent-executable issue merely needs an answer. It may coexist with `needs-info` when the eventual executor is already known; retain it after the answer if the work still requires a human.

### External upstream dependencies

`blocked-upstream` is an ordinary routing label for work waiting on a dependency outside this Linear workspace. It coexists with a category such as `bug` or `enhancement` and leaves lifecycle status unchanged.

- Before applying it, record the upstream issue URL and a concrete unblock condition in a comment. For package dependencies, require the needed published release, not merely a merged change.
- Exclude labelled issues from agent dispatch; the frontier rules in `issue-tracker.md` also exclude them from human execution.
- Remove it after verifying the unblock condition, and record the evidence (including the available package version when applicable). Reassess the remaining frontier conditions before dispatch.
- Use native blocking relations for dependencies within this workspace. An external issue link is provenance, not a native blocking relation.

## Delivery and relations

Follow `issue-tracker.md` for Ready, claiming, completion, cancellation, and duplicate relations. Only a Canceled triage request represents canonical `wontfix`.

## Wayfinder labels

Wayfinder labels identify issue purpose rather than lifecycle or triage state:

- `wayfinder:map`
- `wayfinder:research`
- `wayfinder:prototype`
- `wayfinder:grilling`
- `wayfinder:task`

The four decision-ticket labels are mutually exclusive. `wayfinder:map` applies only to the parent map issue.
