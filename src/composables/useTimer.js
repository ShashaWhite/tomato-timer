// Timer composable for Tomato Timer
import { ref, reactive, readonly, computed, onUnmounted, watch } from 'vue'
import { formatTime } from '../utils/format'

const DEFAULT_CONFIG = {
  workDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  longBreakInterval: 4
}

// Global timer state to persist across page navigation
if (!window.__tomatoTimer) {
  window.__tomatoTimer = {
    intervalId: null,
    endTime: null,
    callbacks: []
  }
}

export function useTimer(config = DEFAULT_CONFIG, onComplete, settingsRef = null) {
  const state = reactive({
    mode: 'work',
    status: 'idle',
    remainingTime: config.workDuration,
    totalDuration: config.workDuration,
    pomodorosCompleted: 0,
    currentModeType: 'standard' // track which mode type is being used
  })

  // Watch settings changes to update durations
  if (settingsRef) {
    watch(() => settingsRef.state.currentMode, (newMode) => {
      if (state.status === 'idle') {
        const modeConfig = settingsRef.state.modes[newMode]
        state.currentModeType = newMode
        state.remainingTime = modeConfig.focus * 60
        state.totalDuration = modeConfig.focus * 60
      }
    })
  }

  const progress = computed(() => {
    if (state.totalDuration === 0) return 0
    return Math.max(0, Math.min(1, (state.totalDuration - state.remainingTime) / state.totalDuration))
  })

  const formattedTime = computed(() => formatTime(state.remainingTime))

  function getConfig() {
    if (settingsRef) {
      const modeConfig = settingsRef.getCurrentModeConfig()
      return {
        workDuration: modeConfig.focus * 60,
        shortBreakDuration: modeConfig.break * 60,
        longBreakDuration: 15 * 60, // Keep long break at 15 min
        longBreakInterval: 4
      }
    }
    return config
  }

  function tick() {
    if (window.__tomatoTimer.endTime) {
      const now = Date.now()
      const remaining = Math.ceil((window.__tomatoTimer.endTime - now) / 1000)
      state.remainingTime = Math.max(0, remaining)

      if (state.remainingTime <= 0) {
        handleComplete()
      }
    }
  }

  function registerTickCallback() {
    unregisterTickCallback()
    window.__tomatoTimer.callbacks.push(tick)
  }

  function unregisterTickCallback() {
    const idx = window.__tomatoTimer.callbacks.indexOf(tick)
    if (idx >= 0) {
      window.__tomatoTimer.callbacks.splice(idx, 1)
    }
  }

  function startGlobalTimer(endTime) {
    if (window.__tomatoTimer.intervalId) {
      clearInterval(window.__tomatoTimer.intervalId)
    }

    registerTickCallback()
    window.__tomatoTimer.endTime = endTime
    window.__tomatoTimer.intervalId = setInterval(() => {
      for (const callback of window.__tomatoTimer.callbacks) {
        callback()
      }
    }, 200)
  }

  function stopGlobalTimer() {
    if (window.__tomatoTimer.intervalId) {
      clearInterval(window.__tomatoTimer.intervalId)
      window.__tomatoTimer.intervalId = null
    }
    unregisterTickCallback()
  }

  function start() {
    if (state.status === 'running') return

    state.status = 'running'
    const endTime = Date.now() + state.remainingTime * 1000
    startGlobalTimer(endTime)
    saveTimerState(endTime)
  }

  function pause() {
    if (state.status !== 'running') return

    stopGlobalTimer()
    state.status = 'paused'
    saveTimerState()
  }

  function reset() {
    stopGlobalTimer()
    state.status = 'idle'
    state.mode = 'work'
    const currentConfig = getConfig()
    state.remainingTime = currentConfig.workDuration
    state.totalDuration = currentConfig.workDuration
    saveTimerState()
  }

  function skip() {
    stopGlobalTimer()
    state.status = 'idle'
    switchMode()
    saveTimerState()
  }

  function switchMode() {
    const currentConfig = getConfig()
    if (state.mode === 'work') {
      state.pomodorosCompleted++
      // Check if long break needed
      if (state.pomodorosCompleted % currentConfig.longBreakInterval === 0) {
        state.mode = 'break'
        state.totalDuration = currentConfig.longBreakDuration
      } else {
        state.mode = 'break'
        state.totalDuration = currentConfig.shortBreakDuration
      }
    } else {
      state.mode = 'work'
      state.totalDuration = currentConfig.workDuration
    }
    state.remainingTime = state.totalDuration
  }

  function handleComplete() {
    stopGlobalTimer()
    state.status = 'idle'

    // Call completion callback before switching mode
    if (onComplete) {
      onComplete({
        mode: state.mode,
        totalDuration: state.totalDuration
      })
    }

    // Auto switch mode
    switchMode()
    saveTimerState()
  }

  function saveTimerState(endTime = null) {
    const savedState = {
      mode: state.mode,
      status: state.status,
      remainingTime: state.remainingTime,
      totalDuration: state.totalDuration,
      pomodorosCompleted: state.pomodorosCompleted,
      currentModeType: state.currentModeType,
      endTime: endTime || window.__tomatoTimer.endTime,
      savedAt: Date.now()
    }
    localStorage.setItem('tomato-timer-state', JSON.stringify(savedState))
  }

  function loadPersistedState() {
    const currentConfig = getConfig()
    const data = localStorage.getItem('tomato-timer-state')
    if (data) {
      try {
        const saved = JSON.parse(data)
        state.mode = saved.mode || 'work'
        state.status = saved.status || 'idle'
        state.pomodorosCompleted = saved.pomodorosCompleted || 0
        state.currentModeType = saved.currentModeType || 'standard'

        if (saved.status === 'running' && saved.endTime) {
          const now = Date.now()
          window.__tomatoTimer.endTime = saved.endTime
          if (now < saved.endTime) {
            state.remainingTime = Math.ceil((saved.endTime - now) / 1000)
            state.totalDuration = saved.totalDuration
            // Resume timer
            startGlobalTimer(saved.endTime)
            state.status = 'running'
          } else {
            // Already expired
            state.status = 'idle'
            state.remainingTime = currentConfig.workDuration
            state.totalDuration = currentConfig.workDuration
          }
        } else {
          state.remainingTime = saved.remainingTime || currentConfig.workDuration
          state.totalDuration = saved.totalDuration || currentConfig.workDuration
        }
      } catch {}
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unregisterTickCallback()
    if (state.status === 'running') {
      saveTimerState(window.__tomatoTimer.endTime)
    }
  })

  return {
    state: readonly(state),
    progress,
    formattedTime,
    actions: {
      start,
      pause,
      reset,
      skip,
      loadPersistedState
    }
  }
}