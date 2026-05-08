// Notification composable for Tomato Timer

export function useNotification() {
  const isSupported = 'Notification' in window

  async function requestPermission() {
    if (!isSupported) return false

    if (Notification.permission === 'granted') return true

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  async function notify(message, title = '番茄时钟') {
    if (!isSupported) return null

    const hasPermission = await requestPermission()
    if (!hasPermission) return null

    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.svg',
        tag: 'tomato-timer',
        requireInteraction: false
      })

      setTimeout(() => notification.close(), 5000)

      return notification
    } catch (e) {
      console.error('Failed to send notification:', e)
      return null
    }
  }

  function getPermissionStatus() {
    if (!isSupported) return 'unsupported'
    return Notification.permission
  }

  return {
    isSupported,
    requestPermission,
    notify,
    getPermissionStatus
  }
}