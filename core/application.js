const Emitter = require('events')
const http = require('http')
const util = require('util')
const Stream = require('stream')
const debug = require('debug')('ma:application')
const statuses = require('../lib/statuses')
const isJSON = require('../lib/is-json')
const onFinished = require('../lib/on-finished')
const compose = require('../lib/compose')
const only = require('../lib/only')
const context = require('./context')
const request = require('./request')
const response = require('./response')

class Application extends Emitter {
  constructor () {
    super()
    this.middleware = []
    this.proxy = false
    this.subdomainOffset = 2
    this.env = process.env.NODE_ENV || 'development'
    this.context = Object.create(context)
    this.request = Object.create(request)
    this.response = Object.create(response)
    if (util.inspect.custom) {
      this[util.inspect.custom] = this.inspect
    }
  }
  /**
   * 添加一个中间件到app
   * @param {Function} fn 中间件
   */
  use (fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('中间件必须是函数')
    }
    // TODO 可以考虑中间件是generator函数
    debug('use %s', fn._name || fn.name || '-')
    this.middleware.push(fn)
  }
  /**
   * 启动应用
   * @param  {...any} args 监听net.Server的参数
   */
  listen (...args) {
    debug('listening...')
    const server = http.createServer(this.callback())
    return server.listen(...args)
  }

  /**
   * Return a request handler callback
   * for node's native http server.
   *
   * @return {Function}
   * @api public
   */
  callback () {
    const fn = compose(this.middleware)
    if (this.listenerCount('error')) {
      this.on('error', this.onerror)
    }
    const handleServerCallback = (req, res) => {
      const ctx = this.createContext(req, res)
      return this.handleRequest(ctx, fn)
    }
    return handleServerCallback
  }

  createContext (req, res) {
    const context = Object.create(this.context)
    const request = context.request = Object.create(this.request)
    const response = context.response = Object.create(this.response)
    context.app = request.app = response.app = this
    context.req = request.req = response.req = req
    context.res = request.res = response.res = res
    request.ctx = response.ctx = context
    request.response = response
    response.request = request
    context.originalUrl = request.originalUrl = req.url
    context.state = {}
    return context
  }

  handleRequest (ctx, fn) {
    const res = ctx.res
    res.statusCode = 404 // 默认404
    const onerror = err => ctx.onerror(err)
    const handleResponse = () => respond(ctx)
    onFinished(res, onerror)
    return fn(ctx).then(handleResponse).catch(onerror)
  }

  onerror (err) {
    if (!(err instanceof Error)) {
      throw new TypeError(util.format('no error throw: %j', err))
    }
    if (err.status === 404 || err.expose || this.silent) {
      return
    }
    const msg = err.stack || err.toString()
    console.error()
    console.error(msg.replace(/^/gm, '  '))
    console.error()
  }
  toJSON () {
    return only(this, [
      'subdomainOffset',
      'proxy',
      'env'
    ])
  }

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */

  inspect () {
    return this.toJSON()
  }
}

/**
 * Response helper.
 */

function respond (ctx) {
  // allow bypassing koa
  if (ctx.respond === false) return

  if (!ctx.writable) return

  const res = ctx.res
  let body = ctx.body
  const code = ctx.status

  // ignore body
  if (statuses.empty[code]) {
    // strip headers
    ctx.body = null
    return res.end()
  }

  if (ctx.method === 'HEAD') {
    if (!res.headersSent && isJSON(body)) {
      ctx.length = Buffer.byteLength(JSON.stringify(body))
    }
    return res.end()
  }

  // status body
  if (body == null) {
    if (ctx.req.httpVersionMajor >= 2) {
      body = String(code)
    } else {
      body = ctx.message || String(code)
    }
    if (!res.headersSent) {
      ctx.type = 'text'
      ctx.length = Buffer.byteLength(body)
    }
    return res.end(body)
  }

  // responses
  if (Buffer.isBuffer(body)) return res.end(body)
  if (typeof body === 'string') return res.end(body)
  if (body instanceof Stream) return body.pipe(res)

  // body: json
  body = JSON.stringify(body)
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body)
  }
  res.end(body)
}

module.exports = Application
