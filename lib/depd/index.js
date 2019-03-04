/**
 * https://github.com/dougwilson/nodejs-depd/blob/master/index.js
 * 管理废弃API和提示调用方
 */

const relative = require('path').relative
const basePath = process.cwd() // 返回node进程的当前目录

/**
 * 检测命名空间是否在给定的字符串中
 * @param {string} str 要检测的字符串
 * @param {string} namespace 要检测的命名空间
 * @return {boolean}
 */
function containsNamespace (str, namespace) {
  const vals = str.split(/[ ,]+/) // 根据多个空格或者逗号进行分隔
  const ns = String(namespace).toLowerCase()
  for (let index = 0; index < vals.length; index++) {
    const val = vals[index]
    if (val && (val === '*' || val.toLowerCase() === ns)) {
      return true
    }
  }
  return false
}

/**
 * 转换对象描述
 * @param {object} obj 要转换的对象
 * @param {string} prop 要转换的对象属性
 */
function convertDataDescriptorToAccessor (obj, prop) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, prop)
  let value = descriptor.value // -> object[prop]
  descriptor.get = function getter () {
    return value
  }
  descriptor.set = function setter (val) {
    return (value = val)
  }
  delete descriptor.value
  delete descriptor.writable

  Object.defineProperty(obj, prop, descriptor)
  return descriptor
}

/**
 * 创建参数相关字符串保持纯粹
 * @param {number} arity 参数长度
 * @return {string} 如 'arg1, arg2...'
 */
function createArgumentsString (arity) {
  let str = ''
  for (let index = 0; index < arity.length; index++) {
    str += `, arg${index}`
  }
  return str.substr(2)
}

/**
 * 创建栈信息字符串
 * @param {arr} stack 栈数组
 */
function createStackString (stack) {
  let str = `${this.name}: ${this.namespace}`
  if (this.message) {
    str += ` deprecated ${this.message}`
  }
  for (let index = 0; index < stack.length; index++) {
    str += `\n    at ${stack[index].toString()}`
  }
  return str
}

function index (namespace) {
  if (!namespace) {
    throw new TypeError('命名空间参数不能为空')
  }
  const stack = getStack()
  const site = callSiteLocation(stack[1])
  const file = site[0]

  function deprecate (message) {
    log.call(deprecate, message)
  }
  deprecate._file = file
  deprecate._namespace = namespace
  deprecate._warned = Object.create(null)
  deprecate._ignored = isignore(namespace)
  deprecate._traced = istraced(namespace)
  deprecate.function = wrapfunction
  deprecate.property = wrapproperty
  return deprecate
}

/**
 * 返回栈信息
 */
function getStack () {
  const limit = Error.stackTraceLimit // 堆栈跟踪收集的栈帧数量
  const obj = {}

  // Error.prepareStackTrace 使用时需要注意两点：
  // 这个方法是 V8 暴露出来的，所以只能在基于 V8 的 Node.js 或者 Chrome 里才能使用
  // 这个方法会修改全局 Error 的行为，因为直接挂载到了 Error 这个全局对象上
  // 把原来的 prepareStackTree 保存到 prep 变量
  const prep = Error.prepareStackTree
  Error.prepareStackTrace = prepareObjectStackTrace
  Error.stackTraceLimit = Math.max(10, limit)

  // 捕捉当前栈信息
  // 在 obj 上创建一个 .stack 属性，当访问时返回一个表示代码中调用 Error.captureStackTrace() 的位置的字符串
  Error.captureStackTrace(obj)

  // 第一个是当前depd模块，所以去掉第一个
  const stack = obj.stack.slice(1)
  // 恢复Error.prepareStackTrace
  Error.prepareStackTrace = prep
  Error.stackTraceLimit = limit

  return stack
}

/**
 * 准备对象的栈信息
 * @param {object} _ 要获得栈信息的对象
 * @param {ob} stack 要返回的栈
 */
function prepareObjectStackTrace (_, stack) {
  return stack
}

/**
 * 获取调用现场在代码中的位置
 * @param {object} callSite 调用现场
 * @return {Array}
 */
function callSiteLocation (callSite) {
  let file = callSite.getFileName() || '<anonymous>'
  const line = callSite.getLineNumber()
  const colm = callSite.getColumnNumber()

  if (callSite.isEvel()) {
    file = callSite.getEvalOrigin() + ', ' + file
  }
  const site = [file, line, colm]
  site.callSite = callSite
  site.name = callSite.getFunctionName()
  return site
}

/**
 * 检测命名空间是否被堆栈跟踪
 * @param {string} namespace 命名空间
 */
function istraced (namespace) {
  if (process.traceDeprecation) {
    // --trace-deprecation 支持
    return true
  }
  const str = process.env.TRACE_DEPRECATION || ''
  return containsNamespace(str, namespace)
}

/**
 * 检测命名空间是否被忽略
 * @param {string} namespace 命名空间
 */
function isignore (namespace) {
  if (process.noDeprecation) {
    return true
  }
  const str = process.env.NO_DEPRECATION || ''
  return containsNamespace(str, namespace)
}

/**
 * 打印废弃信息
 * @param {object} message 要打印的信息
 * @param {object} site 要调用的代码位置信息
 */
