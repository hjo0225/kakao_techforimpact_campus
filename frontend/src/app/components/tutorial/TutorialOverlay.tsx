import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTutorialStore } from '../../../store/tutorialStore'
import { cx } from '../../classNames'
import type { ReactNode } from 'react'
import stadiumBg from '../../../assets/tutorial/stadium-bg.png'
import mascotGuide from '../../../assets/tutorial/mascot-guide.png'
import { MapDemo, VerifyDemo, CardDemo, RecordDemo } from './TutorialDemos'

interface Slide {
  step: string
  title: string
  description: string
  /**
   * 박스를 채우는 비주얼 — 데모 컴포넌트(cb-tutorial__demo) 또는 캡처(cb-tutorial__shot).
   * 캡처 규격: 박스 비율 354:620 — 1062×1860px(3x) PNG 권장, 최소 708×1240(2x).
   */
  visual: ReactNode
}

const SLIDES: Slide[] = [
  {
    step: 'STEP 1 · 지도',
    title: '잠실야구장 지도에서 매장 찾기',
    description: '잠실야구장 층별 지도에서 다회용기를 쓸 수 있는 매장을 한눈에 확인해요',
    visual: <div className="cb-tutorial__demo"><MapDemo /></div>, // TODO: 직접 캡처본으로 교체 예정
  },
  {
    step: 'STEP 2 · 인증',
    title: '사진으로 다회용기 인증',
    description: '다회용기 사용 사진을 찍으면 AI가 자동으로 인증해 줘요',
    visual: <div className="cb-tutorial__demo"><VerifyDemo /></div>,
  },
  {
    step: 'STEP 3 · 야구네컷',
    title: '야구네컷으로 추억 공유',
    description: '용기 인증 후, 나만의 야구네컷을 만들어 친구들과 공유해요',
    visual: <div className="cb-tutorial__demo"><CardDemo /></div>,
  },
  {
    step: 'STEP 4 · 기록',
    title: '캘린더에서 기록 확인',
    description: '캘린더에서 날짜별 인증 기록을 모아서 볼 수 있어요',
    visual: <div className="cb-tutorial__demo"><RecordDemo /></div>,
  },
]

const SWIPE_THRESHOLD = 50

export function TutorialOverlay() {
  const pendingShow = useTutorialStore((s) => s.pendingShow)
  const close = useTutorialStore((s) => s.close)
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
        <button type="button" className="cb-tutorial__skip" onClick={close}>
          닫기
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
                <div className="cb-tutorial__shotwrap">
                  {slide.visual}
                </div>
                <div className="cb-tutorial__caption">
                  <img className="cb-tutorial__mascot" src={mascotGuide} alt="" aria-hidden="true" draggable={false} />
                  <div className="cb-tutorial__bubble">
                    <p className="cb-tutorial__step">{slide.step}</p>
                    <h2 className="cb-tutorial__title">{slide.title}</h2>
                    <p className="cb-tutorial__desc">{slide.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 버튼 없음 — 스와이프로 진행, 마지막에서 한 번 더 밀면 시작 */}
        <div className="cb-tutorial__footer">
          <div className="cb-tutorial-dots" aria-hidden="true">
            {SLIDES.map((slide, i) => (
              <span
                key={slide.title}
                className={cx('cb-tutorial-dot', i === index && 'is-active')}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
