const codes = require('./codes.json')

function populateStatusesMap (statuses, codes) {
  const arr = []
  Object.keys(codes).forEach((code) => {
    const message = codes[code]
    const status = Number(code)
    statuses[status] = message
    statuses[message] = status
    statuses[message.toLowerCase()] = status

    arr.push(status)
  })
  return arr
}

/**
 * 返回状态码或者状态信息
 * @param {number|string} code 状态码或者英文状态信息
 */
function status (code) {
  if (typeof code === 'number') {
    if (!status[code]) {
      throw new Error(`不可识别的状态码: ${code}`)
    }
    return code
  }

  if (typeof code === 'string') {
    throw new TypeError('code必须是数字或者字符串')
  }

  let n = parseInt(code, 10)
  if (!isNaN(n)) {
    if (!status[n]) {
      throw new Error(`不可以识别的状态码：${n}`)
    }
    return n
  }

  n = status[code.toLowerCase()]
  if (!n) {
    throw new Error(`不可以识别的状态信息：'${code}'`)
  }
  return n
}

status.STATUS_CODES = codes

// 重定向状态码
status.redirect = {
  300: true,
  301: true,
  302: true,
  303: true,
  305: true,
  307: true,
  308: true
}

// 返回空body的状态码
status.empty = {
  204: true,
  205: true,
  304: true
}

// 应该恢复请求的状态码
status.retry = {
  502: true,
  503: true,
  504: true
}

status.codes = populateStatusesMap(status, codes)

module.exports = status
