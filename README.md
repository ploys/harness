# Harness

> A test harness for validating GitHub Apps.

## Usage

This project is intended to be used with a test framework such as `jest`.

```ts
describe('my-tests', () => {
  // Create the test harness.
  const harness = new Harness(async () => new Application())

  test('my-first-test', async () => {
    // Wait for the harness run to complete.
    await harness.run(async cx => {
      // Intercept a request.
      cx.intercept()
        .get('/repos/ploys/harness/commits')
        .reply(200, [])

      // Intercept and expect a request. The run will wait for the request or
      // timeout.
      cx.expect()
        .intercept()
        .get('/repos/ploys/harness/commits/1')
        .reply(200, {})

      // Receive a webhook event and wait for it to finish processing.
      await cx.receive('push', {})
    })
  })

  // The test harness uses `nock` behind the scenes and these steps enable and
  // disable intercepting requests.
  beforeEach(harness.setup)
  afterEach(harness.teardown)
})
```
