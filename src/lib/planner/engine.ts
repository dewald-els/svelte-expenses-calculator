import { expenseIds } from "./types";
import type {
  ExpenseId,
  IncomeSplitSlice,
  PlanInput,
  PlanResult,
  TakeHomeEstimate,
} from "./types";

// ── Colour palette for chart slices ────────────────────────────────
const sliceColors = [
  "#e7a177",
  "#87b7a7",
  "#d6c686",
  "#a9a2d6",
  "#d88484",
  "#8db2ce",
  "#7fb069",
];

// ── Pure helpers ───────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Sanitise a raw numeric input – coerce NaN/Infinity to 0, floor at 0. */
function sanitise(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Read a single expense value from the map, sanitised to >= 0. */
function expense(expenses: Record<ExpenseId, number>, id: ExpenseId): number {
  return sanitise(expenses[id]);
}

/** Percentage of a part relative to a whole (returns 0 when whole <= 0). */
function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

// ── Insight text ──────────────────────────────────────────────────

function fmt(n: number): string {
  return Math.abs(Math.round(n)).toLocaleString("en-US");
}

function buildInsight(
  actualSurplus: number,
  disposable: number,
  savingsGoalPercent: number,
): string {
  if (actualSurplus < 0) {
    return `Your planned expenses exceed take-home pay by ¥${fmt(actualSurplus)}/month. You need to cut costs before you can save anything.`;
  }
  if (disposable < 0) {
    return `You can cover expenses, but fall ¥${fmt(disposable)}/month short of your ${savingsGoalPercent}% savings target. Reduce spending or lower the target.`;
  }
  if (disposable === 0) {
    return `Your budget exactly meets your ${savingsGoalPercent}% savings target with nothing to spare.`;
  }
  return `You meet your ${savingsGoalPercent}% savings goal with ¥${fmt(disposable)} to spare each month.`;
}

// ── Income split (donut-style breakdown) ──────────────────────────

function buildIncomeSplit(
  income: number,
  fixedEssentials: number,
  flexibleSpend: number,
  bufferAmount: number,
  actualSurplus: number,
): IncomeSplitSlice[] {
  const deficit = actualSurplus < 0 ? Math.abs(actualSurplus) : 0;
  const savings = Math.max(0, actualSurplus);
  const denominator =
    income > 0
      ? income
      : fixedEssentials + flexibleSpend + bufferAmount + deficit;

  return [
    {
      name: "Fixed essentials",
      amount: fixedEssentials,
      percentOfIncome: pct(fixedEssentials, denominator),
      color: "#e7a177",
    },
    {
      name: "Flexible lifestyle",
      amount: flexibleSpend,
      percentOfIncome: pct(flexibleSpend, denominator),
      color: "#87b7a7",
    },
    {
      name: "Safety buffer",
      amount: bufferAmount,
      percentOfIncome: pct(bufferAmount, denominator),
      color: "#d6c686",
    },
    {
      name: deficit > 0 ? "Deficit" : "Savings",
      amount: deficit > 0 ? deficit : savings,
      percentOfIncome: pct(deficit > 0 ? deficit : savings, denominator),
      color: deficit > 0 ? "#d88484" : "#8db2ce",
    },
  ];
}

// ── Japanese income-tax helpers ───────────────────────────────────

function annualEmploymentIncomeDeduction(annualGross: number): number {
  if (annualGross <= 1625000) return 550000;
  if (annualGross <= 1800000) return annualGross * 0.4 - 100000;
  if (annualGross <= 3600000) return annualGross * 0.3 + 80000;
  if (annualGross <= 6600000) return annualGross * 0.2 + 440000;
  if (annualGross <= 8500000) return annualGross * 0.1 + 1100000;
  return 1950000;
}

function incomeTaxBracket(taxableIncome: number): {
  rate: number;
  deduction: number;
  label: string;
} {
  if (taxableIncome <= 1950000)
    return { rate: 0.05, deduction: 0, label: "5% bracket (up to ¥1.95M taxable)" };
  if (taxableIncome <= 3300000)
    return { rate: 0.1, deduction: 97500, label: "10% bracket (¥1.95M–¥3.3M taxable)" };
  if (taxableIncome <= 6950000)
    return { rate: 0.2, deduction: 427500, label: "20% bracket (¥3.3M–¥6.95M taxable)" };
  if (taxableIncome <= 9000000)
    return { rate: 0.23, deduction: 636000, label: "23% bracket (¥6.95M–¥9M taxable)" };
  if (taxableIncome <= 18000000)
    return { rate: 0.33, deduction: 1536000, label: "33% bracket (¥9M–¥18M taxable)" };
  if (taxableIncome <= 40000000)
    return { rate: 0.4, deduction: 2796000, label: "40% bracket (¥18M–¥40M taxable)" };
  return { rate: 0.45, deduction: 4796000, label: "45% bracket (over ¥40M taxable)" };
}

function annualNationalIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  const b = incomeTaxBracket(taxableIncome);
  return taxableIncome * b.rate - b.deduction;
}

