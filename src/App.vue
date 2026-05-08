<template>
  <div class="tomato-timer-app">
    <!-- Report Panel (inline display in config area) -->
    <ReportPanel v-if="showReport" @close="showReport = false" class="report-inline" />

    <!-- Main Timer UI (hidden when report is shown) -->
    <template v-else>
    <!-- Mode and Subject Select (inline row) -->
    <div class="select-row">
      <select class="mode-select" v-model="settings.state.currentMode" @change="selectMode(settings.state.currentMode)">
        <option v-for="(mode, key) in settings.state.modes" :key="key" :value="key">
          {{ mode.label }}
        </option>
      </select>
      <select class="subject-select" v-model="currentSubject">
        <option value="">🍅</option>
        <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
      </select>
    </div>

    <!-- Timer Display -->
    <div class="timer-section">
      <div class="timer-ring">
        <svg viewBox="0 0 240 240" class="timer-svg">
          <circle
            cx="120"
            cy="120"
            :r="108"
            fill="none"
            :stroke="backgroundColor"
            stroke-width="4"
          />
          <circle
            cx="120"
            cy="120"
            :r="108"
            fill="none"
            :stroke="progressColor"
            stroke-width="4"
            :stroke-dasharray="remainingLength + ' ' + elapsedLength"
            stroke-dashoffset="0"
            class="progress-ring"
            transform="rotate(-90)"
            transform-origin="120 120"
          />
        </svg>
        <div class="timer-content">
          <div class="timer-mode">{{ modeLabel }}</div>
          <div class="timer-time" @click="openDurationEditor">
            {{ formattedTime }}
          </div>
          <div class="timer-status">{{ statusLabel }}</div>
        </div>
      </div>

      <!-- Break Activity Suggestion -->
      <div v-if="timerState.mode === 'break' && timerState.status === 'running'" class="break-suggestion">
        {{ breakSuggestion }}
      </div>

      <!-- Achievement Badges -->
      <div class="achievement-badges" v-if="displayBadges.length > 0">
        <span
          v-for="badge in displayBadges"
          :key="badge.id"
          class="badge-icon"
          :title="badge.name + ': ' + badge.description"
        >
          {{ badge.icon }}
        </span>
        <span v-if="allBadges.length > 5" class="badge-more">...</span>
      </div>
    </div>

    <!-- Control Panel -->
    <div class="control-panel">
      <button
        v-if="timerState.status === 'idle' || timerState.status === 'paused'"
        class="btn btn-primary"
        @click="handleStartClick"
      >
        开始
      </button>
      <button
        v-if="timerState.status === 'running'"
        class="btn btn-warning"
        @click="pauseTimer"
      >
        暂停
      </button>
      <button
        v-if="timerState.status !== 'idle'"
        class="btn btn-secondary"
        @click="resetTimer"
      >
        重置
      </button>
      <button
        class="btn btn-secondary"
        @click="skipTimer"
      >
        跳过
      </button>
    </div>

    <!-- Daily Goal Progress (hidden) -->
    <div class="goal-progress" @click="openGoalEditor" style="display: none">
      <span v-if="!settings.state.dailyGoal" class="set-goal-hint">点击设置每日目标</span>
      <template v-else>
        <span>今日进度</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: goalProgressPercent + '%' }"></div>
        </div>
        <span>{{ goalProgressText }}</span>
      </template>
    </div>

    <!-- Stats Display -->
    <div class="stats-display">
      <span class="stats-item">今日 {{ storage.todayStats.completedPomodoros }} 个</span>
      <span class="stats-divider">·</span>
      <span class="stats-item">时长 {{ formattedTotalTime }}</span>
      <button class="btn-report" @click="showReport = true">报告</button>
      <button class="btn-clear" @click="clearTodayStats">清空</button>
    </div>
    </template>

    <!-- Diary Modal (after completion) -->
    <div v-if="showDiaryModal" class="modal-overlay" @click.self="skipDiary">
      <div class="modal-content diary-modal">
        <h3>记录学习内容</h3>
        <p class="diary-info">本次专注 {{ formatDuration(lastRecord?.duration || 0) }}</p>
        <textarea
          v-model="diaryText"
          placeholder="简单记录本次学了什么内容（可选）"
          rows="3"
        ></textarea>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="skipDiary">跳过</button>
          <button class="btn btn-primary" @click="saveDiary">保存</button>
        </div>
      </div>
    </div>

    <!-- Duration Editor Modal -->
    <div v-if="showDurationEditor" class="modal-overlay" @click.self="showDurationEditor = false">
      <div class="modal-content">
        <h3>调整时长</h3>
        <div class="duration-input-group">
          <label>专注时长（分钟）</label>
          <input
            type="number"
            v-model.number="editFocus"
            min="5"
            max="180"
          />
        </div>
        <div class="duration-input-group">
          <label>休息时长（分钟）</label>
          <input
            type="number"
            v-model.number="editBreak"
            min="0"
            max="30"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showDurationEditor = false">取消</button>
          <button class="btn btn-primary" @click="saveDuration">保存</button>
        </div>
      </div>
    </div>

    <!-- Goal Editor Modal -->
    <div v-if="showGoalEditor" class="modal-overlay" @click.self="showGoalEditor = false">
      <div class="modal-content">
        <h3>设置每日目标</h3>
        <div class="goal-type-selector">
          <button
            :class="['goal-type-btn', { active: editGoalType === 'count' }]"
            @click="editGoalType = 'count'"
          >
            番茄数量
          </button>
          <button
            :class="['goal-type-btn', { active: editGoalType === 'duration' }]"
            @click="editGoalType = 'duration'"
          >
            专注时长
          </button>
        </div>
        <div class="duration-input-group" v-if="editGoalType === 'count'">
          <label>每日目标番茄数</label>
          <input
            type="number"
            v-model.number="editGoalValue"
            min="1"
            max="20"
          />
        </div>
        <div class="duration-input-group" v-else>
          <label>每日目标时长（小时）</label>
          <input
            type="number"
            v-model.number="editGoalValue"
            min="0.5"
            max="10"
            step="0.5"
          />
        </div>
        <div class="modal-actions goal-actions">
          <button class="btn-sm btn-secondary" @click="clearGoal">清除目标</button>
          <button class="btn-sm btn-secondary" @click="showGoalEditor = false">取消</button>
          <button class="btn-sm btn-primary" @click="saveGoal">保存</button>
        </div>
      </div>
    </div>

    <!-- Achievement Unlock Banner -->
    <div v-if="showAchievementBanner" class="achievement-banner">
      <span class="achievement-icon">{{ newAchievement?.icon }}</span>
      <span class="achievement-text">解锁成就：{{ newAchievement?.name }}</span>
    </div>

    <div v-if="showBanner" class="notification-banner">
      {{ bannerMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTimer } from './composables/useTimer'
import { useSound } from './composables/useSound'
import { useStorage } from './composables/useStorage'
import { useNotification } from './composables/useNotification'
import { useSettings } from './composables/useSettings'
import { useAchievements } from './composables/useAchievements'
import { useRecords } from './composables/useRecords'
import { formatDuration, formatDate } from './utils/format'
import ReportPanel from './components/ReportPanel.vue'

const sound = useSound()
const storage = useStorage()
const notification = useNotification()
const settings = useSettings()
const achievements = useAchievements(storage)
const records = useRecords()

const showBanner = ref(false)
const bannerMessage = ref('')
const showDurationEditor = ref(false)
const showGoalEditor = ref(false)
const showReport = ref(false)
const editFocus = ref(25)
const editBreak = ref(5)
const editGoalType = ref('count')
const editGoalValue = ref(3)

// Achievement unlock banner
const showAchievementBanner = ref(false)
const newAchievement = ref(null)

// Subject selection (inline)
const currentSubject = ref('')
const showCustomTagInput = ref(false)
const customTagInput = ref('')

// Diary
const showDiaryModal = ref(false)
const diaryText = ref('')
const lastRecord = ref(null)

// Break activity suggestions
const BREAK_SUGGESTIONS = [
  '站起来伸展一下',
  '喝杯水补充水分',
  '看看窗外放松眼睛',
  '走动一下活动身体',
  '深呼吸几次放松'
]

const breakSuggestion = ref('')

function getRandomBreakSuggestion() {
  return BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)]
}

