// Sound composable for Tomato Timer
import { reactive, readonly } from 'vue'

export function useSound() {
  const state = reactive({
    isMuted: false
  })

  let audioContext = null

  function getAudioContext() {
    if (!audioContext) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      audioContext = new AC()
    }
    return audioContext
  }

  function playBeep(frequency, duration, type = 'sine') {
    if (state.isMuted) return

    try {
      const ctx = getAudioContext()
      if (!ctx) return

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      gainNode.gain.setValueAtTime(0, ctx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05)
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch (e) {
      console.error('Failed to play sound:', e)
    }
  }

  function play(type) {
    if (state.isMuted) return

    switch (type) {
      case 'complete':
        playBeep(523.25, 0.15) // C5
        setTimeout(() => playBeep(659.25, 0.15), 150) // E5
        setTimeout(() => playBeep(783.99, 0.2), 300) // G5
        break
      case 'tick':
        playBeep(1000, 0.05, 'square')
        break
      case 'alert':
        playBeep(800, 0.1)
        setTimeout(() => playBeep(600, 0.1), 100)
        setTimeout(() => playBeep(400, 0.15), 200)
        break
    }
  }

  function setMuted(muted) {
    state.isMuted = muted
    // Save to localStorage
    localStorage.setItem('tomato-sound', JSON.stringify({ isMuted: muted }))
  }

  // Load initial state
  const saved = localStorage.getItem('tomato-sound')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      state.isMuted = data.isMuted || false
    } catch {}
  }

  return {
    state: readonly(state),
    actions: {
      play,
      setMuted
    }
  }
}