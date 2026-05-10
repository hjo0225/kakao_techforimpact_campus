import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export default function MobileFrame({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth <= 768,
  )

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile ? (
    <div className="cb-app-root">{children}</div>
  ) : (
    <DesktopFrame>{children}</DesktopFrame>
  )
}

function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="cb-desktop-shell">
      <div className="cb-phone-frame">
        <div className="cb-dynamic-island" />
        <div className="cb-phone-content">{children}</div>
        <div className="cb-home-indicator" />
      </div>
    </div>
  )
}
