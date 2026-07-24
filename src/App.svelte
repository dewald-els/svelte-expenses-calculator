<script lang="ts">
  import ExpenseDonut from "./lib/components/ExpenseDonut.svelte";
  import { calculatePlan } from "./lib/planner/engine";
  import {
    clearPlanDraft,
    loadPlanDraft,
    savePlanDraft,
  } from "./lib/planner/persistence";
  import {
    createDefaultPlanInput,
    currencyRates,
    findMatchingPresetName,
    presetExpenses,
  } from "./lib/planner/presets";
  import {
    fixedExpenseFields,
    flexibleExpenseFields,
    type CurrencyCode,
    type EmploymentDurationBand,
    type ExpenseId,
    type IncomeInputMode,
    type LifestylePresetName,
    type PlanInput,
    type TaxProfileMode,
    type TaxResidency,
  } from "./lib/planner/types";

  const defaultInput = createDefaultPlanInput();
  const presetOptions: Array<{
    name: LifestylePresetName;
    icon: string;
    description: string;
  }> = [
    { name: "lean", icon: "節", description: "Share house, home cooking" },
    {
      name: "balanced",
      icon: "暮",
      description: "Compact flat, mixed lifestyle",
    },
    {
      name: "comfortable",
      icon: "余",
      description: "Central flat, frequent outings",
    },
  ];
  const currencyOptions = Object.keys(currencyRates) as CurrencyCode[];
  const durationOptions: Array<{
    value: EmploymentDurationBand;
    label: string;
  }> = [
    { value: "under1Year", label: "Less than 1 year" },
    { value: "oneToFiveYears", label: "1 to 5 years" },
    { value: "overFiveYears", label: "More than 5 years" },
  ];

  const initialPlanInput = loadPlanDraft(defaultInput);
  let planInput = $state<PlanInput>(initialPlanInput);
  let activePreset = $state<LifestylePresetName | null>(
    findMatchingPresetName(initialPlanInput.expenses),
  );
  let saveStatus = $state("Live estimate");

  let planResult = $derived.by(() => calculatePlan($state.snapshot(planInput)));

  function formatYen(amount: number): string {
    return `¥${Math.round(amount).toLocaleString("en-US")}`;
  }

  function formatPercent(percent: number): string {
    return `${percent.toFixed(1)}%`;
  }

  function formatRate(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  function clampNumber(value: string, min = 0): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return min;
    }
    return Math.max(min, numeric);
  }

  function inputValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  function selectValue(event: Event): string {
    return (event.currentTarget as HTMLSelectElement).value;
  }

  function updateIncome(value: string): void {
    activePreset = null;
    planInput.income = clampNumber(value);
  }

  function updateIncomeMode(mode: IncomeInputMode): void {
    planInput.incomeMode = mode;
  }

  function updateYearlyGrossIncome(value: string): void {
    activePreset = null;
    planInput.yearlyGrossIncome = clampNumber(value);
  }

  function updateTaxProfileMode(mode: TaxProfileMode): void {
    planInput.taxAssumptions.profileMode = mode;
  }

  function updateDurationBand(value: string): void {
    planInput.taxAssumptions.employmentDurationBand =
      value as EmploymentDurationBand;
  }

  function updateHousehold(value: string): void {
    activePreset = null;
    const next = Math.round(clampNumber(value, 1));
    planInput.household = Math.min(10, Math.max(1, next));
  }

  function stepHousehold(direction: number): void {
    updateHousehold(String(planInput.household + direction));
  }

  function updateCurrency(value: string): void {
    const currency = value as CurrencyCode;
    planInput.currency = currency;
    planInput.exchangeRate = currencyRates[currency] ?? planInput.exchangeRate;
  }

  function updateExchangeRate(value: string): void {
    planInput.exchangeRate = clampNumber(value);
  }

  function updateTaxResidency(value: string): void {
    planInput.taxAssumptions.residency = value as TaxResidency;
  }

  function updateFirstYearInJapan(checked: boolean): void {
    planInput.taxAssumptions.firstYearInJapan = checked;
  }

  function updateExpense(id: ExpenseId, value: string): void {
    activePreset = null;
    planInput.expenses[id] = clampNumber(value);
  }

  function updateBuffer(value: string): void {
    planInput.bufferPercent = Math.min(20, clampNumber(value));
  }

  function updateSavingsGoalPercent(value: string): void {
    planInput.savingsGoalPercent = Math.min(70, clampNumber(value));
  }

  function applyPreset(name: LifestylePresetName): void {
    activePreset = name;
    planInput.expenses = { ...presetExpenses[name] };
  }

  function savePlan(): void {
    savePlanDraft(planInput);
    saveStatus = "Saved on device";
    window.setTimeout(() => {
      saveStatus = "Live estimate";
    }, 1600);
  }

  function resetPlan(): void {
    clearPlanDraft();
    planInput = createDefaultPlanInput();
    activePreset = "balanced";
    saveStatus = "Live estimate";
  }
