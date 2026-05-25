import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { logger } from './utils/logger'

const app = createApp(App)
app.use(createPinia())

// 配置全域錯誤處理器
app.config.errorHandler = (err, instance, info) => {
  logger.error(`Vue 全域異常捕捉: ${err}`, { instance, info })
}

app.mount('#app')
