import { Webhooks } from '@octokit/webhooks'
import { Interceptor, Scope, default as nock } from 'nock'
import { URL } from 'url'

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
   */
  public async run(fn: (cx: Context) => Promise<void>): Promise<void> {
    const cx = new Context(await this.fn())

    await fn(cx)
    await cx.done()
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
   * Expects that a request is intercepted.
   *
   * @param uri - The request URI.
   * @param method - The request method.
   */
  public intercept(uri: string, method: string): Interceptor {
    const url = new URL(uri, 'https://api.github.com')
    const scope = nock(`${url.protocol}//${url.host}`)

    this.scopes.push(scope)
    this.promises.push(new Promise(resolve => scope.on('replied', () => resolve())))

    return scope.intercept(url.pathname, method)
  }

  /**
   * Expects that a GET request is intercepted.
   *
   * @param uri - The request URI.
   *
   * @returns The request interceptor.
   */
  public get(uri: string): Interceptor {
    return this.intercept(uri, 'GET')
  }

  /**
   * Expects that a POST request is intercepted.
   *
   * @param uri - The request URI.
   *
   * @returns The request interceptor.
   */
  public post(uri: string): Interceptor {
    return this.intercept(uri, 'POST')
  }

  /**
   * Expects that a PUT request is intercepted.
   *
   * @param uri - The request URI.
   *
   * @returns The request interceptor.
   */
  public put(uri: string): Interceptor {
    return this.intercept(uri, 'PUT')
  }

  /**
   * Expects that a HEAD request is intercepted.
   *
   * @param uri - The request URI.
   *
   * @returns The request interceptor.
   */
  public head(uri: string): Interceptor {
    return this.intercept(uri, 'HEAD')
  }

  /**
   * Expects that a PATCH request is intercepted.
   *
   * @param uri - The request URI.
   *
   * @returns The request interceptor.
   */
  public patch(uri: string): Interceptor {
    return this.intercept(uri, 'PATCH')
  }

  /**
   * Expects that a MERGE request is intercepted.
   *
   * @param uri - The request URI.
   *
   * @returns The request interceptor.
   */
  public merge(uri: string): Interceptor {
    return this.intercept(uri, 'MERGE')
  }

  /**
   * Expects that a DELETE request is intercepted.
   *
   * @param uri - The request URI.
   *
   * @returns The request interceptor.
   */
  public delete(uri: string): Interceptor {
    return this.intercept(uri, 'DELETE')
  }

  /**
   * Expects that a OPTIONS request is intercepted.
   *
   * @param uri - The request URI.
   *
   * @returns The request interceptor.
   */
  public options(uri: string): Interceptor {
    return this.intercept(uri, 'OPTIONS')
  }

  /**
   * Returns when all promises have been completed.
   */
  public async done(): Promise<void> {
    await Promise.all(this.promises)
  }
}
