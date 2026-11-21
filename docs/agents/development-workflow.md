# Development workflow

## Isolated work

Keep the primary checkout on `main` for integration, not task edits. Make each code, configuration, or documentation change on a dedicated branch in a worktree under `.worktrees/` in this repository. Create the branch before editing files. Keep one task per branch and worktree; continue an existing worktree only when its branch matches the requested task.

For a standalone issue, branch from `main`. For a spec with sub-issues, create a spec integration branch from `main`; branch each child from that integration branch. Merge completed child work into the integration branch only on the human's explicit instruction. The final integration branch targets `main`.

Use Linear's generated branch name for an issue, or a short task name otherwise. Name the worktree after the issue key or task:

```sh
git worktree add .worktrees/<issue-key-or-task> -b <branch-name> <base-branch>
```

For an existing branch, omit `-b`. Run task edits, checks, and commits in the task worktree. Never use the primary checkout for task work. If the primary checkout already has changes, preserve them and ask before integrating.

For runtime work, follow [Development and testing](../development.md) to bootstrap the worktree's isolated runtime, set up its databases, and run dev/test commands through `node scripts/worktree.mjs run …`. Static checks that do not need ports or databases can run directly in the worktree.

## Hand off for human review

Commit only task-related files. Select and run the [checks for the change](../development.md#choose-checks-for-the-change), then review the full diff against the request. Report what passed, what did not run, and any remaining risk. Local checks are not remote CI. Address review feedback on the same task branch.

Stop after the handoff. A green check or an approval of the diff alone is not permission to merge or push `main`. Wait for the human to explicitly authorize integration of the named branch.

## Integrate only when authorized

Before integrating, confirm the named branch, intended target, and that the target checkout has no unrelated changes. Fetch the remote and bring local `main` up to date without discarding work. For a child issue, update its spec integration branch first. If the target moved, integrate the current target into the task branch and rerun applicable checks on the combined result; resolve conflicts there or stop and report them. Git reports conflicts when an integration cannot be resolved automatically, but it can merge semantically incompatible changes without reporting a conflict. Review and test the combined result even when Git reports no conflict.

Integrate when the selected checks pass on the combined result. If a selected check failed, is still running, or was not run, first report the affected checks, any observed errors, and what remains unverified. The human may then explicitly authorize merging the named branch into the named target with those gaps. A general request to merge or an earlier approval is not an override. Record the authorization in the handoff. An override does not waive review of the combined diff, unrelated-change checks, or push safeguards.

Once the check gate is satisfied or explicitly overridden and the requested integration is still appropriate, merge the task branch into its target locally. Before pushing `main`, verify that it contains only approved commits. Push normally; never force-push `main`. A rejected push means the remote moved: fetch, reconcile, and reverify before retrying. If that changes the approved result materially, ask for renewed approval. Do not assume a successful local merge guarantees a successful push.

After a child branch is integrated, keep the spec integration branch until the human authorizes its final merge into `main`. After a successful merge and push, follow `issue-tracker.md` for issue completion, then remove merged worktrees and branches and prune stale worktree records. Preserve worktrees with unmerged or uncommitted work.

## Clean up generated artifacts

Remove task-generated artifacts when delivery and review are complete, including screenshots, recordings, comparison galleries, throwaway scripts, logs, test databases, and temporary build or test output, whether inside the repository or elsewhere such as `/tmp`. Stop task-owned preview servers and other temporary processes. Limit cleanup to artifacts and processes known to belong to the task; preserve shared resources, other agents' work, committed fixtures, and intended deliverables. Retain artifacts still needed for review or explicitly requested by the user, report their locations and why they remain, and remove them once that need ends. User-provided files, including uploaded recordings, require explicit permission before deletion. Before declaring cleanup complete, verify that no task-owned temporary processes or unneeded generated artifacts remain.
