# Development workflow

## Isolated work

Keep the primary checkout on `main` for integration, not task edits. Make each code, configuration, or documentation change on a dedicated branch in a worktree under `.worktrees/` in this repository. Create the branch before editing files. Keep one task per branch and worktree; continue an existing worktree only when its branch matches the requested task.

For a standalone issue, branch from `main`. For a spec with sub-issues, create a spec integration branch from `main`; branch each child from that integration branch. Merge completed child work into the integration branch only on the human's explicit instruction. The final integration branch targets `main`.

Use Linear's generated branch name for an issue, or a short task name otherwise. Name the worktree after the issue key or task:

```sh
git worktree add .worktrees/<issue-key-or-task> -b <branch-name> <base-branch>
```

For an existing branch, omit `-b`. Run task edits, checks, and commits in the task worktree. Never use the primary checkout for task work. If the primary checkout already has changes, preserve them and ask before integrating.

After creating or entering the task worktree, follow [Development and testing](../development.md) to bootstrap its isolated runtime (`node scripts/worktree.mjs bootstrap`), set up its databases, and run dev/test commands through `node scripts/worktree.mjs run …`. Do not run checks against another worktree's database or ports.

## Hand off for human review

Commit only task-related files. Run every applicable local check (see `docs/development.md`), review the full diff against the issue or request, and report the change, verification results, and any risks. Local checks are not remote CI. Address review feedback on the same task branch.

Stop after the handoff. A green check or an approval of the diff alone is not permission to merge or push `main`. Wait for the human to explicitly authorize integration of the named branch.

## Integrate only when authorized

Before integrating, confirm the named branch, intended target, and that the target checkout has no unrelated changes. Fetch the remote and bring local `main` up to date without discarding work. For a child issue, update its spec integration branch first. If the target moved, integrate the current target into the task branch and rerun applicable checks on the combined result; resolve conflicts there or stop and report them. Git reports conflicts when an integration cannot be resolved automatically, but it can merge semantically incompatible changes without reporting a conflict. Review and test the combined result even when Git reports no conflict.

Integrate only when either the applicable checks pass on the combined result, or the human explicitly authorizes merging the named branch into the named target despite the reported failures. For a failed-check override, report which checks failed, the observed errors, and any unverified scope before requesting or interpreting authorization; a general request to merge or an earlier approval is not an override. Record the human's explicit acceptance of those failures in the handoff. An override does not waive review of the combined diff, unrelated-change checks, or push safeguards.

Once the check gate is satisfied or explicitly overridden and the requested integration is still appropriate, merge the task branch into its target locally. Before pushing `main`, verify that it contains only approved commits. Push normally; never force-push `main`. A rejected push means the remote moved: fetch, reconcile, and reverify before retrying. If that changes the approved result materially, ask for renewed approval. Do not assume a successful local merge guarantees a successful push.

After a child branch is integrated, keep the spec integration branch until the human authorizes its final merge into `main`. After a successful merge and push, follow `issue-tracker.md` for issue completion, then remove merged worktrees and branches and prune stale worktree records. Preserve worktrees with unmerged or uncommitted work.