// All tags (preset + custom)
const allTags = computed(() => records.getAllTags())

// Timer with completion callback and settings
const timer = useTimer(undefined, handleTimerComplete, settings)
const timerState = timer.state
const formattedTime = timer.formattedTime
const progress = timer.progress

// Stats
const formattedTotalTime = computed(() => formatDuration(storage.todayStats.totalWorkTime))

// Achievement badges
const allBadges = computed(() => achievements.getUnlockedBadges())
const displayBadges = computed(() => achievements.getDisplayBadges(5))

// Timer display computed - macOS style countdown ring
const circumference = 2 * Math.PI * 108
const elapsedLength = computed(() => circumference * progress.value)
const remainingLength = computed(() => circumference * (1 - progress.value))

const progressColor = computed(() =>
  timerState.mode === 'work' ? '#e74c3c' : '#52C41A'
)

const backgroundColor = computed(() =>
  timerState.mode === 'work' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(82, 196, 26, 0.15)'
)

const modeLabel = computed(() =>
  timerState.mode === 'work' ? '专注' : '休息'
)

const statusLabel = computed(() => {
  if (timerState.status === 'running') return '进行中'
  if (timerState.status === 'paused') return '已暂停'
  return '准备开始'
})

// Daily goal progress
const goalProgressPercent = computed(() => {
  if (!settings.state.dailyGoal) return 0
  const goal = settings.state.dailyGoal
  const completed = storage.todayStats.completedPomodoros
  const totalDuration = storage.todayStats.totalWorkTime

  if (goal.type === 'count') {
    return Math.min(100, (completed / goal.value) * 100)
  } else {
    return Math.min(100, (totalDuration / (goal.value * 60)) * 100)
  }
})

