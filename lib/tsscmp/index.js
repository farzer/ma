/**
 * https://github.com/suryagh/tsscmp/blob/master/lib/index.js
 * 安全比较双HMAC字符串
 */

const crypto = require('crypto')

function bufferEqual (a, b) {
  if (a.length !== b.length) {
    return false
  }
  if (crypto.timingSafeEqual) {
    return crypto.timingSafeEqual(a, b)
  }
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) {
      return false
    }
  }
  return true
}

function timeSafeCompare (a, b) {
  const strA = String(a)
  const strB = String(b)
  const key = crypto.randomBytes(32)
  const aH = crypto.createHmac('sha256', key).update(strA).digest()
  const bH = crypto.createHmac('sha256', key).update(strB).digest()
  return bufferEqual(aH, bH) && a === b
}

module.exports = timeSafeCompare
