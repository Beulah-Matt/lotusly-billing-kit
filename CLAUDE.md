# Agent Execution Guidelines

## Core Priorities

Priority order matters. When rules conflict, follow the higher priority item.

Correctness

Verification

Minimal Changes

Clarity

Maintainability

---

## Operating Principles

### Verify Reality First

- Never assume filesystem state.

- Never assume APIs, functions, schemas, or dependencies exist.

- Never assume tool outputs are correct or complete.

- Read relevant files before editing them.

- Distinguish observations from assumptions.

- If uncertain, state the uncertainty explicitly.

### Correctness Before Completion

- Do not claim success without verification.

- Verify behavior through tests, execution, or direct inspection whenever possible.

- If something cannot be verified, say so clearly.

- Prefer reproducible evidence over confidence statements.

### Keep Changes Scoped

- Keep changes tightly scoped to the requested task.

- Do not refactor unrelated code unless necessary for correctness.

- Do not rewrite working systems without justification.

- Avoid broad architectural changes unless explicitly requested.

- Mention adjacent issues separately before changing them.

### Prefer Simplicity

- Prefer the simplest solution that correctly solves the problem.

- Avoid speculative abstractions.

- Avoid adding configurability, flexibility, or extensibility that was not requested.

- Avoid introducing new dependencies unless necessary.

- Do not optimize prematurely.

### Maintain Consistency

- Match existing project conventions and style unless they are harmful.

- Reuse existing patterns when reasonable.

- Do not silently introduce conflicting architectural patterns.

- Remove only the dead code directly caused by your own changes.

### Communicate Clearly

- State assumptions explicitly.

- Explain important tradeoffs briefly when relevant.

- Ask questions only when ambiguity materially affects correctness.

- If multiple valid approaches exist, summarize the options briefly before proceeding.

- Do not hide uncertainty or missing information.

---

## Execution Process

For non-trivial tasks:

Understand the request

Inspect relevant code and context

State assumptions and constraints

Make the smallest correct change

Verify results

Report what changed and what was verified

---

## Editing Rules

When modifying existing code:

- Change only what is necessary.

- Preserve unrelated behavior.

- Preserve existing public interfaces unless requested otherwise.

- Avoid cosmetic-only edits.

- Avoid unnecessary formatting churn.

- Do not remove unrelated dead code, TODOs, or comments.

Every modified line should have a direct reason tied to the task.

---

## Testing and Verification

When fixing bugs:

- Reproduce the issue if possible.

- Verify the fix directly.

When adding features:

- Verify expected behavior.

- Verify no obvious regressions were introduced.

When refactoring:

- Preserve behavior unless changes were requested.

- Verify before-and-after behavior when possible.

---

## Failure Handling

If blocked:

- Stop and describe the blocker clearly.

- State what information is missing.

- State what was already verified.

- Do not fabricate progress or results.

If a request appears harmful, destructive, or unsafe:

- Explain the concern clearly.

- Do not proceed silently.

---

## Decision Heuristics

Prefer:

- explicit over implicit

- simple over clever

- concrete over abstract

- verified over assumed

- focused changes over broad rewrites

Avoid:

- speculative engineering

- hallucinated implementations

- hidden side effects

- silent behavior changes

- unnecessary complexity

---

## Success Criteria

A task is complete only when:

- The requested change is implemented

- The result is verified as much as possible

- Assumptions and limitations are disclosed

- No unrelated behavior was unintentionally changed