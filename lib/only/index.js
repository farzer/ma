/**
 * only
 * @see https://github.com/tj/node-only/blob/master/index.js
 */
module.exports = function (obj, keys) {
  obj = obj || {}
  if (typeof keys === 'string') keys = keys.split(/ +/)
  return keys.reduce(function (ret, key) {
    if (obj[key] == null) return ret
    ret[key] = obj[key]
    return ret
  }, {})
}
