/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void
        Map: new (container: HTMLElement, options: any) => any
        LatLng: new (lat: number, lng: number) => any
        Marker: new (options: any) => any
        CustomOverlay: new (options: any) => any
        InfoWindow: new (options: any) => any
        event: {
          addListener: (target: any, type: string, handler: () => void) => void
          removeListener: (target: any, type: string, handler: () => void) => void
        }
      }
    }
  }
}

export {}
