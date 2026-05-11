<template>
  <div class="color-picker-container">
    <div class="picker-header">
      <div class="color-preview-circle" :style="{ backgroundColor: modelValue }"></div>
      <div class="hex-text">{{ modelValue.toUpperCase() }}</div>
    </div>

    <div class="picker-body">
      <!-- 飽和度與亮度選擇區 -->
      <div 
        class="sl-area" 
        ref="slArea"
        :style="{ backgroundColor: hueColor }"
        @mousedown="startSLDrag"
        @touchstart.prevent="startSLDrag"
      >
        <div class="sl-gradient-white"></div>
        <div class="sl-gradient-black"></div>
        <div 
          class="sl-pointer" 
          :style="{ left: slPosition.x + '%', top: slPosition.y + '%' }"
        ></div>
      </div>

      <div class="sliders">
        <!-- 色相滑桿 -->
        <div 
          class="hue-slider" 
          ref="hueSlider"
          @mousedown="startHueDrag"
          @touchstart.prevent="startHueDrag"
        >
          <div 
            class="slider-pointer" 
            :style="{ top: huePosition + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

// 狀態
const hue = ref(0)
const saturation = ref(100)
const value = ref(100)

const slArea = ref<HTMLElement | null>(null)
const hueSlider = ref<HTMLElement | null>(null)

const slPosition = ref({ x: 100, y: 0 })
const huePosition = ref(0)

// 計算基礎色（純色相）
const hueColor = computed(() => `hsl(${hue.value}, 100%, 50%)`)

// 工具：Hex 轉 HSV
function hexToHsv(hex: string) {
  let r = 0, g = 0, b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16)
    g = parseInt(hex.substring(3, 5), 16)
    b = parseInt(hex.substring(5, 7), 16)
  }

  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, v = max
  const d = max - min
  s = max === 0 ? 0 : d / max

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, v: v * 100 }
}

// 工具：HSV 轉 Hex
function hsvToHex(h: number, s: number, v: number) {
  s /= 100; v /= 100
  const i = Math.floor(h / 60)
  const f = h / 60 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  let r = 0, g = 0, b = 0
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// 初始化
onMounted(() => {
  const hsv = hexToHsv(props.modelValue)
  hue.value = hsv.h
  saturation.value = hsv.s
  value.value = hsv.v
  updatePositions()
})

watch(() => props.modelValue, (newHex) => {
  const hsv = hexToHsv(newHex)
  // 避免循環更新時造成細微偏移
  if (Math.abs(hsv.h - hue.value) > 1 || Math.abs(hsv.s - saturation.value) > 1 || Math.abs(hsv.v - value.value) > 1) {
    hue.value = hsv.h
    saturation.value = hsv.s
    value.value = hsv.v
    updatePositions()
  }
})

function updatePositions() {
  slPosition.value = { x: saturation.value, y: 100 - value.value }
  huePosition.value = (hue.value / 360) * 100
}

function emitColor() {
  const hex = hsvToHex(hue.value, saturation.value, value.value)
  emit('update:modelValue', hex)
}

// 拖曳處理
let activeDrag: 'sl' | 'hue' | null = null

function handleMouseMove(e: MouseEvent | TouchEvent) {
  if (!activeDrag) return
  
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

  if (activeDrag === 'sl' && slArea.value) {
    const rect = slArea.value.getBoundingClientRect()
    let x = (clientX - rect.left) / rect.width
    let y = (clientY - rect.top) / rect.height
    x = Math.max(0, Math.min(1, x))
    y = Math.max(0, Math.min(1, y))
    
    saturation.value = x * 100
    value.value = (1 - y) * 100
    slPosition.value = { x: x * 100, y: y * 100 }
    emitColor()
  } else if (activeDrag === 'hue' && hueSlider.value) {
    const rect = hueSlider.value.getBoundingClientRect()
    let y = (clientY - rect.top) / rect.height
    y = Math.max(0, Math.min(1, y))
    
    hue.value = y * 360
    huePosition.value = y * 100
    emitColor()
  }
}

function stopDrag() {
  activeDrag = null
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', handleMouseMove)
  window.removeEventListener('touchend', stopDrag)
}

function startSLDrag(e: MouseEvent | TouchEvent) {
  activeDrag = 'sl'
  handleMouseMove(e)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', handleMouseMove, { passive: false })
  window.addEventListener('touchend', stopDrag)
}

function startHueDrag(e: MouseEvent | TouchEvent) {
  activeDrag = 'hue'
  handleMouseMove(e)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', handleMouseMove, { passive: false })
  window.addEventListener('touchend', stopDrag)
}
</script>

<style scoped>
.color-picker-container {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 12px;
  width: 100%;
  max-width: 280px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.05);
  padding: 6px 10px;
  border-radius: 6px;
}

.color-preview-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
}

.hex-text {
  font-family: monospace;
  font-size: 14px;
  color: #fff;
  flex: 1;
}

.picker-body {
  display: flex;
  gap: 12px;
  height: 150px;
}

.sl-area {
  flex: 1;
  position: relative;
  border-radius: 4px;
  cursor: crosshair;
  overflow: hidden;
}

.sl-gradient-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #fff, transparent);
}

.sl-gradient-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, #000, transparent);
}

.sl-pointer {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px rgba(0,0,0,0.5);
  pointer-events: none;
}

.sliders {
  width: 20px;
  display: flex;
  flex-direction: column;
}

.hue-slider {
  flex: 1;
  position: relative;
  border-radius: 10px;
  cursor: pointer;
  background: linear-gradient(to bottom, 
    #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
}

.slider-pointer {
  position: absolute;
  left: -2px;
  right: -2px;
  height: 6px;
  background: #fff;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.3);
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
