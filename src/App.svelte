<script lang="ts">
  import ExpenseDonut from './lib/components/ExpenseDonut.svelte'
  import { calculatePlan } from './lib/planner/engine'
  import { clearPlanDraft, loadPlanDraft, savePlanDraft } from './lib/planner/persistence'
  import {
    createDefaultPlanInput,
    currencyRates,
    findMatchingPresetName,
    presetExpenses,
  } from './lib/planner/presets'
  import {
    fixedExpenseFields,
    flexibleExpenseFields,
    type CurrencyCode,
    type ExpenseId,
    type LifestylePresetName,
    type PlanInput,
  } from './lib/planner/types'

  const defaultInput = createDefaultPlanInput()
  const presetOptions: Array<{ name: LifestylePresetName; icon: string; description: string }> = [
    { name: 'lean', icon: '節', description: 'Share house, home cooking' },
    { name: 'balanced', icon: '暮', description: 'Compact flat, mixed lifestyle' },
    { name: 'comfortable', icon: '余', description: 'Central flat, frequent outings' },
  ]

  let planInput: PlanInput = loadPlanDraft(defaultInput)
  let activePreset: LifestylePresetName | null = findMatchingPresetName(planInput.expenses)
  let saveStatus = 'Live estimate'

  $: planResult = calculatePlan(planInput)

  function formatYen(amount: number): string {
    return `¥${Math.round(amount).toLocaleString('en-US')}`
  }

  function formatPercent(percent: number): string {
    return `${percent.toFixed(1)}%`
  }

  function clampNumber(value: string, min = 0): number {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      return min
    }
    return Math.max(min, numeric)
  }

  function updateIncome(value: string): void {
    activePreset = null
    planInput = { ...planInput, income: clampNumber(value) }
  }

  function updateHousehold(value: string): void {
    activePreset = null
    const next = Math.round(clampNumber(value, 1))
    planInput = { ...planInput, household: Math.min(10, Math.max(1, next)) }
  }

  function stepHousehold(direction: number): void {
    updateHousehold(String(planInput.household + direction))
  }

  function updateCurrency(value: string): void {
    const currency = value as CurrencyCode
    planInput = {
      ...planInput,
      currency,
      exchangeRate: currencyRates[currency] ?? planInput.exchangeRate,
    }
  }

  function updateExchangeRate(value: string): void {
    planInput = { ...planInput, exchangeRate: clampNumber(value) }
  }

  function updateExpense(id: ExpenseId, value: string): void {
    activePreset = null
    planInput = {
      ...planInput,
      expenses: {
        ...planInput.expenses,
        [id]: clampNumber(value),
      },
    }
  }

  function updateBuffer(value: string): void {
    planInput = { ...planInput, bufferPercent: Math.min(20, clampNumber(value)) }
  }

  function applyPreset(name: LifestylePresetName): void {
    activePreset = name
    planInput = {
      ...planInput,
      expenses: { ...presetExpenses[name] },
    }
  }

  function savePlan(): void {
    savePlanDraft(planInput)
    saveStatus = 'Saved on device'
    window.setTimeout(() => {
      saveStatus = 'Live estimate'
    }, 1600)
  }

  function resetPlan(): void {
    clearPlanDraft()
    planInput = createDefaultPlanInput()
    activePreset = 'balanced'
    saveStatus = 'Live estimate'
  }
</script>

<header class="site-header">
  <a class="brand" href="/">
    <span class="brand-mark">東</span>
    <span>Tokyo Living</span>
  </a>
  <div class="header-actions">
    <button class="ghost-button" type="button" on:click={resetPlan}>Reset</button>
    <button class="primary-button" type="button" on:click={savePlan}>Save plan</button>
  </div>
</header>

