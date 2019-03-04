const simpleCharsetRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/

// 检测 spec 是否有 quality
const isQuality = spec => spec.q > 0

// 比较 spec
const compareSpecs = (a, b) => (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0

// 获取完整的 charset 字符串
const getFullCharset = spec => spec.charset

/**
 * 根据字符集构造 spec
 * @param {string} charset 字符集
 * @param {object} spec
 * @param {number} index 索引
 */
function specify (charset, spec, index) {
  let s = 0
  if (spec.charset.toLowerCase() === charset.toLowerCase()) {
    s |= 1
  } else if (spec.charset !== '*') {
    return null
  }

  return {
    i: index,
    o: spec.i,
    q: spec.q,
    s: s
  }
}

/**
 * 获取给定字符集的权重
 * @param {string} charset 要检测的字符集
 * @param {Array} accepted 头部字符集
 * @param {number} index 索引
 */
function getCharsetPriority (charset, accepted, index) {
  let priority = { o: -1, q: 0, s: 0 }

  for (let i = 0; i < accepted.length; i++) {
    const spec = specify(charset, accepted[i], index)

    if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
      priority = spec
    }
  }

  return priority
}

/**
 * 从 Accept-Charset 头部优先获取 charsets
 * @param {object} accept Accept-Charset 头部
 * @param {Array} provided 给定可解释的字符集数组
 */
function preferredCharsets (accept, provided) {
  // RFC 2616 sec 14.2: no header = *
  const accepts = parseAcceptCharset(accept === undefined ? '*' : accept || '')

  if (!provided) {
    // 排序 charsets
    return accepts
      .filter(isQuality)
      .sort(compareSpecs)
      .map(getFullCharset)
  }

  const priorities = provided.map(function getPriority (type, index) {
    return getCharsetPriority(type, accepts, index)
  })

  // sorted list of accepted charsets
  return priorities.filter(isQuality).sort(compareSpecs).map(function getCharset (priority) {
    return provided[priorities.indexOf(priority)]
  })
}

/**
 * 解释 Accept-Charset 头部
 * @param {object} accept Accept-Charset 头部
 */
function parseAcceptCharset (accept) {
  const accepts = accept.split(',')
  let j = 0
  for (let i = 0; i < accepts.length; i++) {
    const charset = parseCharset(accepts[i].trim(), i)
    if (charset) {
      accepts[j++] = charset
    }
  }

  accepts.length = j

  return accepts
}

/**
 * 从 Accept-Charset 头部中解释一个 charset
 * @param {string} str 解释的字符串
 * @param {number} i 索引
 */
function parseCharset (str, i) {
  const match = simpleCharsetRegExp.exec(str)
  if (!match) return null

  const charset = match[1]
  let q = 1
  if (match[2]) {
    const params = match[2].split(';')
    for (i = 0; i < params.length; i++) {
      const p = params[i].trim().split('=')
      if (p[0] === 'q') {
        q = parseFloat(p[1])
        break
      }
    }
  }
  return {
    charset: charset,
    q: q,
    i: i
  }
}

/**
 * Module exports
 * @public
 */
module.exports = preferredCharsets