</script>

<header class="site-header">
  <a class="brand" href="/">
    <span class="brand-mark">東</span>
    <span>Tokyo Living</span>
  </a>
  <div class="header-actions">
    <button class="ghost-button" type="button" onclick={resetPlan}>Reset</button
    >
    <button class="primary-button" type="button" onclick={savePlan}
      >Save plan</button
    >
  </div>
</header>

<main class="app-shell">
  <section class="hero">
    <div>
      <div class="eyebrow">MONTHLY COST-OF-LIVING PLANNER</div>
      <h1>Plan your life in Tokyo,<br /><span>not just the move.</span></h1>
      <p>
        Estimate monthly spending, test rent and lifestyle scenarios, and
        calculate how much you can save from your take-home pay.
      </p>
    </div>
    <div class="hero-stamp">
      <span>生活</span>
      <small>LIVING<br />PLANNER</small>
    </div>
  </section>

  <section class="preset-row" aria-label="Lifestyle presets">
    {#each presetOptions as preset (preset.name)}
      <button
        class={["preset-card", { active: activePreset === preset.name }]}
        type="button"
        onclick={() => applyPreset(preset.name)}
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
        <div class="field full">
          <span>Income basis</span>
          <div class="mode-toggle" role="group" aria-label="Income basis">
            <button
              type="button"
              class={[
                "mode-button",
                { active: planInput.incomeMode === "monthlyTakeHome" },
              ]}
              onclick={() => updateIncomeMode("monthlyTakeHome")}
            >
              Monthly take-home
            </button>
            <button
              type="button"
              class={[
                "mode-button",
                { active: planInput.incomeMode === "yearlyGross" },
              ]}
              onclick={() => updateIncomeMode("yearlyGross")}
            >
              Yearly gross (before tax)
            </button>
          </div>
        </div>

        {#if planInput.incomeMode === "monthlyTakeHome"}
          <label class="field">
            <span>Monthly take-home pay</span>
            <div class="money-input">
              <span>¥</span>
              <input
                type="number"
                min="0"
                step="5000"
                value={planInput.income}
                oninput={(event) => updateIncome(inputValue(event))}
              />
            </div>
          </label>
        {:else}
          <label class="field">
            <span>Yearly gross income (before tax)</span>
            <div class="money-input">
              <span>¥</span>
              <input
                type="number"
                min="0"
                step="50000"
                value={planInput.yearlyGrossIncome}
                oninput={(event) => updateYearlyGrossIncome(inputValue(event))}
              />
            </div>
          </label>
        {/if}

        <label class="field">
          <span>People in household</span>
          <div class="stepper">
            <button type="button" onclick={() => stepHousehold(-1)}>−</button>
            <input
              type="number"
              min="1"
              max="10"
              value={planInput.household}
              oninput={(event) => updateHousehold(inputValue(event))}
            />
            <button type="button" onclick={() => stepHousehold(1)}>+</button>
          </div>
        </label>

        {#if planInput.incomeMode === "yearlyGross"}
          <div class="field full tax-grid">
            <div class="field">
              <span>Tax setup mode</span>
              <div class="mode-toggle" role="group" aria-label="Tax setup mode">
                <button
                  type="button"
                  class={[
                    "mode-button",
                    { active: planInput.taxAssumptions.profileMode === "auto" },
                  ]}
                  onclick={() => updateTaxProfileMode("auto")}
                >
                  Auto from duration
                </button>
                <button
                  type="button"
                  class={[
                    "mode-button",
                    {
                      active: planInput.taxAssumptions.profileMode === "manual",
                    },
                  ]}
                  onclick={() => updateTaxProfileMode("manual")}
                >
                  Manual
                </button>
              </div>
            </div>

            {#if planInput.taxAssumptions.profileMode === "auto"}
              <label class="field">
                <span>Duration of employment in Japan</span>
                <select
                  value={planInput.taxAssumptions.employmentDurationBand}
                  onchange={(event) => updateDurationBand(selectValue(event))}
                >
                  {#each durationOptions as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </label>
            {/if}

            <label class="field">
              <span>Tax residency assumption</span>
              <select
                value={planInput.taxAssumptions.residency}
                onchange={(event) => updateTaxResidency(selectValue(event))}
                disabled={planInput.taxAssumptions.profileMode === "auto"}
              >
                <option value="resident">Resident taxpayer</option>
                <option value="nonResident">Non-resident taxpayer</option>
              </select>
            </label>

            <label class="check-row">
              <input
                type="checkbox"
                checked={planInput.taxAssumptions.firstYearInJapan}
                onchange={(event) =>
                  updateFirstYearInJapan(
                    (event.currentTarget as HTMLInputElement).checked,
                  )}
                disabled={planInput.taxAssumptions.profileMode === "auto" ||
                  planInput.taxAssumptions.residency === "nonResident"}
              />
              First year in Japan (no prior-year inhabitant tax assumed)
            </label>
          </div>
        {/if}

        <label class="field full">
          <span>Home currency</span>
          <select
            value={planInput.currency}
            onchange={(event) => updateCurrency(selectValue(event))}
          >
            {#each currencyOptions as currency (currency)}
              <option value={currency}>{currency}</option>
            {/each}
          </select>
        </label>
      </div>

      {#if planResult.takeHomeEstimate}
        <div class="tax-note">
          <strong
            >Estimated monthly take-home: {formatYen(
              planResult.effectiveMonthlyIncome,
            )}</strong
          >
          <small>
            Gross {formatYen(planResult.takeHomeEstimate.monthlyGross)} − income
            tax {formatYen(planResult.takeHomeEstimate.monthlyIncomeTax)}
            {#if planResult.takeHomeEstimate.monthlyResidentTax > 0}
              − inhabitant tax {formatYen(
                planResult.takeHomeEstimate.monthlyResidentTax,
              )}
            {/if}
            − social insurance {formatYen(
              planResult.takeHomeEstimate.monthlySocialInsurance,
            )}
            − employment insurance {formatYen(
              planResult.takeHomeEstimate.monthlyEmploymentInsurance,
            )}. Tax profile:
            {planResult.takeHomeEstimate?.profileMode === "auto"
              ? `Auto (${durationOptions.find((option) => option.value === planResult.takeHomeEstimate?.employmentDurationBand)?.label ?? "Duration based"})`
              : "Manual"}
            , residency {planResult.takeHomeEstimate?.appliedResidency ===
            "resident"
              ? "resident"
              : "non-resident"}, first-year adjustment {planResult
              .takeHomeEstimate?.appliedFirstYearInJapan
              ? "on"
              : "off"}, bracket {planResult.takeHomeEstimate?.taxBracketLabel ??
              "n/a"} (marginal {formatRate(
              planResult.takeHomeEstimate?.marginalIncomeTaxRate ?? 0,
            )}). Assumptions: social {formatRate(
              planInput.taxAssumptions.socialInsuranceRate,
            )}, employment {formatRate(
              planInput.taxAssumptions.employmentInsuranceRate,
            )}, resident tax {formatRate(
              planInput.taxAssumptions.residentTaxRate,
            )}.
          </small>
        </div>
      {/if}

      <div class="divider"></div>
      <div class="section-row">
        <div>
          <p class="section-kicker">FIXED COSTS</p>
          <h3>Home and essentials</h3>
        </div>
        <span>Monthly</span>
      </div>
      <div class="cost-list">
        {#each fixedExpenseFields as field (field.id)}
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
                oninput={(event) => updateExpense(field.id, inputValue(event))}
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
        {#each flexibleExpenseFields as field (field.id)}
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
                oninput={(event) => updateExpense(field.id, inputValue(event))}
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
          oninput={(event) => updateBuffer(inputValue(event))}
        />
        <div class="range-labels">
          <span>0%</span><span>10%</span><span>20%</span>
        </div>
      </div>
    </div>

    <aside class="panel results-panel">
      <p class="section-kicker light">Monthly spend outlook</p>
      <div class="total-yen">
        <span class="total-value">{formatYen(planResult.monthlySpend)}</span><span class="total-unit"
          >/ month</span
        >
      </div>
      {#if planResult.monthlySavings >= 0}
        <p class="outlook-summary">
          That's {formatPercent(planResult.incomeUsedRate)} of your {formatYen(
            planResult.effectiveMonthlyIncome,
          )} take-home, leaving
          <strong>{formatYen(planResult.monthlySavings)}</strong> to save each month.
        </p>
      {:else}
        <p class="outlook-summary over">
          That's {formatPercent(planResult.incomeUsedRate)} of your {formatYen(
            planResult.effectiveMonthlyIncome,
          )} take-home, over budget by
          <strong>{formatYen(Math.abs(planResult.monthlySavings))}</strong> each
          month.
        </p>
      {/if}
      <p class="exchange-note">
        Total monthly spend = base expenses + unexpected-expense buffer
      </p>
      <div class="spend-breakdown">
        <div>
          <span>Base expenses</span>
          <strong>{formatYen(planResult.baseExpenses)}</strong>
        </div>
        <div>
          <span>Buffer amount</span>
          <strong
            >{formatYen(
              planResult.monthlySpend - planResult.baseExpenses,
            )}</strong
          >
        </div>
      </div>
      <div class="summary-stats three">
        <div>
          <span>Income basis</span><strong
            >{formatYen(planResult.effectiveMonthlyIncome)}</strong
          >
        </div>
        <div>
          <span>Actual savings (current plan)</span><strong
            >{formatYen(planResult.monthlySavings)}</strong
          >
        </div>
        <div>
          <span>Savings rate</span><strong
            >{formatPercent(planResult.savingsRate * 100)}</strong
          >
        </div>
        <div>
          <span>Annual savings</span><strong
            >{formatYen(planResult.annualSavings)}</strong
          >
        </div>
      </div>

      <div class="goal-card">
        <div class="goal-head">
          <span>Savings target</span>
          <strong>{planInput.savingsGoalPercent}%</strong>
        </div>
        <input
          type="range"
          min="0"
          max="70"
          value={planInput.savingsGoalPercent}
          oninput={(event) => updateSavingsGoalPercent(inputValue(event))}
        />
        <div class="range-labels">
          <span>0%</span><span>35%</span><span>70%</span>
        </div>
        <div class="goal-stats">
          <div>
            <span>Projected savings / month</span>
            <strong>{formatYen(planResult.targetMonthlySavings)}</strong>
          </div>
          <div>
            <span>Spend budget to hit target</span>
            <strong>{formatYen(planResult.targetMonthlySpend)}</strong>
          </div>
          <div>
            <span>Disposable income / month</span>
            <strong>{formatYen(planResult.savingsGoalGap)}</strong>
          </div>
        </div>
        <small>
          Based on effective monthly take-home after tax at {planInput.savingsGoalPercent}%.
          Spend budget = income - projected savings. Disposable income = spend
          budget - your current monthly spend.
          {#if planResult.savingsGoalGap >= 0}
            You are {formatYen(planResult.savingsGoalGap)} above this goal.
          {:else}
            You need {formatYen(Math.abs(planResult.savingsGoalGap))} more per month
            to hit this goal.
          {/if}
        </small>
      </div>
      <div class="progress-block">
        <div>
          <span>Income used</span><strong
            >{formatPercent(planResult.incomeUsedRate)}</strong
          >
        </div>
        <div class="progress-track">
          <span style={`width:${Math.min(100, planResult.incomeUsedRate)}%`}
          ></span>
        </div>
      </div>

      <ExpenseDonut
        slices={planResult.chartSlices}
        total={planResult.monthlySpend}
      />

      <div class="legend">
        {#each planResult.chartSlices as slice (slice.name)}
          <div class="legend-item">
            <span><i style={`background:${slice.color}`}></i>{slice.name}</span>
            <strong
              >{Math.round(
                (slice.amount / Math.max(planResult.monthlySpend, 1)) * 100,
              )}%</strong
            >
          </div>
        {/each}
      </div>

      <div class="income-split-card">
        <strong>Income split</strong>
        {#each planResult.incomeSplit as split (split.name)}
          <div class="split-row">
            <span>{split.name}</span>
            <span>{formatPercent(split.percentOfIncome)}</span>
          </div>
          <div class="split-track">
            <span
              style={`width:${Math.min(100, split.percentOfIncome)}%;background:${split.color}`}
            ></span>
          </div>
        {/each}
      </div>

      <div class="rate-box">
        <label for="exchange-rate-input">1 JPY equals</label>
        <div>
          <input
            id="exchange-rate-input"
            type="number"
            min="0"
            step="0.0001"
            value={planInput.exchangeRate}
            oninput={(event) => updateExchangeRate(inputValue(event))}
          />
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
        These projections assume your income and monthly expenses stay constant.
        Change any input above to test another scenario.
      </p>
    </div>
    <div class="projection-grid">
      <article>
        <span>3 months</span><strong
          >{formatYen(planResult.threeMonthSavings)}</strong
        ><small>Potential savings</small>
      </article>
      <article>
        <span>6 months</span><strong
          >{formatYen(planResult.sixMonthSavings)}</strong
        ><small>Potential savings</small>
      </article>
      <article>
        <span>12 months</span><strong
          >{formatYen(planResult.twelveMonthSavings)}</strong
        ><small>Potential savings</small>
      </article>
      <article>
        <span>Daily allowance</span><strong
          >{formatYen(planResult.dailyFlexibleAllowance)}</strong
        ><small>Flexible spending per day, per person</small>
      </article>
    </div>
  </section>
</main>

<footer>
  <span>Tokyo Monthly Living Planner</span>
  <span
    >All figures are planning assumptions. Gross-to-net mode uses simplified tax
    rules and should be verified against official notices.</span
  >
</footer>
