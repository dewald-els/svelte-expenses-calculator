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

## Design seam

Core budgeting behavior lives behind [`calculatePlan`](./src/lib/planner/engine.ts) so UI layers remain thin and easy to evolve.