<main class="app-shell">
  <section class="hero">
    <div>
      <div class="eyebrow">MONTHLY COST-OF-LIVING PLANNER</div>
      <h1>Plan your life in Tokyo,<br /><span>not just the move.</span></h1>
      <p>
        Estimate monthly spending, test rent and lifestyle scenarios, and calculate how much you can
        save from your take-home pay.
      </p>
    </div>
    <div class="hero-stamp">
      <span>生活</span>
      <small>LIVING<br />PLANNER</small>
    </div>
  </section>

  <section class="preset-row" aria-label="Lifestyle presets">
    {#each presetOptions as preset}
      <button
        class="preset-card"
        class:active={activePreset === preset.name}
        type="button"
        on:click={() => applyPreset(preset.name)}
      >
        <span class="preset-icon">{preset.icon}</span>
        <span>
          <strong>{preset.name[0].toUpperCase() + preset.name.slice(1)}</strong>
          <small>{preset.description}</small>
        </span>
      </button>
    {/each}
  </section>

  <section class="workspace">
    <div class="panel inputs-panel">
      <div class="panel-heading">
        <div>
          <p class="section-kicker">YOUR MONTH</p>
          <h2>Income and expenses</h2>
        </div>
        <span class="status-pill">{saveStatus}</span>
      </div>

      <div class="form-grid">
        <label class="field">
          <span>Monthly take-home pay</span>
          <div class="money-input">
            <span>¥</span>
            <input type="number" min="0" step="5000" value={planInput.income} on:input={(event) => updateIncome((event.currentTarget as HTMLInputElement).value)} />
          </div>
        </label>
        <label class="field">
          <span>People in household</span>
          <div class="stepper">
            <button type="button" on:click={() => stepHousehold(-1)}>−</button>
            <input type="number" min="1" max="10" value={planInput.household} on:input={(event) => updateHousehold((event.currentTarget as HTMLInputElement).value)} />
            <button type="button" on:click={() => stepHousehold(1)}>+</button>
          </div>
        </label>
        <label class="field full">
          <span>Home currency</span>
          <select value={planInput.currency} on:change={(event) => updateCurrency((event.currentTarget as HTMLSelectElement).value)}>
            {#each Object.keys(currencyRates) as currency}
              <option value={currency}>{currency}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="divider"></div>
      <div class="section-row">
        <div>
          <p class="section-kicker">FIXED COSTS</p>
          <h3>Home and essentials</h3>
        </div>
        <span>Monthly</span>
      </div>
      <div class="cost-list">
        {#each fixedExpenseFields as field}
          <div class="cost-row">
            <div class="cost-label">
              <span class="cost-icon">{field.icon}</span>
              <div>
                <strong>{field.label}</strong>
                <small>{field.description}</small>
              </div>
            </div>
            <div class="money-input">
              <span>¥</span>
              <input
                type="number"
                min="0"
                step={field.step}
                value={planInput.expenses[field.id]}
                on:input={(event) => updateExpense(field.id, (event.currentTarget as HTMLInputElement).value)}
              />
            </div>
          </div>
        {/each}
      </div>

      <div class="section-row spaced">
        <div>
          <p class="section-kicker">FLEXIBLE COSTS</p>
          <h3>Daily life</h3>
        </div>
        <span>Monthly</span>
      </div>
      <div class="cost-list">
        {#each flexibleExpenseFields as field}
          <div class="cost-row">
            <div class="cost-label">
              <span class="cost-icon">{field.icon}</span>
              <div>
                <strong>{field.label}</strong>
                <small>{field.description}</small>
              </div>
            </div>
            <div class="money-input">
              <span>¥</span>
              <input
                type="number"
                min="0"
                step={field.step}
                value={planInput.expenses[field.id]}
                on:input={(event) => updateExpense(field.id, (event.currentTarget as HTMLInputElement).value)}
              />
            </div>
          </div>
        {/each}
      </div>

      <div class="buffer-card">
        <div>
          <span>Unexpected-expense buffer</span>
          <strong>{planInput.bufferPercent}%</strong>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          value={planInput.bufferPercent}
          on:input={(event) => updateBuffer((event.currentTarget as HTMLInputElement).value)}
        />
        <div class="range-labels"><span>0%</span><span>10%</span><span>20%</span></div>
      </div>
    </div>

    <aside class="panel results-panel">
      <p class="section-kicker light">MONTHLY OUTLOOK</p>
      <div class="total-yen">{formatYen(planResult.monthlySpend)}</div>
      <div class="converted-total">{planInput.currency} {Math.round(planResult.convertedSpend).toLocaleString('en-US')}</div>
      <p class="exchange-note">Estimated monthly spending including buffer</p>
      <div class="summary-stats three">
        <div><span>Available to save</span><strong>{formatYen(planResult.monthlySavings)}</strong></div>
        <div><span>Savings rate</span><strong>{formatPercent(planResult.savingsRate * 100)}</strong></div>
        <div><span>Annual savings</span><strong>{formatYen(planResult.annualSavings)}</strong></div>
      </div>
      <div class="progress-block">
        <div><span>Income used</span><strong>{formatPercent(planResult.incomeUsedRate)}</strong></div>
        <div class="progress-track">
          <span style={`width:${Math.min(100, planResult.incomeUsedRate)}%`}></span>
        </div>
      </div>

      <ExpenseDonut slices={planResult.chartSlices} total={planResult.monthlySpend} />

      <div class="legend">
        {#each planResult.chartSlices as slice}
          <div class="legend-item">
            <span><i style={`background:${slice.color}`}></i>{slice.name}</span>
            <strong>{Math.round((slice.amount / Math.max(planResult.monthlySpend, 1)) * 100)}%</strong>
          </div>
        {/each}
      </div>

      <div class="income-split-card">
        <strong>Income split</strong>
        {#each planResult.incomeSplit as split}
          <div class="split-row">
            <span>{split.name}</span>
            <span>{formatPercent(split.percentOfIncome)}</span>
          </div>
          <div class="split-track">
            <span style={`width:${Math.min(100, split.percentOfIncome)}%;background:${split.color}`}></span>
          </div>
        {/each}
      </div>

      <div class="rate-box">
        <label for="exchange-rate-input">1 JPY equals</label>
        <div>
          <input id="exchange-rate-input" type="number" min="0" step="0.0001" value={planInput.exchangeRate} on:input={(event) => updateExchangeRate((event.currentTarget as HTMLInputElement).value)} />
          <span>{planInput.currency}</span>
        </div>
      </div>
      <div class="insight-card">
        <span class="insight-symbol">↗</span>
        <div>
          <strong>Planning insight</strong>
          <p>{planResult.insight}</p>
        </div>
      </div>
    </aside>
  </section>

  <section class="projection-section">
    <div class="tips-heading">
      <div>
        <p class="section-kicker">SAVINGS FORECAST</p>
        <h2>What this means over time</h2>
      </div>
      <p>
        These projections assume your income and monthly expenses stay constant. Change any input
        above to test another scenario.
      </p>
    </div>
    <div class="projection-grid">
      <article><span>3 months</span><strong>{formatYen(planResult.threeMonthSavings)}</strong><small>Potential savings</small></article>
      <article><span>6 months</span><strong>{formatYen(planResult.sixMonthSavings)}</strong><small>Potential savings</small></article>
      <article><span>12 months</span><strong>{formatYen(planResult.twelveMonthSavings)}</strong><small>Potential savings</small></article>
      <article><span>Daily allowance</span><strong>{formatYen(planResult.dailyFlexibleAllowance)}</strong><small>Flexible spending per day, per person</small></article>
    </div>
  </section>
</main>

<footer>
  <span>Tokyo Monthly Living Planner</span>
  <span>All figures are editable planning assumptions. Taxes and payroll deductions should be reflected in take-home pay.</span>
</footer>
