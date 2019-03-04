/**
 * 检测请求是否新鲜
 * 可用于做请求缓存last-modified/etag
 * @see https://github.com/jshttp/fresh#readme
 */

// 检测Cache-Control中的no-cache
const CACHE_CONTROL_NO_CACHE_REGEXP = /(?:^|,)\s*?no-cache\s*?(?:,|$)/

function parseHttpDate (date) {
  const timestamp = date && Date.parse(date)
  return typeof timestamp === 'number' ? timestamp : NaN
}

function parseTokenList (str) {
  const list = []
  let end = 0
  let start = 0

  for (let index = 0; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 0x20: /** (空格) */
        if (start === end) {
          start = end = index + 1
        }
        break
      case 0x2c: /** , */
        list.push(str.substring(start, end))
        start = end = index + 1
        break
      default:
        end = index + 1
        break
    }
  }

  list.push(str.substring(start, end))
  return list
}

function index (reqHeaders, resHeaders) {
  const modifiedSince = reqHeaders['if-modified-since']
  const noneMatch = reqHeaders['if-none-match']

  // 如果没有协商缓存设置
  if (!modifiedSince && !noneMatch) {
    return false
  }

  // cache-control: no-cache 不做缓存
  const cacheControl = reqHeaders['cache-control']
  if (cacheControl && CACHE_CONTROL_NO_CACHE_REGEXP.test(cacheControl)) {
    return false
  }

  if (noneMatch && noneMatch !== '*') {
    const etag = resHeaders['etag']
    if (!etag) {
      return false
    }
    let etagStale = true
    const matches = parseTokenList(noneMatch)
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index]
      if (match === etag || match === 'W/' + etag || 'W/' + match === etag) {
        etagStale = false
        break
      }
    }
    if (etagStale) {
      return false
    }
  }

  if (modifiedSince) {
    const lastModified = resHeaders['last-modified']
    const modifiedStale = !lastModified || !(parseHttpDate(lastModified) <= parseHttpDate(modifiedSince))
    if (modifiedStale) {
      return false
    }
  }

  return true
}

module.exports = index
