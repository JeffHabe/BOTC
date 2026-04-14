<template>
  <GrimoireBoard />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import GrimoireBoard from './components/GrimoireBoard.vue'
import { useGameStore } from './stores/gameStore'
import { useScriptStore, OFFICIAL_SCRIPTS } from './stores/scriptStore'

const gameStore = useGameStore()
const scriptStore = useScriptStore()

onMounted(async () => {
  // 載入遊戲狀態
  await gameStore.loadState()

  // 初始化選擇劇本，預設使用第一個官方劇本
  if (!gameStore.script || (gameStore.script.id === 'custom' && gameStore.script.characters.length === 0)) {
    await scriptStore.selectScript(OFFICIAL_SCRIPTS[0])
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
</style>
