// Settings composable for Tomato Timer
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'tomato-settings-v2'

const DEFAULT_MODES = {
  standard: { focus: 25, break: 5, label: '标准' },
  homework: { focus: 45, break: 10, label: '作业' },
  review: { focus: 20, break: 5, label: '复习' },
  exam: { focus: 90, break: 0, label: '考试' }
}

const DEFAULT_SETTINGS = {
  currentMode: 'standard',
  modes: DEFAULT_MODES,
  dailyGoal: null,
  customTags: []
}

// Global settings instance
let settingsInstance = null

export function useSettings() {
  if (settingsInstance) {
    return settingsInstance
  }

  const state = reactive({
    currentMode: 'standard',
    modes: JSON.parse(JSON.stringify(DEFAULT_MODES)),
    dailyGoal: null,
    customTags: []
  })

  function loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const saved = JSON.parse(data)
        state.currentMode = saved.currentMode || 'standard'
        // Merge saved modes with defaults (to handle new modes added)
        if (saved.modes) {
          for (const key in DEFAULT_MODES) {
            if (saved.modes[key]) {
              state.modes[key] = { ...DEFAULT_MODES[key], ...saved.modes[key] }
            } else {
              state.modes[key] = DEFAULT_MODES[key]
            }
          }
        }
        state.dailyGoal = saved.dailyGoal || null
        state.customTags = saved.customTags || []
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  function saveSettings() {
    const data = {
      currentMode: state.currentMode,
      modes: state.modes,
      dailyGoal: state.dailyGoal,
      customTags: state.customTags
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function setMode(mode) {
    if (state.modes[mode]) {
      state.currentMode = mode
      saveSettings()
    }
  }

  function getCurrentModeConfig() {
    return state.modes[state.currentMode] || state.modes.standard
  }

  function updateModeDuration(mode, type, value) {
    // Validate: focus 5-180, break 0-30
    const min = type === 'focus' ? 5 : 0
    const max = type === 'focus' ? 180 : 30
    const clampedValue = Math.max(min, Math.min(max, value))

    if (state.modes[mode]) {
      state.modes[mode][type] = clampedValue
      saveSettings()
    }
  }

  function setDailyGoal(type, value) {
    state.dailyGoal = { type, value }
    saveSettings()
  }

  function clearDailyGoal() {
    state.dailyGoal = null
    saveSettings()
  }

  function addCustomTag(tag) {
    if (tag && !state.customTags.includes(tag)) {
      state.customTags.push(tag)
      saveSettings()
    }
  }

  function removeCustomTag(tag) {
    const idx = state.customTags.indexOf(tag)
    if (idx >= 0) {
      state.customTags.splice(idx, 1)
      saveSettings()
    }
  }

  // Auto-save on changes
  watch(() => state.currentMode, saveSettings)
  watch(() => state.modes, saveSettings, { deep: true })
  watch(() => state.dailyGoal, saveSettings, { deep: true })
  watch(() => state.customTags, saveSettings, { deep: true })

  // Load on init
  loadSettings()

  settingsInstance = {
    state,
    DEFAULT_MODES,
    getCurrentModeConfig,
    setMode,
    updateModeDuration,
    setDailyGoal,
    clearDailyGoal,
    addCustomTag,
    removeCustomTag,
    actions: {
      loadSettings,
      saveSettings
    }
  }

  return settingsInstance
}