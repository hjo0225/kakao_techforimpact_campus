import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTutorialStore } from '../../../store/tutorialStore'
import { Button } from '../design-system'
import { cx } from '../../classNames'
import stadiumBg from '../../../assets/tutorial/stadium-bg.png'
import mascotGuide from '../../../assets/tutorial/mascot-guide.png'

interface Slide {
  step: string
  title: string
  description: string
  /** 추후 들어갈 앱 화면/일러스트 자리 안내 문구 (임시 placeholder). */
  placeholder: string
}

const SLIDES: Slide[] = [
  {
    step: 'STEP 1 · 지도',
    title: '잠실야구장 지도에서 매장 찾기',
    description: '잠실야구장 층별 지도에서 다회용기를 쓸 수 있는 매장을 한눈에 확인해요.',
    placeholder: '잠실야구장 지도 미리보기',
  },
  {
    step: 'STEP 2 · 인증',
    title: '사진으로 다회용기 인증',
    description: '다회용기 사용 사진을 찍으면 AI가 자동으로 인증해 줘요.',
    placeholder: '인증 화면 미리보기',
  },
  {
    step: 'STEP 3 · 야구네컷',
    title: '야구네컷으로 추억 공유',
    description: '용기 인증 후, 직관 사진으로 나만의 야구네컷을 만들어 친구들과 공유해요.',
    placeholder: '야구네컷 미리보기',
  },
  {
    step: 'STEP 4 · 기록',
    title: '캘린더에서 기록 확인',
    description: '캘린더에서 날짜별 인증 기록을 모아 볼 수 있어요.',
    placeholder: '캘린더 미리보기',
  },
]

const SWIPE_THRESHOLD = 50

export function TutorialOverlay() {
  const pendingShow = useTutorialStore((s) => s.pendingShow)
  const close = useTutorialStore((s) => s.close)
  const dismissForever = useTutorialStore((s) => s.dismissForever)
  const [index, setIndex] = useState(0)
  const dragStartX = useRef<number | null>(null)

  if (!pendingShow) return null

  const isLast = index === SLIDES.length - 1
  const goPrev = () => setIndex((i) => Math.max(0, i - 1))
  const goNext = () => {
    if (isLast) {
      close()
      setIndex(0)
      return
    }
    setIndex((i) => Math.min(SLIDES.length - 1, i + 1))
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX
  }
  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return
    const dx = e.clientX - dragStartX.current
    dragStartX.current = null
    if (dx <= -SWIPE_THRESHOLD) goNext()
    else if (dx >= SWIPE_THRESHOLD) goPrev()
  }

  return (
    <div className="cb-tutorial-backdrop" role="dialog" aria-modal="true" aria-label="앱 사용 안내">
      <img className="cb-tutorial__bg" src={stadiumBg} alt="" aria-hidden="true" />
      <div className="cb-tutorial__scrim" aria-hidden="true" />

      <div className="cb-tutorial">
        <button type="button" className="cb-tutorial__skip" onClick={dismissForever}>
          다시 안보기
        </button>

        <div
          className="cb-tutorial__viewport"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <div
            className="cb-tutorial__track"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {SLIDES.map((slide) => (
              <div className="cb-tutorial__slide" key={slide.title}>
                <div className="cb-tutorial__board">
                  <p className="cb-tutorial__step">{slide.step}</p>
                  <h2 className="cb-tutorial__title">{slide.title}</h2>
                  <p className="cb-tutorial__desc">{slide.description}</p>
                  <div className="cb-tutorial__placeholder">{slide.placeholder}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cb-tutorial__spacer" />

        <img className="cb-tutorial__mascot" src={mascotGuide} alt="" aria-hidden="true" />

        <div className="cb-tutorial__footer">
          <div className="cb-tutorial-dots" aria-hidden="true">
            {SLIDES.map((slide, i) => (
              <span
                key={slide.title}
                className={cx('cb-tutorial-dot', i === index && 'is-active')}
              />
            ))}
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={goNext}>
            {isLast ? '시작하기' : '다음'}
          </Button>
        </div>
      </div>
    </div>
  )
}
