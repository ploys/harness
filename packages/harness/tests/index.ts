import { request } from '@octokit/request'
import { Webhooks } from '@octokit/webhooks'
import { Harness } from '../src'

describe('harness', () => {
  const harness = new Harness(async () => {
    const webhooks = new Webhooks({ secret: 'secret' })

    webhooks.on('push', async () => {
      await request('GET /repos/ploys/tests/commits')
    })

    return {
      webhooks() {
        return webhooks
      },
    }
  })

  beforeEach(harness.setup)
  afterEach(harness.teardown)

  test('receive-with-intercept-uri', async () => {
    await harness.run(async cx => {
      cx.expect().get('https://api.github.com/repos/ploys/tests/commits').reply(200, [])

      await cx.receive('push', {})
    })
  })

  test('receive-with-intercept-path', async () => {
    await harness.run(async cx => {
      cx.expect().get('/repos/ploys/tests/commits').reply(200, [])

      await cx.receive('push', {})
    })
  })

  test('receive-without-intercept', async () => {
    try {
      await harness.run(async cx => {
        await cx.receive('push', {})
      })
    } catch {
      return
    }

    throw new Error('Expected an error')
  })
})
