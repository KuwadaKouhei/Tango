import type { NewTestResult, TestResult, UserId } from './test-result'

export type TestResultRepository = {
  append: (result: NewTestResult) => Promise<TestResult>
  listByOwner: (ownerUserId: UserId) => Promise<TestResult[]>
}
