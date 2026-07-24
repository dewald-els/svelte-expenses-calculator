import type { CurrencyCode, ExpenseId, LifestylePresetName, PlanInput } from './types'

export const currencyRates: Record<CurrencyCode, number> = {
  USD: 0.0067,
  EUR: 0.0062,
  GBP: 0.0053,
  NOK: 0.069,
  AUD: 0.0102,
  CAD: 0.0092,
  SGD: 0.009,
}

export const presetExpenses: Record<LifestylePresetName, Record<ExpenseId, number>> = {
  lean: {
    rent: 70000,
    utilities: 10000,
    communications: 6000,
    insurance: 5000,
    groceries: 32000,
    dining: 10000,
    transport: 9000,
    leisure: 8000,
    personal: 7000,
    other: 3000,
  },
  balanced: {
    rent: 110000,
    utilities: 13000,
    communications: 8000,
    insurance: 6000,
    groceries: 45000,
    dining: 25000,
    transport: 12000,
    leisure: 18000,
    personal: 12000,
    other: 5000,
  },
  comfortable: {
    rent: 175000,
    utilities: 18000,
    communications: 10000,
    insurance: 10000,
    groceries: 65000,
    dining: 50000,
    transport: 18000,
    leisure: 40000,
    personal: 25000,
    other: 12000,
  },
}

export function createDefaultPlanInput(): PlanInput {
  return {
    income: 320000,
    household: 1,
    currency: 'NOK',
    exchangeRate: currencyRates.NOK,
    bufferPercent: 5,
    expenses: { ...presetExpenses.balanced },
  }
}

export function findMatchingPresetName(expenses: Record<ExpenseId, number>): LifestylePresetName | null {
  const names: LifestylePresetName[] = ['lean', 'balanced', 'comfortable']
  for (const name of names) {
    const preset = presetExpenses[name]
    if (Object.keys(preset).every((id) => preset[id as ExpenseId] === expenses[id as ExpenseId])) {
      return name
    }
  }
  return null
}
