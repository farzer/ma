const net = require('net')
const stringify = require('url').format
const qs = require('querystring')
const parse = require('../lib/parseurl/parseurl')
const fresh = require('../lib/fresh/fresh')
const contentType = require('../lib/content-type/content-type')
const accepts = require('../lib/accepts')
const typeis = require('../lib/type-is')
const only = require('../lib/only')
const IP = Symbol('context#ip')

const request = {
  /**
   * 返回request header
   * @returns {Object}
   */
  get header () {
    return this.req.header
  },
  /**
   * 同get header()
   */
  get headers () {
    return this.req.headers
  },

  /**
   * 设置request header
   */
  set header (val) {
    this.req.header = val
  },
  /**
   * 同set header
   */
  set headers (val) {
    this.req.headers = val
  },

  /**
   * 获得请求URL
   * @returns {String}
   */
  get url () {
    return this.req.url
  },

  /**
   * 设置请求URL
   */
  set url (val) {
    this.req.url = val
  },

  /**
   * 获得请求origin
   * @returns {String}
   */
  get origin () {
    return `${this.protocol}://${this.host}`
  },

  /**
   * 获得完整的请求URL
   */
  get href () {
    if (/^https?:\/\//i.test(this.originalUrl)) {
      return this.originalUrl
    }
    return this.origin + this.originalUrl
  },

  /**
   * 获取请求方法
   */
  get method () {
    return this.req.method
  },

  /**
   * 获得请求pathname
   */
  get path () {
    return parse(this.req).pathname
  },

  /**
   * 设置请求pathname
   */
  set path (path) {
    const url = parse(this.req)
    if (url.pathname === path) {
      return
    }
    url.pathname = path
    url.path = null
    this.url = stringify(url)
  },

  get query () {
    const str = this.querystring
    const c = this._querycache = this._querycache || {}
    return c[str] || (c[str] = qs.parse(str))
  },

  set query (obj) {
    this.querystring = qs.stringify(obj)
  },

  get querystring () {
    if (!this.req) {
      return ''
    }
    return parse(this.req).query || ''
  },

  set querystring (str) {
    const url = parse(this.req)
    if (url.search === `?${str}`) {
      return
    }
    url.search = str
    url.path = null
    this.url = stringify(url)
  },

  get search () {
    if (!this.querystring) {
      return ''
    }
    return `?${this.querystring}`
  },

  set search (str) {
    this.querystring = str
  },

  get host () {
    const proxy = this.app.proxy
    let host = proxy && this.get('X-Forwarded-Host')
    if (!host) {
      if (this.req.httpVersionMajor >= 2) {
        host = this.get(':authority')
      }
      if (!host) {
        host = this.get('Host')
      }
    }
    if (!host) {
      return ''
    }
    return host.split(/\s*,\s*/, 1)[0]
  },

  get hostname () {
    const host = this.host
    if (!host) {
      return ''
    }
    if (host[0] === '[') {
      return this.url.hostname || ''
    }
    return host.split(':', 1)[0]
  },

  get URL () {
    if (!this.memoizedURL) {
      const protocol = this.protocol
      const host = this.host
      const originalUrl = this.originalUrl || ''
      try {
        this.memoizedURL = new URL(`${protocol}://${host}${originalUrl}`)
      } catch (error) {
        this.memoizedURL = Object.create(null)
      }
    }
    return this.memoizedURL
  },

  get fresh () {
    const method = this.method
    const s = this.ctx.status
    if (method !== 'GET' && method !== 'HEAD') {
      return false
    }

    if ((s >= 200 && s < 300) || s === 304) {
      return fresh(this.header, this.response.header)
    }
    return false
  },

  /**
   * 检测是否不新鲜
   **/
  get stale () {
    return !this.fresh
  },

  /**
   * @see https://juejin.im/entry/57fec6850e3dd90057e1e47e
   * 检测请求的幂等性
   */
  get idempotent () {
    const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']
    return !!~methods.indexOf(this.method)
  },

  get socket () {
    return this.req.socket
  },

  get charset () {
    try {
      const { parameters } = contentType.parse(this.req)
      return parameters.charset || ''
    } catch (err) {
      return ''
    }
  },

  get length () {
    const len = this.get('Content-Length')
    if (len === '') {
      return
    }
    return ~~len
  },

  get protocol () {
    if (this.socket.encrypted) {
      return 'https'
    }
    if (!this.app.proxy) {
      return 'http'
    }
    const proto = this.get('X-Forwarded-Proto')
    return proto ? proto.split(/\s*,\s*/, 1)[0] : 'http'
  },

  get secure () {
    return this.protocol === 'https'
  },

  get ips () {
    const proxy = this.app.proxy
    const val = this.get('X-Forwarded-For')
    return proxy && val ? val.split(/\s*,\s*/) : []
  },

  get ip () {
    if (!this[IP]) {
      this[IP] = this.ips[0] || this.socket.removeAddress || ''
    }
    return this[IP]
  },

  set ip (_ip) {
    this[IP] = _ip
  },

  get subdomains () {
    const offset = this.app.subdomainOffset
    const hostname = this.hostname
    if (net.isIP(hostname)) {
      return []
    }
    return hostname
      .split('.')
      .reverse()
      .slice(offset)
  },

  get accept () {
    return this._accept || (this._accept = accepts(this.req))
  },

  set accept (obj) {
    return this._accept = obj
  },

  /**
   * Check if the given `type(s)` is acceptable, returning
   * the best match when true, otherwise `false`, in which
   * case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single mime type string
   * such as "application/json", the extension name
   * such as "json" or an array `["json", "html", "text/plain"]`. When a list
   * or array is given the _best_ match, if any is returned.
   *
   * Examples:
   *
   *     // Accept: text/html
   *     this.accepts('html');
   *     // => "html"
   *
   *     // Accept: text/*, application/json
   *     this.accepts('html');
   *     // => "html"
   *     this.accepts('text/html');
   *     // => "text/html"
   *     this.accepts('json', 'text');
   *     // => "json"
   *     this.accepts('application/json');
   *     // => "application/json"
   *
   *     // Accept: text/*, application/json
   *     this.accepts('image/png');
   *     this.accepts('png');
   *     // => false
   *
   *     // Accept: text/*;q=.5, application/json
   *     this.accepts(['html', 'json']);
   *     this.accepts('html', 'json');
   *     // => "json"
   *
   * @param {String|Array} type(s)...
   * @return {String|Array|false}
   * @api public
   */
  accepts (...args) {
    return this.accept.types(...args)
  },

  /**
   * Return accepted encodings or best fit based on `encodings`.
   *
   * Given `Accept-Encoding: gzip, deflate`
   * an array sorted by quality is returned:
   *
   *     ['gzip', 'deflate']
   *
   * @param {String|Array} encoding(s)...
   * @return {String|Array}
   * @api public
   */

  acceptsEncodings (...args) {
    return this.accept.encodings(...args)
  },

  /**
   * Return accepted charsets or best fit based on `charsets`.
   *
   * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
   * an array sorted by quality is returned:
   *
   *     ['utf-8', 'utf-7', 'iso-8859-1']
   *
   * @param {String|Array} charset(s)...
   * @return {String|Array}
   * @api public
   */

  acceptsCharsets (...args) {
    return this.accept.charsets(...args)
  },

  /**
   * Return accepted languages or best fit based on `langs`.
   *
   * Given `Accept-Language: en;q=0.8, es, pt`
   * an array sorted by quality is returned:
   *
   *     ['es', 'pt', 'en']
   *
   * @param {String|Array} lang(s)...
   * @return {Array|String}
   * @api public
   */

  acceptsLanguages (...args) {
    return this.accept.languages(...args)
  },

  /**
   * Check if the incoming request contains the "Content-Type"
   * header field, and it contains any of the give mime `type`s.
   * If there is no request body, `null` is returned.
   * If there is no content type, `false` is returned.
   * Otherwise, it returns the first `type` that matches.
   *
   * Examples:
   *
   *     // With Content-Type: text/html; charset=utf-8
   *     this.is('html'); // => 'html'
   *     this.is('text/html'); // => 'text/html'
   *     this.is('text/*', 'application/json'); // => 'text/html'
   *
   *     // When Content-Type is application/json
   *     this.is('json', 'urlencoded'); // => 'json'
   *     this.is('application/json'); // => 'application/json'
   *     this.is('html', 'application/*'); // => 'application/json'
   *
   *     this.is('html'); // => false
   *
   * @param {String|Array} types...
   * @return {String|false|null}
   * @api public
   */

  is (types) {
    if (!types) return typeis(this.req)
    if (!Array.isArray(types)) types = [].slice.call(arguments)
    return typeis(this.req, types)
  },

  /**
   * Return the request mime type void of
   * parameters such as "charset".
   *
   * @return {String}
   * @api public
   */

  get type () {
    const type = this.get('Content-Type')
    if (!type) return ''
    return type.split(';')[0]
  },

  /**
   * Return request header.
   *
   * The `Referrer` header field is special-cased,
   * both `Referrer` and `Referer` are interchangeable.
   *
   * Examples:
   *
   *     this.get('Content-Type');
   *     // => "text/plain"
   *
   *     this.get('content-type');
   *     // => "text/plain"
   *
   *     this.get('Something');
   *     // => ''
   *
   * @param {String} field
   * @return {String}
   * @api public
   */

  get (field) {
    const req = this.req
    switch (field = field.toLowerCase()) {
      case 'referer':
      case 'referrer':
        return req.headers.referrer || req.headers.referer || ''
      default:
        return req.headers[field] || ''
    }
  },

  /**
   * Inspect implementation.
   *
   * @return {Object}
   * @api public
   */

  inspect () {
    if (!this.req) {
      return
    }
    return this.toJSON()
  },

  /**
   * Return JSON representation.
   *
   * @return {Object}
   * @api public
   */

  toJSON () {
    return only(this, [
      'method',
      'url',
      'header'
    ])
  }
}

module.exports = request
