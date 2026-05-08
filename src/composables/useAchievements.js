// Achievements composable for Tomato Timer
import { reactive, computed } from 'vue'

const STORAGE_KEY = 'tomato-achievements'

// Milestone achievements (based on total focus time)
const MILESTONE_ACHIEVEMENTS = [
  { id: 'beginner', name: '初学者', condition: 3600, icon: '🌱', description: '累计专注1小时' },
  { id: 'persistent', name: '坚持者', condition: 36000, icon: '🌿', description: '累计专注10小时' },
  { id: 'master', name: '专注达人', condition: 180000, icon: '🌳', description: '累计专注50小时' },
  { id: 'grandmaster', name: '专注大师', condition: 360000, icon: '🏆', description: '累计专注100小时' }
]

// Daily achievements (based on daily pomodoros)
const DAILY_ACHIEVEMENTS = [
  { id: 'daily-1', name: '小试牛刀', condition: 1, icon: '⭐', description: '单日完成1个番茄' },
  { id: 'daily-3', name: '渐入佳境', condition: 3, icon: '🌟', description: '单日完成3个番茄' },
  { id: 'daily-5', name: '全力以赴', condition: 5, icon: '✨', description: '单日完成5个番茄' },
  { id: 'daily-10', name: '专注王者', condition: 10, icon: '👑', description: '单日完成10个番茄' }
]

let achievementsInstance = null

export function useAchievements(storageRef) {
  if (achievementsInstance) {
    return achievementsInstance
  }

  const state = reactive({
    unlocked: [],
    lastCheckedDailyDate: null
  })

  function loadAchievements() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const saved = JSON.parse(data)
        state.unlocked = saved.unlocked || []
        state.lastCheckedDailyDate = saved.lastCheckedDailyDate || null
      }
    } catch (e) {
      console.error('Failed to load achievements:', e)
    }
  }

  function saveAchievements() {
    const data = {
      unlocked: state.unlocked,
      lastCheckedDailyDate: state.lastCheckedDailyDate
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function hasAchievement(id) {
    return state.unlocked.includes(id)
  }

  function unlockAchievement(id) {
    if (!state.unlocked.includes(id)) {
      state.unlocked.push(id)
      saveAchievements()
      return true // New achievement unlocked
    }
    return false
  }

  function checkMilestoneAchievements(totalTime) {
    const newlyUnlocked = []
    for (const achievement of MILESTONE_ACHIEVEMENTS) {
      if (totalTime >= achievement.condition && !hasAchievement(achievement.id)) {
        unlockAchievement(achievement.id)
        newlyUnlocked.push(achievement)
      }
    }
    return newlyUnlocked
  }

  function checkDailyAchievements(dailyPomodoros, dateStr) {
    // Only check once per day
    if (state.lastCheckedDailyDate === dateStr) {
      return []
    }

    const newlyUnlocked = []
    for (const achievement of DAILY_ACHIEVEMENTS) {
      if (dailyPomodoros >= achievement.condition && !hasAchievement(achievement.id)) {
        unlockAchievement(achievement.id)
        newlyUnlocked.push(achievement)
      }
    }

    // Mark as checked for today
    state.lastCheckedDailyDate = dateStr
    saveAchievements()

    return newlyUnlocked
  }

  function getUnlockedBadges() {
    const badges = []
    for (const achievement of [...MILESTONE_ACHIEVEMENTS, ...DAILY_ACHIEVEMENTS]) {
      if (hasAchievement(achievement.id)) {
        badges.push(achievement)
      }
    }
    return badges
  }

  function getDisplayBadges(maxCount = 5) {
    const allBadges = getUnlockedBadges()
    if (allBadges.length <= maxCount) {
      return allBadges
    }
    return allBadges.slice(-maxCount) // Show most recent badges
  }

  function getAchievementInfo(id) {
    return [...MILESTONE_ACHIEVEMENTS, ...DAILY_ACHIEVEMENTS].find(a => a.id === id)
  }

  // Get progress towards next milestone
  function getMilestoneProgress(totalTime) {
    for (let i = 0; i < MILESTONE_ACHIEVEMENTS.length; i++) {
      const achievement = MILESTONE_ACHIEVEMENTS[i]
      if (!hasAchievement(achievement.id)) {
        const prevCondition = i > 0 ? MILESTONE_ACHIEVEMENTS[i - 1].condition : 0
        const progress = (totalTime - prevCondition) / (achievement.condition - prevCondition)
        return {
          next: achievement,
          progress: Math.max(0, Math.min(1, progress)),
          current: totalTime,
          remaining: achievement.condition - totalTime
        }
      }
    }
    return null // All milestones achieved
  }

  // Check achievements when pomodoro completes
  function onPomodoroComplete(duration) {
    if (!storageRef) return []

    const newlyUnlocked = []
    const historySummary = storageRef.getHistorySummary()
    const todayStats = storageRef.todayStats

    // Check milestone achievements
    const milestoneUnlocked = checkMilestoneAchievements(historySummary.totalAllTime)
    newlyUnlocked.push(...milestoneUnlocked)

    // Check daily achievements
    const dailyUnlocked = checkDailyAchievements(
      todayStats.completedPomodoros,
      todayStats.date
    )
    newlyUnlocked.push(...dailyUnlocked)

    return newlyUnlocked
  }

  // Load on init
  loadAchievements()

  achievementsInstance = {
    state,
    MILESTONE_ACHIEVEMENTS,
    DAILY_ACHIEVEMENTS,
    hasAchievement,
    unlockAchievement,
    checkMilestoneAchievements,
    checkDailyAchievements,
    getUnlockedBadges,
    getDisplayBadges,
    getAchievementInfo,
    getMilestoneProgress,
    onPomodoroComplete,
    actions: {
      loadAchievements,
      saveAchievements
    }
  }

  return achievementsInstance
}