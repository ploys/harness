import { Webhooks } from '@octokit/webhooks'
import { Scope, Options, default as nock } from 'nock'

import * as uuid from 'uuid'

/**
 * The application interface.
 */
export interface Application {
  webhooks(): Webhooks
}

/**
 * The test harness.
 */
export class Harness {
  private readonly fn: () => Promise<Application>

  /**
   * Creates the test harness.
   *
   * @param fn - The initialization function.
   */
  public constructor(fn: () => Promise<Application>) {
    this.fn = fn
  }

  /**
   * Sets up the test harness.
   */
  public async setup(): Promise<void> {
    nock.disableNetConnect()
  }

  /**
   * Cleans up the test harness.
   */
  public async teardown(): Promise<void> {
    nock.cleanAll()
    nock.enableNetConnect()
  }

  /**
   * Runs the test harness.
   *
   * @param fn - The test callback.
   * @param ms - The timeout in milliseconds.
   */
  public async run(fn: (cx: Context) => Promise<void>, ms = 4500): Promise<void> {
    const cx = new Context(await this.fn())
    const go = async () => {
      await fn(cx)
      await cx.done()
    }

    await timeout(cx, go(), ms)
  }
}

/**
 * The run context.
 */
export class Context {
  private readonly app: Application
  private readonly expects: Expect[] = []

  /**
   * Creates the run context.
   *
   * @param app - The application.
   */
  public constructor(app: Application) {
    this.app = app
  }

  /**
   * Creates an expection.
   *
   * @returns The expection.
   */
  public expect(): Expect {
    const expect = new Expect()

    this.expects.push(expect)

    return expect
  }

  /**
   * Intercepts a request.
   *
   * @param host - The request host
   * @param options - The intercept options.
   */
  public intercept(host: string | RegExp = 'https://api.github.com', options?: Options): Scope {
    return nock(host, options)
  }

  /**
   * Gets the pending requests.
   *
   * @returns The pending requests.
   */
  public pending(): string[] {
    return this.expects.map(expect => expect.pending()).flat()
  }

  /**
   * Receives a webhook event.
   *
   * @param name - The event name.
   * @param payload - The event payload.
   */
  public async receive(name: string, payload: any): Promise<void> {
    await this.app.webhooks().receive({ id: uuid.v4(), name, payload })
  }

  /**
   * Returns when all expections have been completed.
   */
  public async done(): Promise<void> {
    await Promise.all(this.expects.map(expect => expect.done()))
  }
}

/**
 * The expect object.
 */
export class Expect {
  private readonly scopes: Scope[] = []
  private readonly promises: Array<Promise<void>> = []

  /**
   * Intercepts and expects a request.
   *
   * @param host - The request host
   * @param options - The intercept options.
   */
  public intercept(host: string | RegExp = 'https://api.github.com', options?: Options): Scope {
    const scope = nock(host, options)

    this.scopes.push(scope)
    this.promises.push(new Promise(resolve => scope.on('replied', () => resolve())))

    return scope
  }

  /**
   * Gets the pending requests.
   *
   * @returns The pending requests.
   */
  public pending(): string[] {
    return this.scopes.map(scope => scope.pendingMocks()).flat()
  }

  /**
   * Returns when all promises have been completed.
   */
  public async done(): Promise<void> {
    await Promise.all(this.promises)
  }
}

/**
 * Races a promise with a timeout.
 *
 * @param cx - The context.
 * @param pm - The promise.
 * @param ms - The timeout in milliseconds.
 */
export function timeout(cx: Context, pm: Promise<void>, ms: number): Promise<void> {
  let out: NodeJS.Timeout

  const timer: Promise<void> = new Promise((_, reject) => {
    out = setTimeout(() => {
      let msg = `Timed out in ${ms} ms`
      const pending = cx.pending()

      if (pending.length > 0) {
        msg += ' expecting:\n'
        msg += pending.map(item => `- ${item.toLowerCase()}`).join('\n')
      }

      reject(new Error(msg))
    }, ms)
  })

  const done = async () => {
    try {
      await pm
    } finally {
      if (out) clearTimeout(out)
    }
  }

  return Promise.race([timer, done()])
}
