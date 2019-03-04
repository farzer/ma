/*!
 * @see https://github.com/jshttp/content-type/edit/master/index.js
 */

/**
 * RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
 *
 * parameter     = token "=" ( token / quoted-string )
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * obs-text      = %x80-FF
 * quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
 */
const PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g // eslint-disable-line no-control-regex
const TEXT_REGEXP = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/ // eslint-disable-line no-control-regex
const TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/**
 * RegExp to match quoted-pair in RFC 7230 sec 3.2.6
 *
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 */
const QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g // eslint-disable-line no-control-regex

/**
 * RegExp to match chars that must be quoted-pair in RFC 7230 sec 3.2.6
 */
const QUOTE_REGEXP = /([\\"])/g

/**
 * RegExp to match type in RFC 7231 sec 3.1.1.1
 *
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 */
const TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/**
 * 模块导出.
 * @public
 */

exports.format = format
exports.parse = parse

/**
 * 格式化 object 返回 media type.
 *
 * @param {object} obj
 * @return {string}
 * @public
 */

function format (obj) {
  if (!obj || typeof obj !== 'object') {
    throw new TypeError('参数 obj 不能为空')
  }

  const parameters = obj.parameters
  const type = obj.type

  if (!type || !TYPE_REGEXP.test(type)) {
    throw new TypeError('invalid type')
  }

  let string = type

  // 插入参数
  if (parameters && typeof parameters === 'object') {
    let param
    let params = Object.keys(parameters).sort()

    for (let i = 0; i < params.length; i++) {
      param = params[i]

      if (!TOKEN_REGEXP.test(param)) {
        throw new TypeError('参数名称错误')
      }

      string += '; ' + param + '=' + qstring(parameters[param])
    }
  }

  return string
}

/**
 * 解释 media type 成为一个 object.
 *
 * @param {string|object} string
 * @return {Object}
 * @public
 */

function parse (string) {
  if (!string) {
    throw new TypeError('参数 string 不能为空')
  }

  // 支持 req/res-like 对象作为参数
  const header = typeof string === 'object'
    ? getcontenttype(string)
    : string

  if (typeof header !== 'string') {
    throw new TypeError('参数 string 必须是字符串类型')
  }

  let index = header.indexOf(';')
  const type = index !== -1
    ? header.substr(0, index).trim()
    : header.trim()

  if (!TYPE_REGEXP.test(type)) {
    throw new TypeError('media type 不能识别')
  }

  const obj = new Index(type.toLowerCase())

  // 解释参数
  if (index !== -1) {
    let key
    let match
    let value

    PARAM_REGEXP.lastIndex = index

    while ((match = PARAM_REGEXP.exec(header))) {
      if (match.index !== index) {
        throw new TypeError('参数格式化错误')
      }

      index += match[0].length
      key = match[1].toLowerCase()
      value = match[2]

      if (value[0] === '"') {
        // 删除 quotes 和 escapes
        value = value
          .substr(1, value.length - 2)
          .replace(QESC_REGEXP, '$1')
      }

      obj.parameters[key] = value
    }

    if (index !== header.length) {
      throw new TypeError('参数格式化错误')
    }
  }

  return obj
}

/**
 * 从 req/res-like 对象中获取 content-type
 *
 * @param {object}
 * @return {Object}
 * @private
 */

function getcontenttype (obj) {
  let header

  if (typeof obj.getHeader === 'function') {
    // res-like
    header = obj.getHeader('content-type')
  } else if (typeof obj.headers === 'object') {
    // req-like
    header = obj.headers && obj.headers['content-type']
  }

  if (typeof header !== 'string') {
    throw new TypeError('content-type header is missing from object')
  }

  return header
}

/**
 * 为字符串加双引号.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function qstring (val) {
  var str = String(val)

  // tokens 不需要加双引号
  if (TOKEN_REGEXP.test(str)) {
    return str
  }

  if (str.length > 0 && !TEXT_REGEXP.test(str)) {
    throw new TypeError('invalid parameter value')
  }

  return '"' + str.replace(QUOTE_REGEXP, '\\$1') + '"'
}

/**
 * Class to represent a content type.
 * @private
 */
function Index (type) {
  this.parameters = Object.create(null)
  this.type = type
}
