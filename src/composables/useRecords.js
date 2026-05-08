// Records composable for Tomato Timer - handles tagged learning records
import { reactive } from 'vue'
import { formatDate } from '../utils/format'

const STORAGE_KEY = 'tomato-records'

// Preset subject tags
const PRESET_TAGS = ['语文', '数学', '英语', '物理', '化学', '历史', '地理', '政治', '生物']

let recordsInstance = null

export function useRecords() {
  if (recordsInstance) {
    return recordsInstance
  }

  const state = reactive({
    records: [],
    customTags: []
  })

  function loadRecords() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const saved = JSON.parse(data)
        state.records = saved.records || []
        state.customTags = saved.customTags || []
      }
    } catch (e) {
      console.error('Failed to load records:', e)
    }
  }

  function saveRecords() {
    const data = {
      records: state.records,
      customTags: state.customTags
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function addRecord(record) {
    const newRecord = {
      id: Date.now().toString(),
      date: formatDate(new Date()),
      startTime: Date.now() - record.duration * 1000,
      endTime: Date.now(),
      duration: record.duration,
      mode: record.mode || 'standard',
      tag: record.tag || null,
      diary: record.diary || null
    }
    state.records.push(newRecord)
    saveRecords()
    return newRecord
  }

  function getRecordsByDate(dateStr) {
    return state.records.filter(r => r.date === dateStr)
  }

  function getRecordsByTag(tag) {
    return state.records.filter(r => r.tag === tag)
  }

  function getRecordsForWeek(startDate, endDate) {
    return state.records.filter(r => {
      const d = new Date(r.date)
      return d >= startDate && d <= endDate
    })
  }

  function getRecordsForMonth(year, month) {
    return state.records.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }

  function getAllTags() {
    return [...PRESET_TAGS, ...state.customTags]
  }

  function addCustomTag(tag) {
    if (tag && !PRESET_TAGS.includes(tag) && !state.customTags.includes(tag)) {
      state.customTags.push(tag)
      saveRecords()
    }
  }

  function removeCustomTag(tag) {
    const idx = state.customTags.indexOf(tag)
    if (idx >= 0) {
      state.customTags.splice(idx, 1)
      saveRecords()
    }
  }

  function updateRecordDiary(recordId, diary) {
    const record = state.records.find(r => r.id === recordId)
    if (record) {
      record.diary = diary
      saveRecords()
    }
  }

  function getStatsByTag() {
    const tagStats = {}
    for (const record of state.records) {
      const tag = record.tag || '自习'
      if (!tagStats[tag]) {
        tagStats[tag] = { duration: 0, count: 0 }
      }
      tagStats[tag].duration += record.duration
      tagStats[tag].count++
    }
    return tagStats
  }

  function getDailyStats(dateStr) {
    const dayRecords = getRecordsByDate(dateStr)
    return {
      totalDuration: dayRecords.reduce((sum, r) => sum + r.duration, 0),
      count: dayRecords.length,
      tags: getStatsByTagForRecords(dayRecords)
    }
  }

  function getStatsByTagForRecords(records) {
    const tagStats = {}
    for (const record of records) {
      const tag = record.tag || '自习'
      if (!tagStats[tag]) {
        tagStats[tag] = 0
      }
      tagStats[tag] += record.duration
    }
    return tagStats
  }

  // Load on init
  loadRecords()

  recordsInstance = {
    state,
    PRESET_TAGS,
    loadRecords,
    saveRecords,
    addRecord,
    getRecordsByDate,
    getRecordsByTag,
    getRecordsForWeek,
    getRecordsForMonth,
    getAllTags,
    addCustomTag,
    removeCustomTag,
    updateRecordDiary,
    getStatsByTag,
    getDailyStats,
    actions: {
      loadRecords,
      saveRecords
    }
  }

  return recordsInstance
}