import { expenseIds } from "./types";
import type {
  ExpenseId,
  IncomeSplitSlice,
  PlanInput,
  PlanResult,
  TakeHomeEstimate,
} from "./types";

const sliceColors = [
  "#e7a177",
  "#87b7a7",
  "#d6c686",
  "#a9a2d6",
  "#d88484",
  "#8db2ce",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function money(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

function expenseValue(
  expenses: Record<ExpenseId, number>,
  id: ExpenseId,
): number {
  return money(expenses[id]);
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return (numerator / denominator) * 100;
}

function buildInsight(monthlySavings: number, income: number): string {
  if (monthlySavings < 0) {
    return `Your plan exceeds take-home pay by ¥${Math.round(Math.abs(monthlySavings)).toLocaleString("en-US")} per month.`;
  }

  const savingsRate = income > 0 ? monthlySavings / income : 0;
  if (savingsRate < 0.1) {
    return "Your budget is viable, but leaves a limited emergency margin.";
  }

  return `At this pace, you could save ¥${Math.round(monthlySavings * 12).toLocaleString("en-US")} over 12 months.`;
}

function buildIncomeSplit(
  income: number,
  fixedEssentials: number,
  flexibleSpend: number,
  bufferAmount: number,
  monthlySavings: number,
): IncomeSplitSlice[] {
  const deficit = Math.max(0, -monthlySavings);
  const actualSavings = Math.max(0, monthlySavings);
  const denominator =
    income > 0
      ? income
      : fixedEssentials + flexibleSpend + bufferAmount + deficit;

  return [
    {
      name: "Fixed essentials",
      amount: fixedEssentials,
      percentOfIncome: toPercent(fixedEssentials, denominator),
      color: "#e7a177",
    },
    {
      name: "Flexible lifestyle",
      amount: flexibleSpend,
      percentOfIncome: toPercent(flexibleSpend, denominator),
      color: "#87b7a7",
    },
    {
      name: "Safety buffer",
      amount: bufferAmount,
      percentOfIncome: toPercent(bufferAmount, denominator),
      color: "#d6c686",
    },
    {
      name: deficit > 0 ? "Deficit" : "Savings",
      amount: deficit > 0 ? deficit : actualSavings,
      percentOfIncome: toPercent(
        deficit > 0 ? deficit : actualSavings,
        denominator,
      ),
      color: deficit > 0 ? "#d88484" : "#8db2ce",
    },
  ];
}

function annualEmploymentIncomeDeduction(annualGross: number): number {
  if (annualGross <= 1625000) {
    return 550000;
  }
  if (annualGross <= 1800000) {
    return annualGross * 0.4 - 100000;
  }
  if (annualGross <= 3600000) {
    return annualGross * 0.3 + 80000;
  }
  if (annualGross <= 6600000) {
    return annualGross * 0.2 + 440000;
  }
  if (annualGross <= 8500000) {
    return annualGross * 0.1 + 1100000;
  }
  return 1950000;
}

function annualNationalIncomeTax(taxableIncome: number): number {
  const bracket = incomeTaxBracket(taxableIncome);
  if (taxableIncome <= 0) {
    return 0;
  }
  return taxableIncome * bracket.rate - bracket.deduction;
}

function incomeTaxBracket(taxableIncome: number): {
  rate: number;
  deduction: number;
  label: string;
} {
  if (taxableIncome <= 1950000) {
    return {
      rate: 0.05,
      deduction: 0,
      label: "5% bracket (up to ¥1.95M taxable)",
    };
  }
  if (taxableIncome <= 3300000) {
    return {
      rate: 0.1,
      deduction: 97500,
      label: "10% bracket (¥1.95M–¥3.3M taxable)",
    };
  }
  if (taxableIncome <= 6950000) {
    return {
      rate: 0.2,
      deduction: 427500,
      label: "20% bracket (¥3.3M–¥6.95M taxable)",
    };
  }
  if (taxableIncome <= 9000000) {
    return {
      rate: 0.23,
      deduction: 636000,
      label: "23% bracket (¥6.95M–¥9M taxable)",
    };
  }
  if (taxableIncome <= 18000000) {
    return {
      rate: 0.33,
      deduction: 1536000,
      label: "33% bracket (¥9M–¥18M taxable)",
    };
  }
  if (taxableIncome <= 40000000) {
    return {
      rate: 0.4,
      deduction: 2796000,
      label: "40% bracket (¥18M–¥40M taxable)",
    };
  }
  return {
    rate: 0.45,
    deduction: 4796000,
    label: "45% bracket (over ¥40M taxable)",
  };
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

  if (input.taxAssumptions.employmentDurationBand === "oneToFiveYears") {
    return { residency: "resident", firstYearInJapan: false };
  }

  return { residency: "resident", firstYearInJapan: false };
}

function estimateTakeHome(input: PlanInput): TakeHomeEstimate {
  const annualGross = money(input.yearlyGrossIncome);
  const monthlyGross = annualGross / 12;
  const tax = input.taxAssumptions;
  const resolved = resolvedTaxAssumptions(input);

  const monthlySocialInsurance =
    monthlyGross * clamp(tax.socialInsuranceRate, 0, 0.25);
  const monthlyEmploymentInsurance =
    monthlyGross * clamp(tax.employmentInsuranceRate, 0, 0.05);

  if (resolved.residency === "nonResident") {
    const monthlyIncomeTax = monthlyGross * 0.2042;
    const monthlyTakeHome = Math.max(
      0,
      monthlyGross -
        monthlyIncomeTax -
        monthlySocialInsurance -
        monthlyEmploymentInsurance,
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
      monthlySocialInsurance,
      monthlyEmploymentInsurance,
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
      monthlySocialInsurance -
      monthlyEmploymentInsurance,
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
    monthlySocialInsurance,
    monthlyEmploymentInsurance,
    monthlyTakeHome,
  };
}

export function calculatePlan(input: PlanInput): PlanResult {
  const manualIncome = money(input.income);
  const takeHomeEstimate =
    input.incomeMode === "yearlyGross" ? estimateTakeHome(input) : null;
  const income = takeHomeEstimate
    ? takeHomeEstimate.monthlyTakeHome
    : manualIncome;
  const household = clamp(Math.floor(input.household || 1), 1, 10);
  const exchangeRate = money(input.exchangeRate);
  const bufferPercent = clamp(money(input.bufferPercent), 0, 20);
  const savingsGoalPercent = clamp(money(input.savingsGoalPercent), 0, 70);

  const baseExpenses = expenseIds.reduce(
    (sum, id) => sum + expenseValue(input.expenses, id),
    0,
  );
  const fixedEssentials =
    expenseValue(input.expenses, "rent") +
    expenseValue(input.expenses, "utilities") +
    expenseValue(input.expenses, "communications") +
    expenseValue(input.expenses, "insurance");

  const flexibleSpend =
    expenseValue(input.expenses, "groceries") +
    expenseValue(input.expenses, "dining") +
    expenseValue(input.expenses, "transport") +
    expenseValue(input.expenses, "leisure") +
    expenseValue(input.expenses, "personal") +
    expenseValue(input.expenses, "other");

  const bufferAmount = baseExpenses * (bufferPercent / 100);
  const monthlySpend = baseExpenses + bufferAmount;
  const monthlySavings = income - monthlySpend;
  const incomeUsedRate = toPercent(monthlySpend, income);
  const savingsRate = income > 0 ? monthlySavings / income : 0;
  const targetMonthlySavings = income * (savingsGoalPercent / 100);
  const targetMonthlySpend = Math.max(0, income - targetMonthlySavings);
  const savingsGoalGap = monthlySavings - targetMonthlySavings;

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
    annualSavings: monthlySavings * 12,
    threeMonthSavings: monthlySavings * 3,
    sixMonthSavings: monthlySavings * 6,
    twelveMonthSavings: monthlySavings * 12,
    dailyFlexibleAllowance: flexibleSpend / (30 * household),
    convertedSpend: monthlySpend * exchangeRate,
    insight: buildInsight(monthlySavings, income),
    takeHomeEstimate,
    chartSlices: [
      {
        name: "Housing",
        amount:
          expenseValue(input.expenses, "rent") +
          expenseValue(input.expenses, "utilities") +
          expenseValue(input.expenses, "communications"),
        color: sliceColors[0],
      },
      {
        name: "Food",
        amount:
          expenseValue(input.expenses, "groceries") +
          expenseValue(input.expenses, "dining"),
        color: sliceColors[1],
      },
      {
        name: "Transport",
        amount: expenseValue(input.expenses, "transport"),
        color: sliceColors[2],
      },
      {
        name: "Health",
        amount: expenseValue(input.expenses, "insurance"),
        color: sliceColors[3],
      },
      {
        name: "Lifestyle",
        amount:
          expenseValue(input.expenses, "leisure") +
          expenseValue(input.expenses, "personal"),
        color: sliceColors[4],
      },
      {
        name: "Other + buffer",
        amount: expenseValue(input.expenses, "other") + bufferAmount,
        color: sliceColors[5],
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
