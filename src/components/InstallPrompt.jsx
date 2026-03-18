import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (running as standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    function handleBeforeInstall(e) {
      e.preventDefault()
      setInstallEvent(e)
    }

    function handleAppInstalled() {
      setInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installEvent) return
    installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setInstallEvent(null)
      setInstalled(true)
    }
  }

  // Don't show if already installed or prompt not available
  if (installed || !installEvent) return null

  return (
    <button
      onClick={handleInstall}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 20, border: 'none',
        background: '#0D7377', color: 'white', cursor: 'pointer',
        fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 12,
        transition: 'background 0.15s, transform 0.1s',
        flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#0A5C60'}
      onMouseLeave={e => e.currentTarget.style.background = '#0D7377'}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Download size={13} />
      Install App
    </button>
  )
}
