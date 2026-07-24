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
    let startAngle = -Math.PI / 2

    for (const slice of chartSlices) {
      const arcLength = (slice.amount / aggregate) * Math.PI * 2
      context.beginPath()
      context.arc(width / 2, height / 2, 78, startAngle, startAngle + arcLength)
      context.arc(width / 2, height / 2, 47, startAngle + arcLength, startAngle, true)
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

<div class="chart-wrap">
  <div class="chart-center">
    <span>Monthly spend</span>
    <strong>¥{Math.round(total).toLocaleString('en-US')}</strong>
  </div>
  <canvas bind:this={canvas}></canvas>
</div>
