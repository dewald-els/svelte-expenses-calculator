import { expenseIds } from "./types";
import type {
  EmploymentDurationBand,
  ExpenseId,
  IncomeInputMode,
  PlanInput,
  TaxProfileMode,
  TaxResidency,
} from "./types";

const storageKey = "tokyoLivingPlan-v2";
const incomeModes: IncomeInputMode[] = ["monthlyTakeHome", "yearlyGross"];
const taxProfileModes: TaxProfileMode[] = ["auto", "manual"];
const employmentDurationBands: EmploymentDurationBand[] = [
  "under1Year",
  "oneToFiveYears",
  "overFiveYears",
];
const residencyModes: TaxResidency[] = ["resident", "nonResident"];

function asNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function asIncomeMode(
  value: unknown,
  fallback: IncomeInputMode,
): IncomeInputMode {
  if (typeof value !== "string") {
    return fallback;
  }
  return incomeModes.includes(value as IncomeInputMode)
    ? (value as IncomeInputMode)
    : fallback;
}

function asTaxProfileMode(
  value: unknown,
  fallback: TaxProfileMode,
): TaxProfileMode {
  if (typeof value !== "string") {
    return fallback;
  }
  return taxProfileModes.includes(value as TaxProfileMode)
    ? (value as TaxProfileMode)
    : fallback;
}

function asEmploymentDurationBand(
  value: unknown,
  fallback: EmploymentDurationBand,
): EmploymentDurationBand {
  if (typeof value !== "string") {
    return fallback;
  }
  return employmentDurationBands.includes(value as EmploymentDurationBand)
    ? (value as EmploymentDurationBand)
    : fallback;
}

function asResidency(value: unknown, fallback: TaxResidency): TaxResidency {
  if (typeof value !== "string") {
    return fallback;
  }
  return residencyModes.includes(value as TaxResidency)
    ? (value as TaxResidency)
    : fallback;
}

function parseExpenseRecord(
  value: unknown,
  fallback: Record<ExpenseId, number>,
): Record<ExpenseId, number> {
  if (typeof value !== "object" || value === null) {
    return { ...fallback };
  }

  const maybeExpenses = value as Record<string, unknown>;
  const parsed = { ...fallback };
  for (const id of expenseIds) {
    parsed[id] = Math.max(0, asNumber(maybeExpenses[id], fallback[id]));
  }
  return parsed;
}

export function loadPlanDraft(defaultInput: PlanInput): PlanInput {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return defaultInput;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(
      "Stored plan could not be parsed and will be ignored.",
      error,
    );
    return defaultInput;
  }

  if (typeof parsed !== "object" || parsed === null) {
    console.error("Stored plan has an invalid shape and will be ignored.");
    return defaultInput;
  }

  const data = parsed as Record<string, unknown>;
  const taxAssumptionsRaw =
    typeof data.taxAssumptions === "object" && data.taxAssumptions !== null
      ? (data.taxAssumptions as Record<string, unknown>)
      : null;
  const defaultTax = defaultInput.taxAssumptions;

  return {
    income: Math.max(0, asNumber(data.income, defaultInput.income)),
    incomeMode: asIncomeMode(data.incomeMode, defaultInput.incomeMode),
    yearlyGrossIncome: Math.max(
      0,
      asNumber(data.yearlyGrossIncome, defaultInput.yearlyGrossIncome),
    ),
    household: Math.min(
      10,
      Math.max(1, Math.round(asNumber(data.household, defaultInput.household))),
    ),
    bufferPercent: Math.min(
      20,
      Math.max(0, asNumber(data.bufferPercent, defaultInput.bufferPercent)),
    ),
    savingsGoalPercent: Math.min(
      70,
      Math.max(
        0,
        asNumber(data.savingsGoalPercent, defaultInput.savingsGoalPercent),
      ),
    ),
    taxAssumptions: {
      profileMode: asTaxProfileMode(
        taxAssumptionsRaw?.profileMode,
        defaultTax.profileMode,
      ),
      employmentDurationBand: asEmploymentDurationBand(
        taxAssumptionsRaw?.employmentDurationBand,
        defaultTax.employmentDurationBand,
      ),
      residency: asResidency(
        taxAssumptionsRaw?.residency,
        defaultTax.residency,
      ),
      firstYearInJapan:
        typeof taxAssumptionsRaw?.firstYearInJapan === "boolean"
          ? taxAssumptionsRaw.firstYearInJapan
          : defaultTax.firstYearInJapan,
      socialInsuranceRate: Math.min(
        0.25,
        Math.max(
          0,
          asNumber(
            taxAssumptionsRaw?.socialInsuranceRate,
            defaultTax.socialInsuranceRate,
          ),
        ),
      ),
      employmentInsuranceRate: Math.min(
        0.05,
        Math.max(
          0,
          asNumber(
            taxAssumptionsRaw?.employmentInsuranceRate,
            defaultTax.employmentInsuranceRate,
          ),
        ),
      ),
      residentTaxRate: Math.min(
        0.2,
        Math.max(
          0,
          asNumber(
            taxAssumptionsRaw?.residentTaxRate,
            defaultTax.residentTaxRate,
          ),
        ),
      ),
    },
    expenses: parseExpenseRecord(data.expenses, defaultInput.expenses),
  };
}

export function savePlanDraft(input: PlanInput): void {
  localStorage.setItem(storageKey, JSON.stringify(input));
}

export function clearPlanDraft(): void {
  localStorage.removeItem(storageKey);
}
