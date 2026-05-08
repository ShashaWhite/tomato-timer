// Storage composable for Tomato Timer
import { reactive } from 'vue'
import { formatDate } from '../utils/format'

const STORAGE_KEY = 'tomato-stats-history'

let storageInstance = null

export function useStorage() {
  if (storageInstance) {
    return storageInstance
  }
  const allStats = reactive([])

  function loadStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const history = JSON.parse(data)
        // history 结构: { records: { "2026-05-06": { completedPomodoros, totalWorkTime }, ... }, totalAllTime }
        if (history.records) {
          allStats.length = 0
          for (const date in history.records) {
            allStats.push(reactive({
              date,
              ...history.records[date]
            }))
          }
        }
      }
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }

  function saveStats() {
    const records = {}
    for (const stat of allStats) {
      records[stat.date] = {
        completedPomodoros: stat.completedPomodoros,
        totalWorkTime: stat.totalWorkTime
      }
    }
    // Calculate totalAllTime
    let totalAllTime = 0
    for (const stat of allStats) {
      totalAllTime += stat.totalWorkTime || 0
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, totalAllTime }))
  }

  function getTodayStats() {
    const todayStr = formatDate(new Date())
    const existing = allStats.find(s => s.date === todayStr)
    if (existing) {
      return existing
    }
    // Create new entry
    const newEntry = reactive({
      date: todayStr,
      completedPomodoros: 0,
      totalWorkTime: 0
    })
    allStats.push(newEntry)
    saveStats()
    return newEntry
  }

  function incrementPomodoro(duration) {
    const stats = getTodayStats()
    stats.completedPomodoros++
    stats.totalWorkTime += duration
    saveStats()
  }

  function addWorkTime(seconds) {
    const stats = getTodayStats()
    stats.totalWorkTime += seconds
    saveStats()
  }

  function clearTodayStats() {
    const todayStr = formatDate(new Date())
    const stats = allStats.find(s => s.date === todayStr)
    if (stats) {
      stats.completedPomodoros = 0
      stats.totalWorkTime = 0
      saveStats()
    }
  }

  function clearAllStats() {
    // Clear all history data
    allStats.length = 0
    localStorage.removeItem(STORAGE_KEY)
    // Re-create today's empty entry
    getTodayStats()
  }

  function getHistorySummary() {
    const totalAllTime = allStats.reduce((sum, s) => sum + (s.totalWorkTime || 0), 0)
    const historyDays = allStats.length
    return { totalAllTime, historyDays }
  }

  // Load on init
  loadStats()

  const todayStats = getTodayStats()

  storageInstance = {
    allStats,
    todayStats,
    getHistorySummary,
    actions: {
      incrementPomodoro,
      addWorkTime,
      clearTodayStats,
      clearAllStats,
      loadStats
    }
  }

  return storageInstance
}