const goalProgressText = computed(() => {
  if (!settings.state.dailyGoal) return ''
  const goal = settings.state.dailyGoal
  const completed = storage.todayStats.completedPomodoros
  const totalDuration = storage.todayStats.totalWorkTime

  if (goal.type === 'count') {
    return `${completed}/${goal.value}个番茄`
  } else {
    const minutes = Math.floor(totalDuration / 60)
    return `${minutes}分钟/${goal.value}小时`
  }
})

// Start click - directly start timer
function handleStartClick() {
  startTimer()
}

// Add custom subject inline
function addCustomTagInline() {
  if (customTagInput.value.trim()) {
    records.addCustomTag(customTagInput.value.trim())
    currentSubject.value = customTagInput.value.trim()
    customTagInput.value = ''
    showCustomTagInput.value = false
  }
}

function cancelCustomTag() {
  customTagInput.value = ''
  showCustomTagInput.value = false
}

// Timer completion handler
function handleTimerComplete(state) {
  sound.actions.play('complete')

  if (state.mode === 'work') {
    storage.actions.incrementPomodoro(state.totalDuration)

    // Add record with subject
    const record = records.addRecord({
      duration: state.totalDuration,
      mode: settings.state.currentMode,
      tag: currentSubject.value
    })
    lastRecord.value = record

    // Show diary modal (notification will show after diary is closed)
    showDiaryModal.value = true

    // Check achievements
    const unlockedAchievements = achievements.onPomodoroComplete(state.totalDuration)
    if (unlockedAchievements.length > 0) {
      newAchievement.value = unlockedAchievements[0]
      showAchievementBanner.value = true
      setTimeout(() => {
        showAchievementBanner.value = false
        newAchievement.value = null
      }, 3000)
    }

    // Clear current subject after work session
    currentSubject.value = ''
  } else {
    breakSuggestion.value = ''
    // Show break end notification immediately
    const message = '休息结束，继续专注吧'
    notification.notify(message)
    showBanner.value = true
    bannerMessage.value = message
    setTimeout(() => showBanner.value = false, 3000)
  }
}

function saveDiary() {
  if (diaryText.value.trim() && lastRecord.value) {
    records.updateRecordDiary(lastRecord.value.id, diaryText.value.trim())
  }
  diaryText.value = ''
  lastRecord.value = null
  showDiaryModal.value = false

  // Show break notification after diary is closed
  const message = '专注完成，休息一下吧'
  notification.notify(message)
  showBanner.value = true
  bannerMessage.value = message
  setTimeout(() => showBanner.value = false, 3000)
}

function skipDiary() {
  diaryText.value = ''
  lastRecord.value = null
  showDiaryModal.value = false

  // Show break notification after diary is skipped
  const message = '专注完成，休息一下吧'
  notification.notify(message)
  showBanner.value = true
  bannerMessage.value = message
  setTimeout(() => showBanner.value = false, 3000)
}

