import { expect, test as setup } from '@playwright/test'

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const email = 'e2e@example.com'
const password = 'e2e-password-12'

setup('E2E用sessionをemail signupで作る', async ({ request }) => {
  const signUp = await request.post('/api/auth/sign-up/email', {
    headers: {
      origin,
      'content-type': 'application/json',
    },
    data: {
      name: 'E2E User',
      email,
      password,
    },
  })

  if (!signUp.ok()) {
    const signIn = await request.post('/api/auth/sign-in/email', {
      headers: {
        origin,
        'content-type': 'application/json',
      },
      data: { email, password },
    })
    expect(
      signIn.ok(),
      `E2E login failed: signup ${String(signUp.status())} signin ${String(signIn.status())}`,
    ).toBeTruthy()
  }

  await request.storageState({ path: 'playwright/.auth/user.json' })
})
