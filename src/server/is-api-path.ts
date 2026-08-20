/**
 * `/api` と `/api/*` だけをHonoへ渡す。
 * `/apiary` のような接頭辞の偶然一致を避ける。
 */
export const isApiPath = (pathname: string): boolean =>
  pathname === '/api' || pathname.startsWith('/api/')