// Timer control functions
function startTimer() {
  timer.actions.start()
  if (timerState.mode === 'break') {
    breakSuggestion.value = getRandomBreakSuggestion()
  }
}

function pauseTimer() {
  timer.actions.pause()
}

function resetTimer() {
  timer.actions.reset()
}

function skipTimer() {
  timer.actions.skip()
}

function clearTodayStats() {
  if (confirm('确定要清空今日统计数据吗？\n\n将清除：今日完成数、今日时长')) {
    storage.actions.clearTodayStats()
    records.actions.clearRecordsByDate(formatDate(new Date()))
  }
}

function selectMode(mode) {
  settings.setMode(mode)
  timer.actions.reset()
}

function openDurationEditor() {
  const modeConfig = settings.getCurrentModeConfig()
  editFocus.value = modeConfig.focus
  editBreak.value = modeConfig.break
  showDurationEditor.value = true
}

function saveDuration() {
  const currentMode = settings.state.currentMode
  settings.updateModeDuration(currentMode, 'focus', editFocus.value)
  settings.updateModeDuration(currentMode, 'break', editBreak.value)
  timer.actions.reset()
  showDurationEditor.value = false
}

function openGoalEditor() {
  if (settings.state.dailyGoal) {
    editGoalType.value = settings.state.dailyGoal.type
    editGoalValue.value = settings.state.dailyGoal.value
  } else {
    editGoalType.value = 'count'
    editGoalValue.value = 3
  }
  showGoalEditor.value = true
}

function saveGoal() {
  settings.setDailyGoal(editGoalType.value, editGoalValue.value)
  showGoalEditor.value = false
}

function clearGoal() {
  settings.clearDailyGoal()
  showGoalEditor.value = false
}

// Initialize
onMounted(() => {
  notification.requestPermission()
  timer.actions.loadPersistedState()
  storage.actions.loadStats()
  records.loadRecords()

  const modeConfig = settings.getCurrentModeConfig()
  editFocus.value = modeConfig.focus
  editBreak.value = modeConfig.break
})
</script>

<style scoped>
.tomato-timer-app {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: clamp(12px, 2vh, 24px);
  padding: clamp(16px, 2vh, 32px);
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  width: 100%;
  height: 100%;
}

/* 报告面板时移除居中布局，让报告填满 */
.tomato-timer-app:has(.report-inline) {
  padding: 0;
  justify-content: flex-start;
}

/* Mode and Subject Select Row */
.select-row {
  display: flex;
  align-items: center;
  gap: clamp(6px, 1vmin, 12px);
}

.mode-select,
.subject-select {
  padding: clamp(4px, 0.5vmin, 6px) clamp(8px, 1vmin, 12px);
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: #666;
  font-size: clamp(12px, 1.4vmin, 14px);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  height: clamp(28px, 3vmin, 32px);
  width: auto;
  appearance: none;
}

.mode-select:focus,
.subject-select:focus {
  outline: none;
}

.timer-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timer-ring {
  position: relative;
  width: clamp(242px, 43vmin, 484px);
  height: clamp(242px, 43vmin, 484px);
}

.timer-svg {
  width: 100%;
  height: 100%;
}

.timer-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  width: 80%;
}

.timer-mode {
  font-size: clamp(14px, 1.7vmin, 20px);
  font-weight: 500;
  color: #666;
  margin-bottom: clamp(6px, 0.7vh, 12px);
}

.timer-time {
  font-size: clamp(35px, 7.2vmin, 70px);
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: clamp(2px, 0.5vh, 6px);
  cursor: pointer;
  position: relative;
}

.timer-time:hover {
  color: #333;
}

.timer-status {
  font-size: clamp(13px, 1.4vmin, 17px);
  color: #999;
}

.progress-ring {
  transition: stroke-dashoffset 0.3s ease;
}

.break-suggestion {
  margin-top: clamp(8px, 1vmin, 12px);
  padding: clamp(8px, 1vmin, 12px) clamp(16px, 2vmin, 24px);
  background-color: #E8F5E9;
  border-radius: 4px;
  color: #52C41A;
  font-size: clamp(12px, 1.4vmin, 16px);
  text-align: center;
}

.achievement-badges {
  margin-top: clamp(4px, 0.5vmin, 8px);
  font-size: clamp(16px, 2vmin, 24px);
  min-height: 24px;
  display: flex;
  gap: 4px;
  align-items: center;
}

