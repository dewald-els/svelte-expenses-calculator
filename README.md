# Expense Planner

Svelte 5 app for planning monthly Tokyo costs, savings outlook, and income split distribution.

## Development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run check
npm run build
```

## Deploy to GitHub Pages

This repo includes a workflow at `.github/workflows/deploy-pages.yml` that deploys on every push to `main`.

1. Open repository settings on GitHub.
2. Go to Pages.
3. Set Source to Deploy from a branch.
4. Select branch `gh-pages` and folder `/ (root)`.
5. Push to `main` (or run the workflow manually from the Actions tab).

Your site URL will be:

`https://dewald-els.github.io/svelte-expenses-calculator/`

## Design seam

Core budgeting behavior lives behind [`calculatePlan`](./src/lib/planner/engine.ts) so UI layers remain thin and easy to evolve.