function resolvedTaxAssumptions(input: PlanInput): {
  residency: "resident" | "nonResident";
  firstYearInJapan: boolean;
} {
  if (input.taxAssumptions.profileMode === "manual") {
    return {
      residency: input.taxAssumptions.residency,
      firstYearInJapan: input.taxAssumptions.firstYearInJapan,
    };
  }
  if (input.taxAssumptions.employmentDurationBand === "under1Year") {
    return { residency: "nonResident", firstYearInJapan: true };
  }
  return { residency: "resident", firstYearInJapan: false };
}

function estimateTakeHome(input: PlanInput): TakeHomeEstimate {
  const annualGross = sanitise(input.yearlyGrossIncome);
  const monthlyGross = annualGross / 12;
  const tax = input.taxAssumptions;
  const resolved = resolvedTaxAssumptions(input);

  const monthlySocial =
    monthlyGross * clamp(tax.socialInsuranceRate, 0, 0.25);
  const monthlyEmployment =
    monthlyGross * clamp(tax.employmentInsuranceRate, 0, 0.05);

  if (resolved.residency === "nonResident") {
    const monthlyIncomeTax = monthlyGross * 0.2042;
    const monthlyTakeHome = Math.max(
      0,
      monthlyGross - monthlyIncomeTax - monthlySocial - monthlyEmployment,
    );
    return {
      profileMode: tax.profileMode,
      employmentDurationBand: tax.employmentDurationBand,
      appliedResidency: resolved.residency,
      appliedFirstYearInJapan: resolved.firstYearInJapan,
      taxBracketLabel: "Non-resident withholding (20.42%)",
      marginalIncomeTaxRate: 0.2042,
      monthlyGross,
      monthlyIncomeTax,
      monthlyResidentTax: 0,
      monthlySocialInsurance: monthlySocial,
      monthlyEmploymentInsurance: monthlyEmployment,
      monthlyTakeHome,
    };
  }

  const annualEmploymentIncome = Math.max(
    0,
    annualGross - annualEmploymentIncomeDeduction(annualGross),
  );
  const annualTaxableIncome = Math.max(0, annualEmploymentIncome - 480000);
  const bracket = incomeTaxBracket(annualTaxableIncome);
  const annualIncomeTax = annualNationalIncomeTax(annualTaxableIncome);
  const annualReconstructionTax = annualIncomeTax * 0.021;
  const monthlyIncomeTax = (annualIncomeTax + annualReconstructionTax) / 12;
  const monthlyResidentTax = resolved.firstYearInJapan
    ? 0
    : (Math.max(0, annualTaxableIncome) * clamp(tax.residentTaxRate, 0, 0.2)) /
      12;
  const monthlyTakeHome = Math.max(
    0,
    monthlyGross -
      monthlyIncomeTax -
      monthlyResidentTax -
      monthlySocial -
      monthlyEmployment,
  );

  return {
    profileMode: tax.profileMode,
    employmentDurationBand: tax.employmentDurationBand,
    appliedResidency: resolved.residency,
    appliedFirstYearInJapan: resolved.firstYearInJapan,
    taxBracketLabel: bracket.label,
    marginalIncomeTaxRate: bracket.rate,
    monthlyGross,
    monthlyIncomeTax,
    monthlyResidentTax,
    monthlySocialInsurance: monthlySocial,
    monthlyEmploymentInsurance: monthlyEmployment,
    monthlyTakeHome,
  };
}

