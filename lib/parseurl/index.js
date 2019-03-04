/**
 * @see https://github.com/pillarjs/parseurl/blob/master/index.js
 */

const url = require('url')
// TODO url.parse will deprecated in v11.0.0
const parse = url.parse // eslint-disable-line
const Url = url.Url

/**
 * 检测解释后的url对象是否新鲜
 * @param {string} url 要检测的url
 * @param {object} parsedUrl 解释后的url对象
 * @returns {boolean}
 */
function fresh (url, parsedUrl) {
  return typeof parsedUrl === 'object' &&
    parsedUrl !== null &&
    (Url === undefined || parsedUrl instanceof Url) &&
    parsedUrl._raw === url
}

function index (req) {
  const url = req.url
  if (url === undefined) {
    return undefined
  }

  let parsed = req._parsedUrl

  if (fresh(url, parsed)) {
    // 返回URL解释的缓存
    return parsed
  }

  // 解释URL
  parsed = fastparse(url)
  parsed._raw = url
  req._parsedUrl = parsed
  return parsed
}

function originalurl (req) {
  const url = req.originalUrl

  if (typeof url !== 'string') {
    // 回调
    return index(req)
  }

  let parsed = req._parsedOriginalUrl
  if (fresh(url, parsed)) {
    return parsed
  }
  parsed = fastparse(url)
  parsed._raw = url
  parsed._parsedOriginalUrl = parsed
  return parsed
}

/**
 * 使用快速路径快捷方式解析`str` url
 * @param {string} str url
 */
function fastparse (str) {
  if (typeof str !== 'string' || str.charCodeAt(0) !== 0x2f /** / */) {
    return parse(str)
  }

  let pathname = str
  let query = null
  let search = null

  // /^(\/[^?#\s]*)(\?[^#\s]*)?$/
  for (let index = 0; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 0x3f: /** ? */
        if (search === null) {
          pathname = str.substring(0, index)
          query = str.substring(index + 1)
          search = str.substring(index)
        }
        break
      case 0x09: /** \t */
      case 0x0a: /** \n */
      case 0x0c: /** \f */
      case 0x0d: /** \r */
      case 0x20: /** (空格) */
      case 0x23: /** # */
      case 0xa0:
      case 0xfeff:
        return parse(str)
    }
  }

  const url = Url !== undefined ? new Url() : {}
  url.path = str
  url.href = str
  url.pathname = pathname
  url.query = query
  url.search = search

  return url
}

index.original = originalurl

module.exports = index
