## Summary
<!-- 2–3 sentences. What does this PR do and why does it exist. Be specific — not "updated things". -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Performance improvement
- [ ] Chore / tooling / config

## Motivation
<!-- Why is this change needed? What breaks, degrades, or is missing without it? Link issues if any. -->

## What Changed
<!-- Exact, bullet-pointed list of changes. File-level where relevant. -->
-

## Improvement Analysis
<!-- Required for every refactor and bug fix. Skip only for pure chores. -->
<!-- This is your argument for why the change is net positive. -->

| | Before | After |
|---|---|---|
| **Problem** | | |
| **Behaviour** | | |
| **Observability / Risk** | | |

## Testing
<!--
- What did you manually test?
- What edge cases did you consider?
- Any unit tests added or updated?
-->

## Screenshots
<!-- UI changes: before / after side-by-side. Leave blank for non-UI PRs. -->

## Checklist
- [ ] Self-reviewed the diff line by line
- [ ] No `console.log` left in production paths
- [ ] All import paths resolve correctly
- [ ] React component names are PascalCase
- [ ] No hardcoded environment-specific URLs or ports
- [ ] Environment values use `import.meta.env.VITE_*`
- [ ] Cleanup functions present for every `useEffect` that sets up subscriptions or media
