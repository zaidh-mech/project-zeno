# Concurrent CLI workflow

Open each CLI in this checkout. Agents that load root `AGENTS.md` receive the
project map automatically. For other clients, explicitly instruct them to read
`AGENTS.md` and follow its protocol. No harness can preserve a model's in-memory
context across unrelated CLI sessions; these small files provide persistent
context without a full repository scan.

From the project root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
./tools/agents.ps1 context
$claim = ./tools/agents.ps1 claim -Id phone-audio -Task 'Fix phone audio' -Scopes web/app/control | ConvertFrom-Json
# Inspect and edit only the relevant files.
./tools/agents.ps1 note -Id phone-audio -Owner $claim.owner -Note 'Located recording issue; implementing fix.'
./tools/agents.ps1 finish -Id phone-audio -Owner $claim.owner -Note 'Fixed recording; typecheck passed; device test pending.'
```

The execution-policy override applies only to this terminal process. For a
single invocation use `powershell -NoProfile -ExecutionPolicy Bypass -File
tools/agents.ps1 context`. Organization-enforced policies may still apply.

A second CLI can claim `backend` while the first owns `web/app/control`.
Directory claims include descendants; different files in a directory can be
claimed independently. To expand a claim, repeat `claim` with the same ID,
token, task description, and the entire desired scope list. A failed expansion
leaves the original claim intact. Use a new task ID for each new task.

Use `./tools/agents.ps1 status` to inspect active tasks and recent handoffs.
There is no fixed session count in the registry. Actual concurrency depends on
RAM, CPU, API limits, and the CLI's worker limit. All writes to the registry use
an exclusive OS file handle and atomic replacement; crashed processes release
the handle automatically. File claims themselves are advisory and remain active
until completion or explicit recovery. The JSON registry retains all handoffs;
startup only displays the most recent eight. State is local and ignored by Git.

After verifying a crashed worker is no longer running and reviewing its diff:

```powershell
./tools/agents.ps1 release -Id phone-audio -Note 'Worker stopped; reviewed partial changes; follow-up phone-audio-2 will finish.'
```

Do not delete the registry or its lock file while sessions are running. If the
registry is corrupt, stop coordinating sessions and restore it from a known
copy; the harness fails closed instead of silently forgetting active claims.
Owner tokens prevent accidental updates, not malicious access by local users.

For multiple agents, the coordinator splits work by owned paths, starts workers
only when dependencies are ready, and gathers results for review. Workers claim
their own paths. A reviewer may inspect all changes without write claims.
Shared build outputs require claims even when source edits are disjoint. For
overlapping edits, coordinate isolated worktrees and integration explicitly;
this registry does not synchronize separate worktrees or machines.
