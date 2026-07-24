<script lang="ts">
  import ExpenseDonut from "./lib/components/ExpenseDonut.svelte";
  import Icon from "./lib/components/Icon.svelte";
  import MoneyInput from "./lib/components/MoneyInput.svelte";
  import { calculatePlan } from "./lib/planner/engine";
  import {
    clearPlanDraft,
    loadPlanDraft,
    savePlanDraft,
  } from "./lib/planner/persistence";
  import {
    computePresetExpenses,
    createDefaultPlanInput,
    findMatchingPresetName,
    presetExpenses,
  } from "./lib/planner/presets";
  import {
    fixedExpenseFields,
    flexibleExpenseFields,
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
    { name: "custom", icon: "定", description: "Start from scratch" },
  ];
  const sectionIcons = {
    income: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></g>`,
    savingsAndBuffer: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1zm5-7h.01M2 8v1a2 2 0 0 0 2 2h1"/>`,
    monthlyExpenses: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></g>`,
    monthlySummary: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7m-7 5h7m-7 6h7m-7 5h7"/></g>`,
    savingsForecast: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9l-5 5l-4-4l-3 3"/></g>`,
    spendBreakdown: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/></g>`,
    incomeSplit: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M16 3h5v5M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3m12 6l6-6"/></g>`,
    taxBreakdown: `<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2zm-10-2h.01M12 7v4"/>`,
  };
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
    const rounded = Math.round(amount);
    const formatted = Math.abs(rounded).toLocaleString("fr-FR").replace(/\u00a0/g, " ");
    if (rounded < 0) {
      return `-¥${formatted}`;
    }
    return `¥${formatted}`;
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
    activePreset = "custom";
    planInput.income = clampNumber(value);
  }

  function updateIncomeMode(mode: IncomeInputMode): void {
    planInput.incomeMode = mode;
  }

  function updateYearlyGrossIncome(value: string): void {
    activePreset = "custom";
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
    activePreset = "custom";
    const next = Math.round(clampNumber(value, 1));
    planInput.household = Math.min(10, Math.max(1, next));
  }

  function stepHousehold(direction: number): void {
    updateHousehold(String(planInput.household + direction));
  }

  function updateTaxResidency(value: string): void {
    planInput.taxAssumptions.residency = value as TaxResidency;
  }

  function updateFirstYearInJapan(checked: boolean): void {
    planInput.taxAssumptions.firstYearInJapan = checked;
  }

  function updateExpense(id: ExpenseId, value: string): void {
    activePreset = "custom";
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
    const income = planInput.incomeMode === "yearlyGross"
      ? (planResult?.effectiveMonthlyIncome ?? planInput.income)
      : planInput.income;
    planInput.expenses = computePresetExpenses(
      name,
      income,
      planInput.bufferPercent,
      planInput.savingsGoalPercent,
    );
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

  function allExpenseFields() {
    return [
      { group: "Fixed costs", fields: fixedExpenseFields },
      { group: "Flexible costs", fields: flexibleExpenseFields },
    ];
  }
</script>

<div class="min-h-screen flex flex-col">
  <!-- Toolbar -->
  <header class="border-b border-gray-300 bg-white">
    <div class="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="text-lg font-semibold text-gray-900">Japan Cost of Living Planner</span>
        <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{saveStatus}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onclick={resetPlan}
        >
          Reset
        </button>
        <button
          type="button"
          class="rounded border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          onclick={savePlan}
        >
          Save plan
        </button>
      </div>
    </div>
  </header>

  <!-- Preset tabs -->
  <nav class="border-b border-gray-300 bg-gray-50 px-4">
    <div class="flex gap-1">
      <span class="flex items-center px-2 py-2 text-xs font-semibold text-gray-500 uppercase">Preset</span>
      {#each presetOptions as preset (preset.name)}
        <button
          type="button"
          class={[
            "border-b-2 px-4 py-2 text-xs font-medium",
            activePreset === preset.name
              ? "border-blue-600 bg-white text-blue-700"
              : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
          ]}
          onclick={() => applyPreset(preset.name)}
        >
          <span class="mr-1">{preset.icon}</span>
          {preset.name[0].toUpperCase() + preset.name.slice(1)}
        </button>
      {/each}
    </div>
  </nav>

  <main class="flex-1 overflow-auto p-4">
    <div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
      <!-- Spreadsheet -->
      <section class="lg:col-span-2 space-y-6">
        <!-- Income section -->
        <div class="overflow-hidden overflow-x-auto rounded border border-gray-300 bg-white">
          <div class="flex items-center gap-2 border-b border-gray-300 bg-gray-200 px-4 py-2">
            <Icon svg={sectionIcons.income} class="h-5 w-5 text-blue-600" />
            <span class="text-xs font-bold uppercase text-gray-800">Income</span>
          </div>
          <table class="w-full border-collapse text-sm">
            <tbody class="divide-y divide-gray-200">
              <tr>
                <td class="w-1/3 border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Income basis</td>
                <td class="border border-gray-300 px-3 py-2">
                  <div class="flex gap-1">
                    <button
                      type="button"
                      class={[
                        "rounded border px-3 py-1 text-xs font-medium",
                        planInput.incomeMode === "monthlyTakeHome"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                      ]}
                      onclick={() => updateIncomeMode("monthlyTakeHome")}
                    >
                      Monthly take-home
                    </button>
                    <button
                      type="button"
                      class={[
                        "rounded border px-3 py-1 text-xs font-medium",
                        planInput.incomeMode === "yearlyGross"
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                      ]}
                      onclick={() => updateIncomeMode("yearlyGross")}
                    >
                      Yearly gross (before tax)
                    </button>
                  </div>
                </td>
              </tr>

              {#if planInput.incomeMode === "monthlyTakeHome"}
                <tr>
                  <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Monthly take-home pay</td>
                  <td class="border border-gray-300 px-3 py-2">
                    <MoneyInput
                      value={planInput.income}
                      min={0}
                      step={5000}
                      onchange={updateIncome}
                    />
                  </td>
                </tr>
              {:else}
                <tr>
                  <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Yearly gross income</td>
                  <td class="border border-gray-300 px-3 py-2">
                    <MoneyInput
                      value={planInput.yearlyGrossIncome}
                      min={0}
                      step={50000}
                      onchange={updateYearlyGrossIncome}
                    />
                  </td>
                </tr>
              {/if}

              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">People in household</td>
                <td class="border border-gray-300 px-3 py-2">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50"
                      onclick={() => stepHousehold(-1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={planInput.household}
                      oninput={(event) => updateHousehold(inputValue(event))}
                      class="cell-input w-16"
                    />
                    <button
                      type="button"
                      class="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50"
                      onclick={() => stepHousehold(1)}
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>

              {#if planInput.incomeMode === "yearlyGross"}
                <tr>
                  <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Tax setup mode</td>
                  <td class="border border-gray-300 px-3 py-2">
                    <div class="flex gap-1">
                      <button
                        type="button"
                        class={[
                          "rounded border px-3 py-1 text-xs font-medium",
                          planInput.taxAssumptions.profileMode === "auto"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                        ]}
                        onclick={() => updateTaxProfileMode("auto")}
                      >
                        Auto from duration
                      </button>
                      <button
                        type="button"
                        class={[
                          "rounded border px-3 py-1 text-xs font-medium",
                          planInput.taxAssumptions.profileMode === "manual"
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                        ]}
                        onclick={() => updateTaxProfileMode("manual")}
                      >
                        Manual
                      </button>
                    </div>
                  </td>
                </tr>

                {#if planInput.taxAssumptions.profileMode === "auto"}
                  <tr>
                    <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Duration in Japan</td>
                    <td class="border border-gray-300 px-3 py-2">
                      <select
                        value={planInput.taxAssumptions.employmentDurationBand}
                        onchange={(event) => updateDurationBand(selectValue(event))}
                        class="cell-select"
                      >
                        {#each durationOptions as option (option.value)}
                          <option value={option.value}>{option.label}</option>
                        {/each}
                      </select>
                    </td>
                  </tr>
                {/if}

                <tr>
                  <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Tax residency</td>
                  <td class="border border-gray-300 px-3 py-2">
                    <select
                      value={planInput.taxAssumptions.residency}
                      onchange={(event) => updateTaxResidency(selectValue(event))}
                      disabled={planInput.taxAssumptions.profileMode === "auto"}
                      class="cell-select disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="resident">Resident taxpayer</option>
                      <option value="nonResident">Non-resident taxpayer</option>
                    </select>
                  </td>
                </tr>

                <tr>
                  <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">First year in Japan</td>
                  <td class="border border-gray-300 px-3 py-2">
                    <label class="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={planInput.taxAssumptions.firstYearInJapan}
                        onchange={(event) =>
                          updateFirstYearInJapan(
                            (event.currentTarget as HTMLInputElement).checked,
                          )}
                        disabled={planInput.taxAssumptions.profileMode === "auto" ||
                          planInput.taxAssumptions.residency === "nonResident"}
                        class="rounded border-gray-300"
                      />
                      No prior-year inhabitant tax assumed
                    </label>
                  </td>
                </tr>

                {#if planResult.takeHomeEstimate}
                  <tr>
                    <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Estimated take-home</td>
                    <td class="border border-gray-300 px-3 py-2 text-right font-mono font-semibold text-gray-900">
                      {formatYen(planResult.effectiveMonthlyIncome)}
                    </td>
                  </tr>
                {/if}
              {/if}

            </tbody>
          </table>
        </div>

        {#if planResult.takeHomeEstimate}
          <div class="flex gap-3 rounded border border-gray-300 bg-white p-3 text-xs text-gray-600">
            <div class="flex items-center justify-center px-3">
              <Icon svg={sectionIcons.taxBreakdown} class="h-6 w-6 shrink-0 text-indigo-600" />
            </div>
            <div>
              <strong class="mb-1 block text-gray-800">Tax breakdown</strong>
              <p>
                Gross {formatYen(planResult.takeHomeEstimate.monthlyGross)} − income tax {formatYen(planResult.takeHomeEstimate.monthlyIncomeTax)}
                {#if planResult.takeHomeEstimate.monthlyResidentTax > 0}
                  − inhabitant tax {formatYen(planResult.takeHomeEstimate.monthlyResidentTax)}
                {/if}
                − social insurance {formatYen(planResult.takeHomeEstimate.monthlySocialInsurance)}
                − employment insurance {formatYen(planResult.takeHomeEstimate.monthlyEmploymentInsurance)}.
                Profile {planResult.takeHomeEstimate?.profileMode === "auto" ? "auto" : "manual"}, residency {planResult.takeHomeEstimate?.appliedResidency}, bracket {planResult.takeHomeEstimate?.taxBracketLabel}.
              </p>
            </div>
          </div>
        {/if}

        <!-- Savings and buffer section -->
        <div class="overflow-hidden overflow-x-auto rounded border border-gray-300 bg-white">
          <div class="flex items-center gap-2 border-b border-gray-300 bg-gray-200 px-4 py-2">
            <Icon svg={sectionIcons.savingsAndBuffer} class="h-5 w-5 text-green-600" />
            <span class="text-xs font-bold uppercase text-gray-800">Savings &amp; buffer</span>
          </div>
          <table class="w-full border-collapse text-sm">
            <tbody class="divide-y divide-gray-200">
              <tr>
                <td class="w-1/3 border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Savings goal</td>
                <td class="border border-gray-300 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="70"
                      value={planInput.savingsGoalPercent}
                      oninput={(event) => updateSavingsGoalPercent(inputValue(event))}
                      class="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="70"
                      value={planInput.savingsGoalPercent}
                      oninput={(event) => updateSavingsGoalPercent(inputValue(event))}
                      class="cell-input w-20"
                    />
                    <span class="text-gray-500">%</span>
                  </div>
                </td>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 text-right font-mono">
                  {formatYen(planResult.targetMonthlySavings)}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Unexpected buffer</td>
                <td class="border border-gray-300 px-3 py-2">
                  <div class="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={planInput.bufferPercent}
                      oninput={(event) => updateBuffer(inputValue(event))}
                      class="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={planInput.bufferPercent}
                      oninput={(event) => updateBuffer(inputValue(event))}
                      class="cell-input w-20"
                    />
                    <span class="text-gray-500">%</span>
                  </div>
                </td>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 text-right font-mono">
                  {formatYen(planResult.monthlySpend - planResult.baseExpenses)}
                </td>
              </tr>
              <tr class="bg-gray-200 font-bold">
                <td colspan="2" class="border border-gray-300 px-3 py-2 text-gray-900">
                  Savings + buffer subtotal
                </td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">
                  {formatYen(
                    planResult.targetMonthlySavings +
                      (planResult.monthlySpend - planResult.baseExpenses),
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Expenses section -->
        <div class="overflow-hidden overflow-x-auto rounded border border-gray-300 bg-white">
          <div class="flex items-center gap-2 border-b border-gray-300 bg-gray-200 px-4 py-2">
            <Icon svg={sectionIcons.monthlyExpenses} class="h-5 w-5 text-orange-500" />
            <span class="text-xs font-bold uppercase text-gray-800">Monthly expenses</span>
          </div>
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th class="border border-gray-300 bg-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Category
                </th>
                <th class="border border-gray-300 bg-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Description
                </th>
                <th class="w-40 border border-gray-300 bg-gray-200 px-4 py-3 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each allExpenseFields() as group (group.group)}
                <tr>
                  <td
                    colspan="3"
                    class="border border-gray-300 bg-gray-200 px-3 py-2 text-xs font-bold uppercase text-gray-800"
                  >
                    {group.group}
                  </td>
                </tr>
                {#each group.fields as field (field.id)}
                  <tr class="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                    <td class="border border-gray-300 px-3 py-2 font-medium text-gray-800">
                      <span class="mr-2 text-gray-500">{field.icon}</span>{field.label}
                    </td>
                    <td class="border border-gray-300 px-3 py-2 text-xs text-gray-500">
                      {field.description}
                    </td>
                    <td class="border border-gray-300 px-3 py-2">
                      <MoneyInput
                        value={planInput.expenses[field.id]}
                        min={0}
                        step={field.step}
                        onchange={(value) => updateExpense(field.id, value)}
                      />
                    </td>
                  </tr>
                {/each}
              {/each}
              <tr class="bg-gray-200 font-bold">
                <td colspan="2" class="border border-gray-300 px-3 py-2 text-gray-900">Base expenses subtotal</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">
                  {formatYen(planResult.baseExpenses)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Summary panel -->
      <aside class="space-y-6">
        <!-- Summary table -->
        <div class="overflow-hidden overflow-x-auto rounded border border-gray-300 bg-white">
          <div class="flex items-center gap-2 border-b border-gray-300 bg-gray-200 px-4 py-2">
            <Icon svg={sectionIcons.monthlySummary} class="h-5 w-5 text-yellow-600" />
            <span class="text-xs font-bold uppercase text-gray-800">Monthly summary</span>
          </div>
          <table class="w-full border-collapse text-sm">
            <tbody class="divide-y divide-gray-200">
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Effective income</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono font-semibold">
                  {formatYen(planResult.effectiveMonthlyIncome)}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Base expenses</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">
                  {formatYen(planResult.baseExpenses)}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Buffer ({planInput.bufferPercent}%)</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">
                  {formatYen(planResult.monthlySpend - planResult.baseExpenses)}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Savings target ({planInput.savingsGoalPercent}%)</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">
                  {formatYen(planResult.targetMonthlySavings)}
                </td>
              </tr>
              <tr class="bg-gray-200 font-bold">
                <td class="border border-gray-300 px-3 py-2 text-gray-900">Total committed</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">
                  {formatYen(planResult.monthlySpend + planResult.targetMonthlySavings)}
                </td>
              </tr>
              <tr class={planResult.savingsGoalGap >= 0 ? "bg-green-50" : "bg-red-50"}>
                <td class="border border-gray-300 px-3 py-2 font-semibold {planResult.savingsGoalGap >= 0 ? 'text-green-800' : 'text-red-800'}">
                  {planResult.savingsGoalGap >= 0 ? "Remaining" : "Over budget"}
                </td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono font-semibold {planResult.savingsGoalGap >= 0 ? 'text-green-700' : 'text-red-700'}">
                  {formatYen(planResult.savingsGoalGap)}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">Income used</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">
                  {formatPercent(planResult.incomeUsedRate)}
                </td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">
                  Daily allowance
                  <span class="block text-xs font-normal text-gray-500">Per person</span>
                </td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">
                  {formatYen(planResult.dailyFlexibleAllowance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Projections -->
        <div class="overflow-hidden overflow-x-auto rounded border border-gray-300 bg-white">
          <div class="flex items-center gap-2 border-b border-gray-300 bg-gray-200 px-4 py-2">
            <Icon svg={sectionIcons.savingsForecast} class="h-5 w-5 text-green-600" />
            <span class="text-xs font-bold uppercase text-gray-800">Savings forecast</span>
          </div>
          <table class="w-full border-collapse text-sm">
            <tbody class="divide-y divide-gray-200">
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">3 months</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">{formatYen(planResult.threeMonthSavings)}</td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">6 months</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">{formatYen(planResult.sixMonthSavings)}</td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">1 year</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">{formatYen(planResult.twelveMonthSavings)}</td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">5 years</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">{formatYen(planResult.fiveYearSavings)}</td>
              </tr>
              <tr>
                <td class="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-gray-700">10 years</td>
                <td class="border border-gray-300 px-3 py-2 text-right font-mono">{formatYen(planResult.tenYearSavings)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Chart -->
        <div class="overflow-hidden overflow-x-auto rounded border border-gray-300 bg-white">
          <div class="flex items-center gap-2 border-b border-gray-300 bg-gray-200 px-4 py-2">
            <Icon svg={sectionIcons.spendBreakdown} class="h-5 w-5 text-blue-600" />
            <span class="text-xs font-bold uppercase text-gray-800">Spend breakdown</span>
          </div>
          <div class="p-4">
            <ExpenseDonut
              slices={planResult.chartSlices}
              total={planResult.monthlySpend}
            />
            <div class="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {#each planResult.chartSlices as slice (slice.name)}
                {@const percent = Math.round(
                  (slice.amount / Math.max(planResult.monthlySpend, 1)) * 100,
                )}
                <div class="flex items-center justify-between gap-2">
                  <div class="flex min-w-0 items-center gap-2">
                    <span
                      class="inline-block h-3 w-3 shrink-0 rounded-sm"
                      style={`background:${slice.color}`}
                    ></span>
                    <span class="truncate text-gray-600">{slice.name}</span>
                  </div>
                  <span class="font-mono tabular-nums">{percent}%</span>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Income split -->
        <div class="overflow-hidden overflow-x-auto rounded border border-gray-300 bg-white">
          <div class="flex items-center gap-2 border-b border-gray-300 bg-gray-200 px-4 py-2">
            <Icon svg={sectionIcons.incomeSplit} class="h-5 w-5 text-teal-600" />
            <span class="text-xs font-bold uppercase text-gray-800">Income split</span>
          </div>
          <div class="space-y-2 p-3 text-xs">
            {#each planResult.incomeSplit as split (split.name)}
              <div>
                <div class="flex justify-between">
                  <span class="text-gray-700">{split.name}</span>
                  <span class="font-mono">{formatPercent(split.percentOfIncome)}</span>
                </div>
                <div class="mt-1 h-2 w-full bg-gray-200">
                  <div
                    class="h-2"
                    style={`width:${Math.min(100, split.percentOfIncome)}%;background:${split.color}`}
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Insight -->
        <div class="flex gap-3 rounded border border-gray-300 bg-white p-3 text-xs text-gray-600">
          <div class="flex items-center justify-center px-3">
            <Icon svg={sectionIcons.taxBreakdown} class="h-6 w-6 shrink-0 text-indigo-600" />
          </div>
          <div>
            <strong class="mb-1 block text-gray-800">Planning insight</strong>
            <p>{planResult.insight}</p>
          </div>
        </div>
      </aside>
    </div>
  </main>

  <footer class="border-t border-gray-300 bg-gray-100 px-4 py-2 text-xs text-gray-600">
    <div class="flex flex-wrap justify-between gap-2">
      <span>Japan Cost of Living Planner</span>
      <span>Figures are planning assumptions. Gross-to-net mode uses simplified tax rules.</span>
    </div>
  </footer>
</div>
