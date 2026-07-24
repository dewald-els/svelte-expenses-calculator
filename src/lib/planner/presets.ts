import type {
  ExpenseId,
  LifestylePresetName,
  PlanInput,
} from "./types";

// ── Preset configuration ──────────────────────────────────────────
// Each preset defines:
//   budgetUse  – fraction of max available base expenses to allocate (0–1)
//   weights    – how to split allocated budget across categories (sum = 1)
//   steps      – rounding step per category for clean numbers

interface PresetConfig {
  budgetUse: number;
  weights: Record<ExpenseId, number>;
}

const steps: Record<ExpenseId, number> = {
  rent: 5000,
  utilities: 1000,
  communications: 1000,
  insurance: 1000,
  groceries: 1000,
  dining: 1000,
  transport: 1000,
  leisure: 1000,
  personal: 1000,
  other: 1000,
};

const presetConfigs: Record<LifestylePresetName, PresetConfig> = {
  lean: {
    budgetUse: 0.60,
    weights: {
      rent: 0.374,
      utilities: 0.054,
      communications: 0.034,
      insurance: 0.020,
      groceries: 0.204,
      dining: 0.102,
      transport: 0.068,
      leisure: 0.068,
      personal: 0.054,
      other: 0.022,
    },
  },
  balanced: {
    budgetUse: 0.82,
    weights: {
      rent: 0.400,
      utilities: 0.055,
      communications: 0.035,
      insurance: 0.025,
      groceries: 0.175,
      dining: 0.100,
      transport: 0.060,
      leisure: 0.075,
      personal: 0.050,
      other: 0.025,
    },
  },
  comfortable: {
    budgetUse: 0.98,
    weights: {
      rent: 0.4375,
      utilities: 0.058,
      communications: 0.033,
      insurance: 0.025,
      groceries: 0.175,
      dining: 0.104,
      transport: 0.050,
      leisure: 0.063,
      personal: 0.033,
      other: 0.022,
    },
  },
  custom: {
    budgetUse: 0,
    weights: {
      rent: 0,
      utilities: 0,
      communications: 0,
      insurance: 0,
      groceries: 0,
      dining: 0,
      transport: 0,
      leisure: 0,
      personal: 0,
      other: 0,
    },
  },
};

/**
 * Compute preset expense amounts dynamically from live inputs.
 *
 * maxBaseExpenses = income × (1 − savingsGoalPercent/100) / (1 + bufferPercent/100)
 * allocatedBudget = maxBaseExpenses × budgetUse
 * expense[id] = round(allocatedBudget × weight[id], step[id])
 */
export function computePresetExpenses(
  name: LifestylePresetName,
  income: number,
  bufferPercent: number,
  savingsGoalPercent: number,
): Record<ExpenseId, number> {
  const config = presetConfigs[name];
  const maxBase = (income * (1 - savingsGoalPercent / 100)) / (1 + bufferPercent / 100);
  const allocated = maxBase * config.budgetUse;

  const result = {} as Record<ExpenseId, number>;
  for (const id of Object.keys(config.weights) as ExpenseId[]) {
    const raw = allocated * config.weights[id];
    const step = steps[id];
    result[id] = Math.max(0, Math.round(raw / step) * step);
  }
  return result;
}

// Keep a static version for initial load (before user has changed anything)
export const presetExpenses: Record<
  LifestylePresetName,
  Record<ExpenseId, number>
> = {
  lean: computePresetExpenses("lean", 320000, 5, 20),
  balanced: computePresetExpenses("balanced", 320000, 5, 20),
  comfortable: computePresetExpenses("comfortable", 320000, 5, 20),
  custom: computePresetExpenses("custom", 320000, 5, 20),
};

export function createDefaultPlanInput(): PlanInput {
  return {
    income: 320000,
    incomeMode: "yearlyGross",
    yearlyGrossIncome: 5500000,
    household: 1,
    bufferPercent: 5,
    savingsGoalPercent: 20,
    taxAssumptions: {
      profileMode: "auto",
      employmentDurationBand: "under1Year",
      residency: "resident",
      firstYearInJapan: true,
      socialInsuranceRate: 0.1415,
      employmentInsuranceRate: 0.0055,
      residentTaxRate: 0.1,
    },
    expenses: { ...presetExpenses.balanced },
  };
}

export function findMatchingPresetName(
  expenses: Record<ExpenseId, number>,
): LifestylePresetName {
  // Presets are recomputed dynamically from income, so exact matching is
  // unreliable. Treat any saved/loaded state as a custom plan.
  return "custom";
}
