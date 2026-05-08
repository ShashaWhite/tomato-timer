// Format utils for Tomato Timer

/**
 * Format seconds to MM:SS display format
 */
export function formatTime(seconds) {
  if (seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDate(date) {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}秒`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`
  return `${mins}分钟`
}