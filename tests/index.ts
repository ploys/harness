import { request } from '@octokit/request'
import { Webhooks } from '@octokit/webhooks'
import { Harness } from '../src'

describe('harness', () => {
  const harness = new Harness(async () => {
    const webhooks = new Webhooks({ secret: 'secret' })

    webhooks.on('push', async () => {
      await request('GET /repos/ploys/tests/commits')
    })

    webhooks.on('issues.opened', async () => {
      await new Promise(resolve => setTimeout(resolve, 2000))
    })

    return {
      webhooks() {
        return webhooks
      },
    }
  })

  beforeEach(harness.setup)
  afterEach(harness.teardown)

  test('receive-intercept', async () => {
    await harness.run(async cx => {
      cx.intercept().get('/repos/ploys/tests/commits').reply(200, [])

      await cx.receive('push', {})
    })
  })

  test('receive-intercept-expected', async () => {
    await harness.run(async cx => {
      cx.expect().intercept().get('/repos/ploys/tests/commits').reply(200, [])

      await cx.receive('push', {})
    })
  })

  test('receive-intercept-missing', async () => {
    expect.assertions(1)

    try {
      await harness.run(async cx => {
        await cx.receive('push', {})
      })
    } catch (err) {
      expect(err.message).toMatch('Webhook handler error')
    }
  })

  test('receive-timeout', async () => {
    expect.assertions(1)

    try {
      await harness.run(async cx => {
        await cx.receive('issues', { action: 'opened' })
      }, 1000)
    } catch (err) {
      expect(err.message).toMatch('Timed out in 1000 ms')
    }
  })

  test('intercept-timeout', async () => {
    expect.assertions(3)

    try {
      await harness.run(async cx => {
        cx.expect().intercept().get('/repos/ploys/tests/commits').reply(200, [])
        cx.expect().intercept().get('/repos/ploys/tests/branches/master').reply(200, [])
      }, 1000)
    } catch (err) {
      expect(err.message).toMatch('Timed out in 1000 ms')
      expect(err.message).toMatch('/repos/ploys/tests/commits')
      expect(err.message).toMatch('/repos/ploys/tests/branches/master')
    }
  })

  test('intercept-ignored', async () => {
    await harness.run(async cx => {
      cx.intercept().get('/repos/ploys/tests/commits').reply(200, [])
    })
  })
})
