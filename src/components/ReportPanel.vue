<template>
  <div class="report-panel">
    <div class="report-header">
      <h3>学习报告</h3>
      <div class="report-tabs">
        <button :class="['tab-btn', { active: reportType === 'week' }]" @click="reportType = 'week'">周报</button>
        <button :class="['tab-btn', { active: reportType === 'month' }]" @click="reportType = 'month'">月报</button>
      </div>
      <button class="btn-close" @click="$emit('close')">关闭</button>
    </div>

    <div class="report-content">
      <!-- Summary Stats -->
      <div class="summary-section">
        <div class="summary-item">
          <span class="summary-value">{{ formatDuration(summary.totalDuration) }}</span>
          <span class="summary-label">总时长</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ summary.totalCount }}</span>
          <span class="summary-label">番茄数</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ formatDuration(summary.avgDaily) }}</span>
          <span class="summary-label">日均</span>
        </div>
        <div class="summary-item" v-if="reportType === 'week'">
          <span class="summary-value" :class="comparisonClass">{{ comparisonText }}</span>
          <span class="summary-label">对比上周</span>
        </div>
        <div class="summary-item summary-placeholder" v-else></div>
      </div>

      <!-- Daily Chart - Compact grid for month -->
      <div class="chart-section">
        <h4>每日专注</h4>
        <div :class="['daily-grid', reportType]">
          <div v-for="day in dailyData" :key="day.date" class="day-cell" :style="{ opacity: day.duration > 0 ? Math.min(1, 0.3 + barWidth(day.duration) / 100 * 0.7) : 0.15 }">
            <span class="day-label">{{ day.label }}</span>
            <span class="day-time" v-if="day.duration > 0">{{ formatDuration(day.duration) }}</span>
          </div>
        </div>
      </div>

      <!-- Tag Distribution -->
      <div class="tag-section" v-if="Object.keys(tagStats).length > 0">
        <h4>科目分布</h4>
        <div class="tag-stats">
          <div v-for="(stat, tag) in tagStats" :key="tag" class="tag-item">
            <span class="tag-name">{{ tag }}</span>
            <span class="tag-percent">{{ tagPercent(stat.duration) }}%</span>
          </div>
        </div>
      </div>

      <!-- Diary Review - Compact -->
      <div class="diary-section" v-if="diaryRecords.length > 0">
        <h4>学习日记</h4>
        <div class="diary-list">
          <div v-for="record in diaryRecords.slice(0, 3)" :key="record.id" class="diary-item">
            <span class="diary-tag" v-if="record.tag">{{ record.tag }}</span>
            <span class="diary-text">{{ record.diary }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRecords } from '../composables/useRecords'
import { useStorage } from '../composables/useStorage'
import { formatDuration, formatDate } from '../utils/format'

const emit = defineEmits(['close'])

const records = useRecords()
const storage = useStorage()

const reportType = ref('week')

// Calculate date range
const dateRange = computed(() => {
  const now = new Date()
  if (reportType.value === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { start, end: now }
  } else {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
  }
})

// Get records for the period
const periodRecords = computed(() => {
  return records.getRecordsForWeek(dateRange.value.start, dateRange.value.end)
})

// Summary stats
const summary = computed(() => {
  const totalDuration = periodRecords.value.reduce((sum, r) => sum + r.duration, 0)
  const totalCount = periodRecords.value.length
  const dayCount = reportType.value === 'week' ? 7 : dateRange.value.end.getDate()
  const avgDaily = Math.round(totalDuration / dayCount)

  return { totalDuration, totalCount, avgDaily }
})

// Comparison with previous period
const previousPeriodRecords = computed(() => {
  const prevStart = new Date(dateRange.value.start)
  prevStart.setDate(prevStart.getDate() - (reportType.value === 'week' ? 7 : 30))
  const prevEnd = new Date(dateRange.value.start)
  prevEnd.setDate(prevEnd.getDate() - 1)

  return records.getRecordsForWeek(prevStart, prevEnd)
})

const previousDuration = computed(() => {
  return previousPeriodRecords.value.reduce((sum, r) => sum + r.duration, 0)
})

