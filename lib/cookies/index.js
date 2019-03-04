const http = require('http')
const Keygrip = require('../keygrip')

const cache = {}

const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/ // ^[-~\x80-\u00FF\t]+$
const sameSiteRegExp = /^(?:lax|strict)$/i // lax或者strict

function getPattern (name) {
  if (cache[name]) {
    return cache[name]
  }
  return cache[name] = new RegExp(
    '(?:^|;) *' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)'
  )
}

function Cookie (name, value, attrs) {
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('参数name不符合要求')
  }
  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError('参数value不符合要求')
  }
  value || (this.expires = new Date(0))
  this.name = name
  this.value = value || ''
  for (const name in attrs) {
    if (attrs.hasOwnProperty(name)) {
      this[name] = attrs[name]
    }
  }
  if (this.path && !fieldContentRegExp.test(this.path)) {
    throw new TypeError('选项path不符合要求')
  }
  if (this.domain && !fieldContentRegExp.test(this.domain)) {
    throw new TypeError('选项domain不符合要求')
  }
  if (this.sameSite && this.sameSite !== true && !sameSiteRegExp.test(this.sameSite)) {
    throw new TypeError('选项sameSite不符合要求')
  }
}

Cookie.prototype.path = '/'
Cookie.prototype.expires = undefined
Cookie.prototype.domain = undefined
Cookie.prototype.httpOnly = true
Cookie.prototype.sameSite = false
Cookie.prototype.secure = false
Cookie.prototype.overwrite = false
Cookie.prototype.toString = function () {
  return `${this.name}=${this.value}`
}
Cookie.prototype.toHeader = function () {
  let header = this.toString()
  if (this.maxAge) {
    this.expires = new Date(Date.now() + this.maxAge)
  }
  if (this.path) {
    header += `; path=${this.path}`
  }
  if (this.expires) {
    header += `; expires=${this.expires.toUTCString()}`
  }
  if (this.domain) {
    header += `; domain=${this.domain}`
  }
  if (this.sameSite) {
    header += `; samesite=${this.sameSite === true ? 'strict' : this.sameSite.toLowerCase()}`
  }
  if (this.secure) {
    header += `; secure`
  }
  if (this.httpOnly) {
    header += '; httponly'
  }
  return header
}

function pushCookie (headers, cookie) {
  if (cookie.overwrite) {
    for (let index = headers.length - 1; index >= 0; index--) {
      if (headers[index].indexOf(cookie.name + '=') === 0) {
        // 删去cookie.name
        headers.splice(index, 1)
      }
    }
  }
  headers.push(cookie.toHeader())
}

function Index (request, response, options) {
  if (!(this instanceof Index)) {
    return new Index(request, response, options)
  }
  this.secure = undefined
  this.request = request
  this.response = response

  if (options) {
    this.keys = Array.isArray(options.keys) ? new Keygrip(options.keys) : options.keys
    this.secure = options.secure
  }
}

Index.prototype.get = function (name, opts) {
  let sigName = `${name}.sig`
  let header, match, value, remote, data, index
  let signed = opts && opts.signed !== undefined ? opts.signed : !!this.keys

  header = this.request.headers('cookie')
  if (!header) {
    return
  }
  match = header.match(getPattern(name))
  if (!match) {
    return
  }
  value = match[1]
  if (!opts || !signed) {
    return value
  }
  remote = this.get(sigName)
  if (!remote) {
    return
  }
  data = `${name}=${value}`
  if (!this.keys) {
    throw new Error('签证cookie需要keys')
  }
  index = this.keys.index(data, remote)
  if (index < 0) {
    this.set(sigName, null, { path: '/', signed: false })
  } else {
    index && this.set(sigName, this.keys.join(data), { signed: false })
    return value
  }
}

Index.prototype.set = function (name, value, opts) {
  const res = this.response
  const req = this.request
  let headers = res.getHeader('Set-Cookie') || []
  const secure = this.secure !== 'undefined' ? !!this.secure : req.protocol === 'https' || req.connection.encrypted
  const cookie = new Cookie(name, value, opts)
  const signed = opts && opts.signed !== 'undefined' ? opts.signed : !!this.keys

  if (typeof headers === 'string') {
    headers = [headers]
  }
  if (!secure && opts && opts.secure) {
    throw new Error('在没有加密中的链接不能发送受保护的cookie')
  }
  cookie.secure = secure
  if (opts && 'secure' in opts) {
    cookie.secure = opts.secure
  }

  pushCookie(headers, cookie)

  if (opts && signed) {
    if (!this.keys) {
      throw new Error('签证cookie需要keys')
    }
    cookie.value = this.keys.sign(cookie.toString())
    cookie.name += '.sig'
    pushCookie(headers, cookie)
  }

  const setHeader = res.set ? http.OutgoingMessage.prototype.setHeader : res.setHeader
  setHeader.call(res, 'Set-cookie', headers)
  return this
}

Index.connect = Index.express = function (keys) {
  return function (req, res, next) {
    req.cookies = res.cookies = new Index(req, res, { keys })
    next()
  }
}

Index.Cookie = Cookie

module.exports = Index
