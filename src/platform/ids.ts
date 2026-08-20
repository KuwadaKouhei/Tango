export const createOpaqueId = (prefix: string): string =>
  `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`
