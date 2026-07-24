export const expenseIds = [
  'rent',
  'utilities',
  'communications',
  'insurance',
  'groceries',
  'dining',
  'transport',
  'leisure',
  'personal',
  'other',
] as const

export type ExpenseId = (typeof expenseIds)[number]

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NOK' | 'AUD' | 'CAD' | 'SGD'

export type LifestylePresetName = 'lean' | 'balanced' | 'comfortable'

export interface ExpenseField {
  id: ExpenseId
  icon: string
  label: string
  description: string
  step: number
}

export const fixedExpenseFields: ExpenseField[] = [
  { id: 'rent', icon: '家', label: 'Rent', description: 'Apartment or share house', step: 5000 },
  {
    id: 'utilities',
    icon: '光',
    label: 'Utilities',
    description: 'Electricity, gas and water',
    step: 500,
  },
  {
    id: 'communications',
    icon: '網',
    label: 'Phone and internet',
    description: 'Mobile plan and home connection',
    step: 500,
  },
  {
    id: 'insurance',
    icon: '保',
    label: 'Insurance / medical',
    description: 'Out-of-pocket monthly allowance',
    step: 500,
  },
]

export const flexibleExpenseFields: ExpenseField[] = [
  {
    id: 'groceries',
    icon: '食',
    label: 'Groceries',
    description: 'Food and household staples',
    step: 1000,
  },
  { id: 'dining', icon: '外', label: 'Dining and cafés', description: 'Lunches and dinners out', step: 1000 },
  {
    id: 'transport',
    icon: '電',
    label: 'Transport',
    description: 'Commuter pass and other trips',
    step: 500,
  },
  {
    id: 'leisure',
    icon: '楽',
    label: 'Leisure',
    description: 'Fitness, entertainment and hobbies',
    step: 1000,
  },
  {
    id: 'personal',
    icon: '衣',
    label: 'Shopping and personal care',
    description: 'Clothing, toiletries and extras',
    step: 1000,
  },
  {
    id: 'other',
    icon: '他',
    label: 'Other commitments',
    description: 'Subscriptions, debt or remittances',
    step: 1000,
  },
]

export interface PlanInput {
  income: number
  household: number
  currency: CurrencyCode
  exchangeRate: number
  bufferPercent: number
  expenses: Record<ExpenseId, number>
}

export interface ChartSlice {
  name: string
  amount: number
  color: string
}

export interface IncomeSplitSlice {
  name: string
  amount: number
  percentOfIncome: number
  color: string
}

export interface PlanResult {
  baseExpenses: number
  monthlySpend: number
  monthlySavings: number
  savingsRate: number
  incomeUsedRate: number
  annualSavings: number
  threeMonthSavings: number
  sixMonthSavings: number
  twelveMonthSavings: number
  dailyFlexibleAllowance: number
  convertedSpend: number
  insight: string
  chartSlices: ChartSlice[]
  incomeSplit: IncomeSplitSlice[]
}
