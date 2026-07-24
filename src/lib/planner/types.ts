export const expenseIds = [
  "rent",
  "utilities",
  "communications",
  "insurance",
  "groceries",
  "dining",
  "transport",
  "leisure",
  "personal",
  "other",
] as const;

export type ExpenseId = (typeof expenseIds)[number];

export type LifestylePresetName = "lean" | "balanced" | "comfortable" | "custom";
export type IncomeInputMode = "monthlyTakeHome" | "yearlyGross";
export type TaxResidency = "resident" | "nonResident";
export type TaxProfileMode = "auto" | "manual";
export type EmploymentDurationBand =
  | "under1Year"
  | "oneToFiveYears"
  | "overFiveYears";

export interface TaxAssumptions {
  profileMode: TaxProfileMode;
  employmentDurationBand: EmploymentDurationBand;
  residency: TaxResidency;
  firstYearInJapan: boolean;
  socialInsuranceRate: number;
  employmentInsuranceRate: number;
  residentTaxRate: number;
}

export interface ExpenseField {
  id: ExpenseId;
  icon: string;
  label: string;
  description: string;
  step: number;
}

export const fixedExpenseFields: ExpenseField[] = [
  {
    id: "rent",
    icon: "家",
    label: "Rent",
    description: "Apartment or share house",
    step: 5000,
  },
  {
    id: "utilities",
    icon: "光",
    label: "Utilities",
    description: "Electricity, gas and water",
    step: 500,
  },
  {
    id: "communications",
    icon: "網",
    label: "Phone and internet",
    description: "Mobile plan and home connection",
    step: 500,
  },
  {
    id: "insurance",
    icon: "保",
    label: "Insurance / medical",
    description: "Out-of-pocket monthly allowance",
    step: 500,
  },
];

export const flexibleExpenseFields: ExpenseField[] = [
  {
    id: "groceries",
    icon: "食",
    label: "Groceries",
    description: "Food and household staples",
    step: 1000,
  },
  {
    id: "dining",
    icon: "外",
    label: "Dining and cafés",
    description: "Lunches and dinners out",
    step: 1000,
  },
  {
    id: "transport",
    icon: "電",
    label: "Transport",
    description: "Commuter pass and other trips",
    step: 500,
  },
  {
    id: "leisure",
    icon: "楽",
    label: "Leisure",
    description: "Fitness, entertainment and hobbies",
    step: 1000,
  },
  {
    id: "personal",
    icon: "衣",
    label: "Shopping and personal care",
    description: "Clothing, toiletries and extras",
    step: 1000,
  },
  {
    id: "other",
    icon: "他",
    label: "Other commitments",
    description: "Subscriptions, debt or remittances",
    step: 1000,
  },
];

export interface PlanInput {
  income: number;
  incomeMode: IncomeInputMode;
  yearlyGrossIncome: number;
  household: number;
  bufferPercent: number;
  savingsGoalPercent: number;
  taxAssumptions: TaxAssumptions;
  expenses: Record<ExpenseId, number>;
}

export interface TakeHomeEstimate {
  profileMode: TaxProfileMode;
  employmentDurationBand: EmploymentDurationBand;
  appliedResidency: TaxResidency;
  appliedFirstYearInJapan: boolean;
  taxBracketLabel: string;
  marginalIncomeTaxRate: number;
  monthlyGross: number;
  monthlyIncomeTax: number;
  monthlyResidentTax: number;
  monthlySocialInsurance: number;
  monthlyEmploymentInsurance: number;
  monthlyTakeHome: number;
}

export interface ChartSlice {
  name: string;
  amount: number;
  color: string;
}

export interface IncomeSplitSlice {
  name: string;
  amount: number;
  percentOfIncome: number;
  color: string;
}

export interface PlanResult {
  effectiveMonthlyIncome: number;
  baseExpenses: number;
  monthlySpend: number;
  monthlySavings: number;
  savingsRate: number;
  savingsGoalPercent: number;
  targetMonthlySavings: number;
  targetMonthlySpend: number;
  savingsGoalGap: number;
  incomeUsedRate: number;
  annualSavings: number;
  threeMonthSavings: number;
  sixMonthSavings: number;
  twelveMonthSavings: number;
  fiveYearSavings: number;
  tenYearSavings: number;
  dailyFlexibleAllowance: number;
  insight: string;
  takeHomeEstimate: TakeHomeEstimate | null;
  chartSlices: ChartSlice[];
  incomeSplit: IncomeSplitSlice[];
}
