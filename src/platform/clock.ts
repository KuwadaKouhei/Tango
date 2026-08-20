export type Clock = {
  nowEpochMs: () => number
}

export const systemClock: Clock = {
  nowEpochMs: () => Date.now(),
}
