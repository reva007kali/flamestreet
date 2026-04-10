let audioContext = null
let lastPlayedAt = 0

function getContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!audioContext) audioContext = new AudioCtx()
  return audioContext
}

export async function playNotifySound(type = 'default') {
  const now = Date.now()
  if (now - lastPlayedAt < 700) return
  lastPlayedAt = now

  const ctx = getContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return
    }
  }

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  const settings =
    type === 'success'
      ? { freq: 880, freq2: 1174, duration: 0.18 }
      : type === 'status'
        ? { freq: 740, freq2: 988, duration: 0.16 }
        : { freq: 660, freq2: 880, duration: 0.18 }

  const start = ctx.currentTime
  osc.type = 'sine'
  osc.frequency.setValueAtTime(settings.freq, start)
  osc.frequency.linearRampToValueAtTime(settings.freq2, start + settings.duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + settings.duration)

  osc.start(start)
  osc.stop(start + settings.duration)
}

