<script lang="ts">
  import type { ChartSlice } from '../planner/types'

  let { slices = [], total = 0 }: { slices: ChartSlice[]; total: number } = $props()

  let canvas = $state<HTMLCanvasElement | undefined>(undefined)

  function drawChart(chartSlices: ChartSlice[]): void {
    if (!canvas) {
      return
    }

    const pixelRatio = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.scale(pixelRatio, pixelRatio)
    context.clearRect(0, 0, width, height)

    const aggregate = chartSlices.reduce((sum, slice) => sum + slice.amount, 0) || 1
    const size = Math.min(width, height)
    const outerRadius = size * 0.4
    const innerRadius = size * 0.25
    let startAngle = -Math.PI / 2

    for (const slice of chartSlices) {
      const arcLength = (slice.amount / aggregate) * Math.PI * 2
      context.beginPath()
      context.arc(width / 2, height / 2, outerRadius, startAngle, startAngle + arcLength)
      context.arc(width / 2, height / 2, innerRadius, startAngle + arcLength, startAngle, true)
      context.closePath()
      context.fillStyle = slice.color
      context.fill()
      startAngle += arcLength
    }
  }

  $effect(() => {
    drawChart(slices)
  })
</script>

<div class="relative mx-auto h-48 w-48">
  <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
    <span class="text-xs text-gray-500">Monthly spend</span>
    <strong class="font-mono text-lg text-gray-900">¥{Math.round(total).toLocaleString('en-US')}</strong>
  </div>
  <canvas bind:this={canvas} class="h-full w-full"></canvas>
</div>
