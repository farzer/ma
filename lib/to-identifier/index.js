/**
 * 将一个字符串转化成JavaScript标识符
 * @param {string} str 要转换的字符串
 */
function index (str) {
  return str
    .split(' ')
    .map((token) => token.slice(0, 1).toUpperCase() + token.slice(1))
    .join('')
    .replace(/[^ _0-9a-z]/gi, '')
}

module.exports = index