.badge-icon {
  cursor: default;
}

.badge-more {
  font-size: clamp(12px, 1.4vmin, 16px);
  color: #999;
}

.control-panel {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  height: 36px;
  min-width: 80px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-sm {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  height: 32px;
  min-width: 70px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background-color: #1A1A1A;
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: #333;
}

.btn-secondary {
  background-color: #F5F5F5;
  color: #666;
  border: none;
}

.btn-secondary:hover {
  background-color: #E8E8E8;
  color: #333;
}

.btn-warning {
  background-color: #FF9800;
  color: white;
  border: none;
}

.btn-warning:hover {
  background-color: #FFB74D;
}

.btn-sm.btn-primary {
  background-color: #1A1A1A;
  color: white;
  border: none;
}

.btn-sm.btn-primary:hover {
  background-color: #333;
}

.btn-sm.btn-secondary {
  background-color: #F5F5F5;
  color: #666;
  border: none;
}

.btn-sm.btn-secondary:hover {
  background-color: #E8E8E8;
  color: #333;
}

.goal-actions {
  justify-content: center;
  gap: 12px;
}

.goal-progress {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vmin, 12px);
  font-size: clamp(12px, 1.4vmin, 16px);
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.goal-progress:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.set-goal-hint {
  color: #999;
}

.progress-bar {
  width: clamp(80px, 15vmin, 150px);
  height: 8px;
  background-color: #E5E5E5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #52C41A;
  transition: width 0.3s ease;
}

.stats-display {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: clamp(6px, 1vmin, 10px) clamp(8px, 1.5vmin, 14px);
  background-color: #F5F5F5;
  border-radius: 4px;
  font-size: clamp(11px, 1.2vmin, 13px);
  max-width: 100%;
}

.stats-item {
  color: #666;
  white-space: nowrap;
}

.stats-divider {
  color: #E5E5E5;
}

.btn-clear {
  background-color: transparent;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  padding: 3px 6px;
  height: 22px;
  color: #999;
  transition: all 0.2s;
  white-space: nowrap;
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-clear:hover {
  background-color: #F5F5F5;
  color: #666;
}

.btn-report {
  background-color: #E8F5E9;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  padding: 3px 8px;
  height: 22px;
  color: #52C41A;
  transition: all 0.2s;
  white-space: nowrap;
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-report:hover {
  background-color: #52C41A;
  color: white;
}

.notification-banner {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #52C41A;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  z-index: 1001;
  font-size: 12px;
  font-weight: 500;
}

.achievement-banner {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #FFD700;
  color: #1A1A1A;
  padding: 8px 16px;
  border-radius: 4px;
  z-index: 1001;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.achievement-icon {
  font-size: 16px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1002;
}

.modal-content {
  background-color: white;
  padding: clamp(16px, 2vmin, 24px);
  border-radius: 8px;
  width: clamp(280px, 40vmin, 400px);
  max-width: 90%;
}

.modal-content h3 {
  margin: 0 0 clamp(12px, 1.5vmin, 16px) 0;
  font-size: clamp(16px, 2vmin, 20px);
  color: #1A1A1A;
}

/* Diary modal */
.diary-modal {
  max-width: 350px;
}

.diary-info {
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
}

.diary-modal textarea {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  background-color: #F5F5F5;
}

.diary-modal textarea:focus {
  outline: none;
  background-color: #E8E8E8;
}

.goal-type-selector {
  display: flex;
  gap: 8px;
  margin-bottom: clamp(12px, 1.5vmin, 16px);
}

.goal-type-btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #F5F5F5;
  color: #666;
  font-size: 13px;
  font-weight: 500;
  height: 32px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.goal-type-btn.active {
  background-color: #1A1A1A;
  color: white;
}

.duration-input-group {
  margin-bottom: clamp(12px, 1.5vmin, 16px);
}

.duration-input-group label {
  display: block;
  margin-bottom: 4px;
  font-size: clamp(12px, 1.4vmin, 14px);
  color: #666;
}

.duration-input-group input {
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: clamp(14px, 1.6vmin, 18px);
  background-color: #F5F5F5;
}

.duration-input-group input:focus {
  outline: none;
  background-color: #E8E8E8;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: clamp(16px, 2vmin, 24px);
}
</style>