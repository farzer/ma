const statuses = require('../statuses')
const inherits = require('./inherits')
const toIdentifier = require('../to-identifier')

/**
 * 获得代码类别
 * @param {number} status 状态码
 */
function codeClass (status) {
  return Number(String(status).charAt(0) + '00')
}

/**
 * 如果可以就为函数设置名称
 * @param {Function} func 要设置名称的函数
 * @param {string} name 函数名字
 */
function nameFunc (func, name) {
  const desc = Object.getOwnPropertyDescriptor(func, 'name')

  if (desc && desc.configurable) {
    desc.value = name
    Object.defineProperty(func, 'name', desc)
  }
}

/**
 * 创建Http错误抽象类
 */
function createHttpErrorConstructor () {
  function HttpError () {
    throw new TypeError('不能构造抽象类')
  }
  inherits(HttpError, Error)
  return HttpError
}

/**
 * 客户端错误构造器
 * @param {HttpError} HttpError HttpError实例
 * @param {string} name 客户端错误构造器名称
 * @param {number} code 错误码
 */
function createClientErrorConstructor (HttpError, name, code) {
  var className = name.match(/Error$/) ? name : name + 'Error'

  function ClientError (message) {
    // 实例化一个Error对象
    const msg = message != null ? message : statuses[code]
    const err = new Error(msg)

    // 跟踪ClientError栈堆信息
    Error.captureStackTrace(err, ClientError)

    // 设置err的原型为ClientError.proptype
    Object.setPrototypeOf(err, ClientError.prototype)

    // 重新定义err的message属性
    Object.defineProperty(err, 'message', {
      enumerable: true,
      configurable: true,
      value: msg,
      writable: true
    })

    // 重新定义err的名称
    Object.defineProperty(err, 'name', {
      enumerable: false,
      configurable: true,
      value: className,
      writable: true
    })

    return err
  }

  inherits(ClientError, HttpError)
  nameFunc(ClientError, className)

  ClientError.prototype.status = code
  ClientError.prototype.statusCode = code
  ClientError.prototype.expose = true

  return ClientError
}

/**
 * 服务端错误构造器
 * @param {HttpError} HttpError HttpError实例
 * @param {string} name 服务端错误构造器名称
 * @param {number} code 错误码
 */
function createServerErrorConstructor (HttpError, name, code) {
  const className = name.match(/Error$/) ? name : name + 'Error'

  function ServerError (message) {
    // 实例化一个Error对象
    const msg = message != null ? message : statuses[code]
    const err = new Error(msg)

    // 跟踪ServerError栈堆信
    Error.captureStackTrace(err, ServerError)

    // 设置err的原型为ServerError.proptype]
    Object.setPrototypeOf(err, ServerError.prototype)

    // 重新定义err的message属性
    Object.defineProperty(err, 'message', {
      enumerable: true,
      configurable: true,
      value: msg,
      writable: true
    })

    // 重新定义err的name属性
    Object.defineProperty(err, 'name', {
      enumerable: false,
      configurable: true,
      value: className,
      writable: true
    })

    return err
  }

  inherits(ServerError, HttpError)
  nameFunc(ServerError, className)

  ServerError.prototype.status = code
  ServerError.prototype.statusCode = code
  ServerError.prototype.expose = false

  return ServerError
}

/**
 * 创建Http error
 * @returns {Error}
 */
function createError () {
  let err
  let msg
  let status = 500
  let props = {}
  for (let i = 0; i < arguments.length; i++) {
    const arg = arguments[i]
    if (arg instanceof Error) {
      err = arg
      status = err.status || err.statusCode || status
      continue
    }
    switch (typeof arg) {
      case 'string':
        msg = arg
        break
      case 'number':
        status = arg
        if (i !== 0) {
          throw new Error('第一个参数不能为状态码')
        }
        break
      case 'object':
        props = arg
        break
      default:
        break
    }
  }

  if (typeof status === 'number' && (status < 400 || status >= 600)) {
    throw new Error('无错误状态码，只使用4xx或者5xx')
  }

  if (typeof status !== 'number' || (!statuses[status] && (status < 400 || status > 600))) {
    status = 500
  }

  // 构造函数
  const HttpError = createError[status] || createError[codeClass(status)]

  if (!err) {
    // 创建错误实例
    err = HttpError ? new HttpError(msg) : new Error(msg || statuses[status])
    // 堆栈跟踪
    Error.captureStackTrace(err, createError)
  }

  if (!HttpError || !(err instanceof HttpError) || err.status !== status) {
    // 为一般的错误实例添加属性
    err.expose = status < 500
    err.status = err.statusCode = status
  }

  for (let key in props) {
    if (key !== 'status' && key !== 'statusCode') {
      err[key] = props[key]
    }
  }

  return err
}

function populateConstructorExports (exports, codes, HttpError) {
  codes.forEach(function forEachCode (code) {
    let CodeError
    const name = toIdentifier(statuses[code])

    switch (codeClass(code)) {
      case 400:
        CodeError = createClientErrorConstructor(HttpError, name, code)
        break
      case 500:
        CodeError = createServerErrorConstructor(HttpError, name, code)
        break
    }

    if (CodeError) {
      // 导出构造器
      exports[code] = CodeError
      exports[name] = CodeError
    }
  })
}

createError.HttpError = createHttpErrorConstructor()

populateConstructorExports(createError, statuses.codes, createError.HttpError)

module.exports = createError
