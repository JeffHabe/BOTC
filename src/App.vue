<template>
  <div class="app-container">
    <GrimoireBoard />
    
    <!-- 授權狀態氣泡提示 -->
    <Transition name="fade">
      <div 
        v-if="uiStore.licenseStatus === 'Expired' || uiStore.licenseStatus === 'TimeTampered'" 
        class="expiry-warning-badge danger-badge"
      >
        ⚠️ 試用授權已過期，功能受限
      </div>
      <div 
        v-else-if="uiStore.licenseStatus === 'Valid' && uiStore.licenseRemainingDays !== null && uiStore.licenseRemainingDays <= 7" 
        class="expiry-warning-badge"
      >
        ⏳ 試用授權將於 {{ uiStore.licenseRemainingDays }} 天後到期 ({{ uiStore.licenseExpiryDate }})
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUIStore } from './stores/uiStore'
import GrimoireBoard from './components/GrimoireBoard.vue'

const uiStore = useUIStore()

onMounted(async () => {
  try {
    await uiStore.updateLicenseStatusFromBackend()
  } catch (err) {
    console.error('License verification failed on startup:', err)
  }
})
</script>

<style>
/* 確保 body/html 填滿 */
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #0c0d10;
  color: white;
  font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.app-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 全域捲軸樣式 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}
::-webkit-scrollbar-thumb {
  background: rgba(201, 168, 76, 0.3);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 168, 76, 0.5);
}

/* 右上角即將到期警告提示氣泡 */
.expiry-warning-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: linear-gradient(135deg, #2b1f15 0%, #1c140d 100%);
  border: 1px solid #c9a84c;
  color: #fce8b2;
  padding: 8px 16px;
  border-radius: 30px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 12px rgba(201, 168, 76, 0.2);
  z-index: 1000;
  pointer-events: none;
  letter-spacing: 0.5px;
}

.expiry-warning-badge.danger-badge {
  background: linear-gradient(135deg, #2b0c0f 0%, #1a080a 100%);
  border: 1px solid #ff6b6b;
  color: #ffcccc;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 12px rgba(255, 107, 107, 0.2);
}

/* 淡入淡出動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>



