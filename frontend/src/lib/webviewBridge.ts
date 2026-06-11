/**
 * Expo(react-native-webview) 래퍼 ↔ 웹 postMessage 브릿지.
 *
 * 웹 → 네이티브 (window.ReactNativeWebView.postMessage):
 * - { type: 'KAKAO_LOGIN_REQUEST' }                       네이티브 카카오 SDK 로그인 요청
 * - { type: 'SAVE_IMAGE', filename, dataUrl }             갤러리 저장 (blob 다운로드 미지원 대체)
 * - { type: 'SHARE_TEXT', text }                          네이티브 공유 시트
 *
 * 네이티브 → 웹 (webViewRef.injectJavaScript → window.dispatchEvent('message')):
 * - { type: 'KAKAO_LOGIN', accessToken }                  네이티브 로그인 성공
 * - { type: 'KAKAO_LOGIN_ERROR', message? }               네이티브 로그인 실패/취소
 */

interface ReactNativeWebViewBridge {
  postMessage: (message: string) => void
}

declare global {
  interface Window {
    ReactNativeWebView?: ReactNativeWebViewBridge
  }
}

export interface NativeMessage {
  type: string
  [key: string]: unknown
}

export function isInWebView(): boolean {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView
}

/** 브릿지가 없으면 false를 반환한다 (호출측에서 웹 동작으로 폴백). */
export function postToNative(message: NativeMessage): boolean {
  if (!isInWebView()) return false
  window.ReactNativeWebView!.postMessage(JSON.stringify(message))
  return true
}

export function requestNativeKakaoLogin(): boolean {
  return postToNative({ type: 'KAKAO_LOGIN_REQUEST' })
}

export function shareTextViaBridge(text: string): boolean {
  return postToNative({ type: 'SHARE_TEXT', text })
}

/** blob URL을 base64 data URL로 변환해 네이티브에 저장을 위임한다. */
export async function saveImageViaBridge(
  blobUrl: string,
  filename: string,
): Promise<boolean> {
  if (!isInWebView()) return false
  const blob = await fetch(blobUrl).then((r) => r.blob())
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('blob read failed'))
    reader.readAsDataURL(blob)
  })
  return postToNative({ type: 'SAVE_IMAGE', filename, dataUrl })
}

/**
 * 네이티브 → 웹 메시지 구독. cleanup 함수를 반환한다.
 * Android WebView는 document에, iOS WKWebView는 window에 'message'를 발화하므로 둘 다 듣는다.
 */
export function onNativeMessage(
  handler: (message: NativeMessage) => void,
): () => void {
  const listener = (event: Event) => {
    const data = (event as MessageEvent).data
    if (typeof data !== 'string') return
    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      return // 브릿지 외 message (예: react-devtools)는 무시
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as NativeMessage).type === 'string'
    ) {
      handler(parsed as NativeMessage)
    }
  }
  window.addEventListener('message', listener)
  document.addEventListener('message', listener)
  return () => {
    window.removeEventListener('message', listener)
    document.removeEventListener('message', listener)
  }
}
