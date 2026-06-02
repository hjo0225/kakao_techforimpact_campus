import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export default function MobileFrame({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth <= 1100,
  )

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1100)
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
      <div className="cb-desktop-content">
        {children}
      </div>
    </div>
  )
}
