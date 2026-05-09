package com.botc.grimoire

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()
    var keep = true
    splashScreen.setKeepOnScreenCondition { keep }
    
    // 延遲 800ms 後再關閉啟動畫面，給予網頁加載緩衝
    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
      keep = false
    }, 800)

    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}
