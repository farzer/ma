const util = require('util')
const createError = require('../lib/http-errors/http-errors')
const httpAssert = require('../lib/http-assert/http-assert')
const delegates = require('../lib/delegates/delegates')
const statuses = require('../lib/statuses')
const Cookies = require('../lib/cookies/cookies')

const COOKIES = Symbol('context#cookies')

// Context 原型
const proto = {
  // utils.inspect()
  inspect () {
    if (this === proto) {
      return this
    }
    return this.toJSON()
  },
  toJSON () {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket'
    }
  },
  assert: httpAssert,
  throw (...args) {
    throw createError(...args)
  },
  onerror (err) {
    if (err === null) {
      return
    }
    if (!(err instanceof Error)) {
      err = new Error(util.format('没有错误抛出：%j', err))
    }
    let headerSent = false
    if (this.headerSent || !this.writable) {
      headerSent = err.headerSent = true
    }

    // 代理
    this.app.emit('error', err, this)

    if (headerSent) {
      return
    }

    const { res } = this
    if (typeof res.getHeaderNames === 'function') {
      res.getHeaderNames().forEach(name => res.removeHeader(name))
    }

    this.set(err.headers)

    this.type = 'text'

    // 强制 text/plain
    if (err.code === 'ENOENT') {
      err.status = 404
    }

    // 默认500
    if (typeof err.status !== 'number' || !statuses[err.status]) {
      err.status = 500
    }

    const code = statuses[err.status]
    const msg = err.expose ? err.message : code
    this.status = err.status
    this.length = Buffer.byteLength(msg)
    res.res(msg)
  },
  get cookies () {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      })
    }
    return this[COOKIES]
  },
  set cookies (_cookies) {
    this[COOKIES] = _cookies
  }
}

if (util.inspect.custom) {
  proto[util.inspect.custom] = proto.inspect
}

delegates(proto, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
  .method('set')
  .method('set')
  .method('append')
  .method('flushHeaders')
  .access('status')
  .access('message')
  .access('body')
  .access('length')
  .access('type')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable')

delegates(proto, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .access('accept')
  .getter('origin')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('URL')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip')