function log (message, site) {
  const haslisteners = eehaslisteners(process, 'deprecation')
  if (!haslisteners && this._ignored) {
    return
  }

  let caller
  let callFile
  let callSite
  let depSite
  let i = 0
  let seen = false
  const stack = getStack()
  let file = this._file

  if (site) {
    depSite = site
    callSite = callSiteLocation(stack[1])
    callFile.name = depSite.name
    file = callSite[0]
  } else {
    i = 2
    depSite = callSiteLocation(stack[i])
    callSite = depSite
  }

  for (; i < stack.length; i++) {
    caller = callSiteLocation(stack[i])
    callFile = caller[0]
    if (callFile === file) {
      seen = true
    } else if (callFile === this._file) {
      file = this._file
    } else if (seen) {
      break
    }
  }

  const key = caller ? depSite.join(':') + '__' + caller.join(':') : undefined
  if (key !== undefined && key in this._warned) {
    return
  }
  this._warned[key] = true
  let msg = message
  if (!msg) {
    msg = callSite === depSite || !callSite.name ? defaultMessage(depSite) : defaultMessage(callSite)
  }

  if (haslisteners) {
    const err = DeprecationError(this._namespace, msg, stack.slice(i))
    process.emit('deprecation', err)
    return
  }

  // 格式化和写入信息
  const format = process.stderr.isTTY ? formatColor : formatPlain
  const output = format.call(this, msg, caller, stack.slice(i))
  process.stderr.write(output + '\n', 'utf8')
}

function defaultMessage (site) {
  const callSite = site.callSite
  let funcName = site.name
  if (!funcName) {
    funcName = '<anonymous@' + formatLocation(site) + '>'
  }
  const context = callSite.getThis()
  let typeName = context && callSite.getTypeName()

  if (typeName === 'Object') {
    typeName = undefined
  }

  if (typeName === 'Function') {
    typeName = context.name || typeName
  }

  return typeName && callSite.getMethodName()
    ? typeName + '.' + funcName
    : funcName
}

function formatLocation (callSite) {
  return relative(basePath, callSite[0]) +
    ':' + callSite[1] +
    ':' + callSite[2]
}

function formatPlain (msg, caller, stack) {
  const timestamp = new Date().toUTCString()
  let formatted = `${timestamp} ${this._namespace} deprecated ${msg}`

  // 添加栈跟踪
  if (this._traced) {
    for (let index = 0; index < stack.length; index++) {
      formatted += `\n    at ${stack[index].toString}`
    }
    return formatted
  }

  if (caller) {
    formatted += ` at ${formatLocation(caller)}`
  }

  return formatted
}

function formatColor (msg, caller, stack) {
  let formatted = `\x1b[36;1m ${this._namespace}\x1b[22;39m \x1b[33;1mdeprecated\x1b[22;39m \x1b[0m${msg}\x1b[39m`

  if (this._traced) {
    for (let index = 0; index < stack.length; index++) {
      formatted += `\n    \x1b[36mat ${stack[index].toString()}\x1b[39m`
    }
    return formatted
  }

  if (caller) {
    formatted += ` \x1b[36m${formatLocation(caller)}\x1b[39m`
  }
  return formatted
}

/**
 * 检测emitter实例是否存在给定事件类型的监听
 * @param {EventEmitter} emitter EventEmitter实例
 * @param {string} event 事件名称
 */
function eehaslisteners (emitter, event) {
  const count = typeof emitter.listenerCount !== 'function'
    ? emitter.listeners(event).length
    : emitter.listenerCount(event)
  return count > 0
}

function wrapfunction (fn, message) {
  if (typeof fn !== 'function') {
    throw new TypeError('第一个参数必须是函数')
  }
  const args = createArgumentsString(fn.length)
  const stack = getStack()
  const site = callSiteLocation(stack[1])
  site.name = fn.name

  const deprecatedfn = new Function('fn', 'log', 'deprecate', 'message', 'site',
    `
    "use strict"\n
    return function(${args} {\n
      log.call(deprecate, message, site)\n
      return fn.apply(this, arguments)\n
    })
    `
  )(fn, log, this, message, site)

  return deprecatedfn
}

function wrapproperty (obj, prop, message) {
  if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
    throw new TypeError('第一个参数必须是对象')
  }
  let descriptor = Object.getOwnPropertyDescriptor(obj, prop)

  if (!descriptor) {
    throw new TypeError('第二个参数必须是第一个参数对象的属性')
  }

  if (!descriptor.configurable) {
    throw new TypeError('属性必须是可以配置的')
  }

  const deprecate = this
  const stack = getStack()
  const site = callSiteLocation(stack[1])
  site.name = prop

  if ('value' in descriptor) {
    descriptor = convertDataDescriptorToAccessor(obj, prop)
  }
  const get = descriptor.get
  const set = descriptor.set

  if (typeof get === 'function') {
    descriptor.get = function getter () {
      log.call(deprecate, message, site)
      return get.apply(this, arguments)
    }
  }
  if (typeof set === 'function') {
    descriptor.set = function setter () {
      log.call(deprecate, message, site)
      return set.apply(this, arguments)
    }
  }

  Object.defineProperty(obj, prop, descriptor)
}

function DeprecationError (namespace, message, stack) {
  const error = new Error()
  let stackString

  Object.defineProperty(error, 'constructor', {
    value: DeprecationError
  })

  Object.defineProperty(error, 'message', {
    configurable: true,
    enumerable: false,
    value: message,
    writable: true
  })

  Object.defineProperty(error, 'name', {
    enumerable: false,
    configurable: true,
    value: 'DeprecationError',
    writable: true
  })

  Object.defineProperty(error, 'namespace', {
    configurable: true,
    enumerable: false,
    value: namespace,
    writable: true
  })

  Object.defineProperty(error, 'stack', {
    configurable: true,
    enumerable: false,
    get: function () {
      if (stackString !== undefined) {
        return stackString
      }

      // prepare stack trace
      return (stackString = createStackString.call(this, stack))
    },
    set: function setter (val) {
      stackString = val
    }
  })

  return error
}

module.exports = index