const comparisonClass = computed(() => {
  const diff = summary.value.totalDuration - previousDuration.value
  if (diff > 0) return 'positive'
  if (diff < 0) return 'negative'
  return ''
})

const comparisonText = computed(() => {
  const diff = summary.value.totalDuration - previousDuration.value
  if (diff === 0) return '持平'
  const diffMinutes = Math.round(diff / 60)
  return diff > 0 ? `+${diffMinutes}分钟` : `${diffMinutes}分钟`
})

// Daily data for bar chart
const dailyData = computed(() => {
  const data = []
  const start = dateRange.value.start
  const end = dateRange.value.end

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(new Date(d))
    const dayRecords = periodRecords.value.filter(r => r.date === dateStr)
    const duration = dayRecords.reduce((sum, r) => sum + r.duration, 0)

    // Label: show day name for week, or date number for month
    const label = reportType.value === 'week'
      ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
      : d.getDate() + '日'

    data.push({ date: dateStr, label, duration })
  }

  return data
})

// Max duration for bar chart scaling
const maxDuration = computed(() => {
  return Math.max(...dailyData.value.map(d => d.duration), 60 * 60) // at least 1 hour scale
})

function barWidth(duration) {
  return (duration / maxDuration.value) * 100
}

// Tag stats
const tagStats = computed(() => {
  const stats = {}
  for (const record of periodRecords.value) {
    const tag = record.tag || '自习'
    if (!stats[tag]) {
      stats[tag] = { duration: 0, count: 0 }
    }
    stats[tag].duration += record.duration
    stats[tag].count++
  }

  // Sort by duration descending
  return Object.fromEntries(
    Object.entries(stats).sort((a, b) => b[1].duration - a[1].duration)
  )
})

function tagPercent(duration) {
  if (summary.value.totalDuration === 0) return 0
  return Math.round((duration / summary.value.totalDuration) * 100)
}

// Diary records
const diaryRecords = computed(() => {
  return periodRecords.value
    .filter(r => r.diary)
    .sort((a, b) => b.endTime - a.endTime) // Most recent first
})
</script>

<style scoped>
.report-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.report-header {
  position: sticky;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  height: 44px;
  background-color: white;
  z-index: 10;
}

.report-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.report-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background-color: #F5F5F5;
  color: #666;
  font-size: 12px;
  font-weight: 500;
  height: 28px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background-color: #e74c3c;
  color: white;
}

.btn-close {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background-color: #F5F5F5;
  color: #666;
  font-size: 12px;
  font-weight: 500;
  height: 28px;
  cursor: pointer;
}

.btn-close:hover {
  background-color: #E8E8E8;
}

.report-content {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.summary-section {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.summary-item {
  text-align: center;
  min-width: 60px;
}

.summary-placeholder {
  visibility: hidden;
}

.summary-label {
  display: block;
  font-size: 11px;
  color: #666;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #e74c3c;
}

.summary-value.positive {
  color: #52C41A;
}

.summary-value.negative {
  color: #FF4D4F;
}

.chart-section,
.tag-section,
.diary-section {
}

.chart-section h4,
.tag-section h4,
.diary-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}

/* Daily grid - compact visualization */
.daily-grid {
  display: grid;
  gap: 2px;
}

.daily-grid.week {
  grid-template-columns: repeat(7, 1fr);
}

.daily-grid.month {
  grid-template-columns: repeat(7, 1fr);
}

.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 2px;
  background-color: #e74c3c;
  border-radius: 2px;
  font-size: 10px;
  color: white;
  min-height: 28px;
}

.day-label {
  font-weight: 500;
}

.day-time {
  font-size: 9px;
  opacity: 0.9;
}

.tag-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.tag-name {
  color: #1A1A1A;
}

.tag-percent {
  font-weight: 600;
  color: #e74c3c;
}

.diary-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diary-item {
  padding: 8px 12px;
  background-color: #F5F5F5;
  border-radius: 4px;
  font-size: 12px;
}

.diary-tag {
  font-size: 11px;
  color: #52C41A;
  margin-right: 6px;
}

.diary-text {
  color: #666;
}
</style>