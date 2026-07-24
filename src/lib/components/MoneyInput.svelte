<script lang="ts">
  interface Props {
    value: number;
    min?: number;
    step?: number;
    class?: string;
    onchange?: (value: string) => void;
  }

  let {
    value,
    min = 0,
    step,
    class: className = "",
    onchange,
  }: Props = $props();

  let isFocused = $state(false);
  let rawValue = $state("");

  function format(n: number): string {
    return Math.round(n).toLocaleString("fr-FR").replace(/\u00a0/g, " ");
  }

  let displayValue = $derived(isFocused ? rawValue : format(value));

  function handleFocus(): void {
    isFocused = true;
    rawValue = String(value);
  }

  function handleInput(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    rawValue = input.value.replace(/[^\d]/g, "");
    onchange?.(rawValue === "" ? "0" : rawValue);
  }

  function handleBlur(): void {
    isFocused = false;
  }
</script>

<div class="flex items-center justify-end {className}">
  <span class="text-gray-500">¥</span>
  <input
    type="text"
    inputmode="numeric"
    pattern="[0-9 ]*"
    autocomplete="off"
    {min}
    {step}
    value={displayValue}
    onfocus={handleFocus}
    oninput={handleInput}
    onblur={handleBlur}
    class="cell-input w-full"
  />
</div>
