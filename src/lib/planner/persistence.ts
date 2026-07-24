import { expenseIds } from './types'
import type { CurrencyCode, ExpenseId, PlanInput } from './types'
import { currencyRates } from './presets'

const storageKey = 'tokyoLivingPlan-v2'
const currencyCodes: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'NOK', 'AUD', 'CAD', 'SGD']

function asNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return value
}

function asCurrency(value: unknown, fallback: CurrencyCode): CurrencyCode {
  if (typeof value !== 'string') {
    return fallback
  }
  return currencyCodes.includes(value as CurrencyCode) ? (value as CurrencyCode) : fallback
}

function parseExpenseRecord(value: unknown, fallback: Record<ExpenseId, number>): Record<ExpenseId, number> {
  if (typeof value !== 'object' || value === null) {
    return { ...fallback }
  }

  const maybeExpenses = value as Record<string, unknown>
  const parsed = { ...fallback }
  for (const id of expenseIds) {
    parsed[id] = Math.max(0, asNumber(maybeExpenses[id], fallback[id]))
  }
  return parsed
}

export function loadPlanDraft(defaultInput: PlanInput): PlanInput {
  const raw = localStorage.getItem(storageKey)
  if (!raw) {
    return defaultInput
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    console.error('Stored plan could not be parsed and will be ignored.', error)
    return defaultInput
  }

  if (typeof parsed !== 'object' || parsed === null) {
    console.error('Stored plan has an invalid shape and will be ignored.')
    return defaultInput
  }

  const data = parsed as Record<string, unknown>
  const currency = asCurrency(data.currency, defaultInput.currency)

  return {
    income: Math.max(0, asNumber(data.income, defaultInput.income)),
    household: Math.min(10, Math.max(1, Math.round(asNumber(data.household, defaultInput.household)))),
    currency,
    exchangeRate: Math.max(0, asNumber(data.exchangeRate, currencyRates[currency])),
    bufferPercent: Math.min(20, Math.max(0, asNumber(data.bufferPercent, defaultInput.bufferPercent))),
    expenses: parseExpenseRecord(data.expenses, defaultInput.expenses),
  }
}

export function savePlanDraft(input: PlanInput): void {
  localStorage.setItem(storageKey, JSON.stringify(input))
}

export function clearPlanDraft(): void {
  localStorage.removeItem(storageKey)
}
