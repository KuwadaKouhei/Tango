export const wordQueryKeys = {
  all: ['words'] as const,
  lists: (searchQuery = '') =>
    [...wordQueryKeys.all, 'list', searchQuery] as const,
  detail: (wordId: string) => [...wordQueryKeys.all, 'detail', wordId] as const,
}

export const isClientRuntime = (): boolean => typeof document !== 'undefined'
