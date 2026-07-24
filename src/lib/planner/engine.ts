import { expenseIds } from './types'
import type { ExpenseId, IncomeSplitSlice, PlanInput, PlanResult } from './types'

const sliceColors = ['#e7a177', '#87b7a7', '#d6c686', '#a9a2d6', '#d88484', '#8db2ce']

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function money(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0)
}

function expenseValue(expenses: Record<ExpenseId, number>, id: ExpenseId): number {
  return money(expenses[id])
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0
  }
  return (numerator / denominator) * 100
}

function buildInsight(monthlySavings: number, income: number): string {
  if (monthlySavings < 0) {
    return `Your plan exceeds take-home pay by ¥${Math.round(Math.abs(monthlySavings)).toLocaleString('en-US')} per month.`
  }

  const savingsRate = income > 0 ? monthlySavings / income : 0
  if (savingsRate < 0.1) {
    return 'Your budget is viable, but leaves a limited emergency margin.'
  }

  return `At this pace, you could save ¥${Math.round(monthlySavings * 12).toLocaleString('en-US')} over 12 months.`
}

function buildIncomeSplit(
  income: number,
  fixedEssentials: number,
  flexibleSpend: number,
  bufferAmount: number,
  monthlySavings: number,
): IncomeSplitSlice[] {
  const deficit = Math.max(0, -monthlySavings)
  const actualSavings = Math.max(0, monthlySavings)
  const denominator = income > 0 ? income : fixedEssentials + flexibleSpend + bufferAmount + deficit

  return [
    { name: 'Fixed essentials', amount: fixedEssentials, percentOfIncome: toPercent(fixedEssentials, denominator), color: '#e7a177' },
    { name: 'Flexible lifestyle', amount: flexibleSpend, percentOfIncome: toPercent(flexibleSpend, denominator), color: '#87b7a7' },
    { name: 'Safety buffer', amount: bufferAmount, percentOfIncome: toPercent(bufferAmount, denominator), color: '#d6c686' },
    {
      name: deficit > 0 ? 'Deficit' : 'Savings',
      amount: deficit > 0 ? deficit : actualSavings,
      percentOfIncome: toPercent(deficit > 0 ? deficit : actualSavings, denominator),
      color: deficit > 0 ? '#d88484' : '#8db2ce',
    },
  ]
}

export function calculatePlan(input: PlanInput): PlanResult {
  const income = money(input.income)
  const household = clamp(Math.floor(input.household || 1), 1, 10)
  const exchangeRate = money(input.exchangeRate)
  const bufferPercent = clamp(money(input.bufferPercent), 0, 20)

  const baseExpenses = expenseIds.reduce((sum, id) => sum + expenseValue(input.expenses, id), 0)
  const fixedEssentials =
    expenseValue(input.expenses, 'rent') +
    expenseValue(input.expenses, 'utilities') +
    expenseValue(input.expenses, 'communications') +
    expenseValue(input.expenses, 'insurance')

  const flexibleSpend =
    expenseValue(input.expenses, 'groceries') +
    expenseValue(input.expenses, 'dining') +
    expenseValue(input.expenses, 'transport') +
    expenseValue(input.expenses, 'leisure') +
    expenseValue(input.expenses, 'personal') +
    expenseValue(input.expenses, 'other')

  const bufferAmount = baseExpenses * (bufferPercent / 100)
  const monthlySpend = baseExpenses + bufferAmount
  const monthlySavings = income - monthlySpend
  const incomeUsedRate = toPercent(monthlySpend, income)
  const savingsRate = income > 0 ? monthlySavings / income : 0

  return {
    baseExpenses,
    monthlySpend,
    monthlySavings,
    savingsRate,
    incomeUsedRate,
    annualSavings: monthlySavings * 12,
    threeMonthSavings: monthlySavings * 3,
    sixMonthSavings: monthlySavings * 6,
    twelveMonthSavings: monthlySavings * 12,
    dailyFlexibleAllowance: flexibleSpend / (30 * household),
    convertedSpend: monthlySpend * exchangeRate,
    insight: buildInsight(monthlySavings, income),
    chartSlices: [
      { name: 'Housing', amount: expenseValue(input.expenses, 'rent') + expenseValue(input.expenses, 'utilities') + expenseValue(input.expenses, 'communications'), color: sliceColors[0] },
      { name: 'Food', amount: expenseValue(input.expenses, 'groceries') + expenseValue(input.expenses, 'dining'), color: sliceColors[1] },
      { name: 'Transport', amount: expenseValue(input.expenses, 'transport'), color: sliceColors[2] },
      { name: 'Health', amount: expenseValue(input.expenses, 'insurance'), color: sliceColors[3] },
      { name: 'Lifestyle', amount: expenseValue(input.expenses, 'leisure') + expenseValue(input.expenses, 'personal'), color: sliceColors[4] },
      { name: 'Other + buffer', amount: expenseValue(input.expenses, 'other') + bufferAmount, color: sliceColors[5] },
    ],
    incomeSplit: buildIncomeSplit(income, fixedEssentials, flexibleSpend, bufferAmount, monthlySavings),
  }
}