// ── Main calculation ──────────────────────────────────────────────
//
//   income             = monthly take-home (entered or estimated)
//   baseExpenses       = sum of all expense line items
//   bufferAmount       = baseExpenses × bufferPercent / 100
//   monthlySpend       = baseExpenses + bufferAmount
//   monthlySavings     = income − monthlySpend           (actual surplus; can be negative)
//   targetMonthlySavings = income × savingsGoalPercent / 100
//   savingsGoalGap     = monthlySavings − targetMonthlySavings  (disposable after goal; can be negative)
//
//   Projections (3/6/12 month) use monthlySavings (actual surplus).
//   "Disposable income" = savingsGoalGap (what remains after expenses AND savings target).

export function calculatePlan(input: PlanInput): PlanResult {
  // 1. Resolve effective monthly income
  const takeHomeEstimate =
    input.incomeMode === "yearlyGross" ? estimateTakeHome(input) : null;
  const income = takeHomeEstimate
    ? takeHomeEstimate.monthlyTakeHome
    : sanitise(input.income);

  // 2. Sanitise scalar inputs
  const household = clamp(Math.floor(input.household || 1), 1, 10);
  const bufferPercent = clamp(sanitise(input.bufferPercent), 0, 20);
  const savingsGoalPercent = clamp(sanitise(input.savingsGoalPercent), 0, 70);

  // 3. Sum expenses
  const baseExpenses = expenseIds.reduce(
    (sum, id) => sum + expense(input.expenses, id),
    0,
  );

  const fixedEssentials =
    expense(input.expenses, "rent") +
    expense(input.expenses, "utilities") +
    expense(input.expenses, "communications") +
    expense(input.expenses, "insurance");

  const flexibleSpend =
    expense(input.expenses, "groceries") +
    expense(input.expenses, "dining") +
    expense(input.expenses, "transport") +
    expense(input.expenses, "leisure") +
    expense(input.expenses, "personal") +
    expense(input.expenses, "other");

  // 4. Core monthly arithmetic
  const bufferAmount = baseExpenses * (bufferPercent / 100);
  const monthlySpend = baseExpenses + bufferAmount;
  const monthlySavings = income - monthlySpend;
  const targetMonthlySavings = income * (savingsGoalPercent / 100);
  const targetMonthlySpend = income - targetMonthlySavings;
  const savingsGoalGap = monthlySavings - targetMonthlySavings;

  // 5. Rates
  const incomeUsedRate = pct(monthlySpend, income);
  const savingsRate = income > 0 ? monthlySavings / income : 0;

  return {
    effectiveMonthlyIncome: income,
    baseExpenses,
    monthlySpend,
    monthlySavings,
    savingsRate,
    savingsGoalPercent,
    targetMonthlySavings,
    targetMonthlySpend,
    savingsGoalGap,
    incomeUsedRate,
    annualSavings: targetMonthlySavings * 12,
    threeMonthSavings: targetMonthlySavings * 3,
    sixMonthSavings: targetMonthlySavings * 6,
    twelveMonthSavings: targetMonthlySavings * 12,
    fiveYearSavings: targetMonthlySavings * 60,
    tenYearSavings: targetMonthlySavings * 120,
    dailyFlexibleAllowance: flexibleSpend / (30 * household),
    insight: buildInsight(monthlySavings, savingsGoalGap, savingsGoalPercent),
    takeHomeEstimate,
    chartSlices: [
      {
        name: "Housing",
        amount:
          expense(input.expenses, "rent") +
          expense(input.expenses, "utilities") +
          expense(input.expenses, "communications"),
        color: sliceColors[0],
      },
      {
        name: "Food",
        amount:
          expense(input.expenses, "groceries") +
          expense(input.expenses, "dining"),
        color: sliceColors[1],
      },
      {
        name: "Transport",
        amount: expense(input.expenses, "transport"),
        color: sliceColors[2],
      },
      {
        name: "Health",
        amount: expense(input.expenses, "insurance"),
        color: sliceColors[3],
      },
      {
        name: "Lifestyle",
        amount:
          expense(input.expenses, "leisure") +
          expense(input.expenses, "personal"),
        color: sliceColors[4],
      },
      {
        name: "Other + buffer",
        amount: expense(input.expenses, "other") + bufferAmount,
        color: sliceColors[5],
      },
      {
        name: "Savings",
        amount: targetMonthlySavings,
        color: sliceColors[6],
      },
    ],
    incomeSplit: buildIncomeSplit(
      income,
      fixedEssentials,
      flexibleSpend,
      bufferAmount,
      monthlySavings,
    ),
  };
}
