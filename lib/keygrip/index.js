/**
 * https://github.com/crypto-utils/keygrip
 */

const crypto = require('crypto')
const compare = require('../tsscmp')

/**
 * 用于通过旋转凭证系统对数据（如cookie或URL）进行签名和验证
 * 在该系统中可以添加新服务器密钥并定期删除旧服务器密钥，而不会使客户端凭据无效
 * @param {string[]} keys keys
 * @param {string} algorithm 算法
 * @param {string} encoding 编码
 */
function Index (keys, algorithm = 'sha1', encoding = 'base64') {
  if (!(this instanceof Index)) {
    return new Index(keys, algorithm, encoding)
  }

  if (!keys || !(0 in keys)) {
    throw new Error('keys参数不能为空')
  }

  /**
   * 对一个字符串进行签名
   * @param {string} data 字符串
   * @param {string} key 加密key
   */
  function sign (data, key) {
    return crypto
      .createHmac(algorithm, key)
      .update(data)
      .digest(encoding)
      .replace(/\/|\+|=/g, function (x) {
        return ({
          '/': '_',
          '+': '-',
          '=': ''
        })[x]
      })
  }

  this.index = function (data, digest) {
    for (let index = 0, len = keys.length; index < len; index++) {
      if (compare(digest, sign(data, keys[index]))) {
        return index
      }
    }
    return -1
  }

  this.sign = function (data) {
    return sign(data, keys[0])
  }

  this.verify = function (data, digest) {
    return this.index(data, digest) > -1
  }
}

Index.sign = Index.verify = Index.index = function () {
  throw new Error(`使用方式：require('keygrip')(<array-of-keys>)`)
}

module.exports = Index
