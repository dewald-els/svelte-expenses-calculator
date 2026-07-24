<script lang="ts">
  interface Props {
    svg: string;
    class?: string;
  }

  let { svg, class: className = "" }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1em"
  height="1em"
  viewBox="0 0 24 24"
  class="inline-block {className}"
  aria-hidden="true"
>
  <path d="M0 0h24v24H0z" fill="none" />
  {@html svg}
</svg>
