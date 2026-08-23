/**
 * SQLite LIKE のメタ文字をリテラルとして扱う。
 * ESCAPE は '!' を使う。SQL文字列リテラルの '\' は方言差があるため避ける。
 */
export const LIKE_ESCAPE_CHAR = '!' as const

export const escapeLikePattern = (value: string): string =>
  value
    .replaceAll(LIKE_ESCAPE_CHAR, `${LIKE_ESCAPE_CHAR}${LIKE_ESCAPE_CHAR}`)
    .replaceAll('%', `${LIKE_ESCAPE_CHAR}%`)
    .replaceAll('_', `${LIKE_ESCAPE_CHAR}_`)
