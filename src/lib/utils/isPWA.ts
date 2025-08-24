// PWA環境の検出
export const isPWA =
  window.matchMedia("(display-mode: standalone)").matches ||
  // 古いiOS
  (window.navigator as any).standalone === true;