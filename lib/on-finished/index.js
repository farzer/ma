/**
 * https://github.com/jshttp/on-finished
 * 当请求完成、关闭或者错误的时候触发回调
 *
 * on-finished通过onFinished方法进行绑定回调，可以多次绑定，
 * onFinished方法会在res上挂载一个单例__onFinished，
 * 单例__onFinished是一个回调函数，__onFinished有一个属性queue用于存储通过onFinished设置的回调函数
 * onFinished通过监听res的end或finish方法，或者是socket的close或error方法来获取请求是否结束，
 * 请求结束后，调用单例res上的单例__onFinished，清理单例__onFinished，并循环调用__onFinished上queue的回调方法
 */

// first 作用是竞争事件出发后执行回调并清除监听列表
const first = require('./first')

// 延迟执行
const defer = typeof setImmediate === 'function' ? setImmediate : function (fn) {
  process.nextTick(fn.bind.apply(fn, arguments))
}

/**
 *
 * @param {object} message <IncomingMessage | ServerResponse> 类
 * @param {function} listener 要触发的回调
 * @return {object} <IncomingMessage | ServerResponse>
 */
function index (message, listener) {
  // 如果message是完成或者是undefined状态，触发监视器回调
  if (isFinished(message) !== false) {
    defer(listener, null, message)
    return message
  }

  // 如果是未完成状态，添加监听器
  attachListener(message, listener)
  return message
}

/**
 * 判断IncomingMessage或者ServerResponse的状态是否是已完成
 * @param {IncomingMessage|ServerResponse} message 要进行判断的IncomingMessage或者ServerResponse
 */
function isFinished (message) {
  const socket = message.socket
  // request.finished 如果调用了 request.end()，则 request.finished 属性将为 true
  // response.finished 表明响应是否已完成。默认为 false。 在 response.end() 执行之后，该值将为 true
  if (typeof message.finished === 'boolean') {
    // ServerResponse
    // 当socket end事件结束后，socket不可写 socket.writable === false
    return Boolean(message.finished || (socket && !socket.writable))
  }

  // 如果已收到并成功解析完整的 HTTP 消息，则 message.complete 属性将为 true
  // 此属性可用于判断客户端或服务器在连接终止之前是否完全传输消息
  if (typeof message.complete === 'boolean') {
    // IncomingMessage 对象由 http.Server 或 http.ClientRequest 创建
    // 并分别作为第一个参数传给 'request' 和 'response' 事件

    // 使用带有 Upgrade 头的HTTP请求时，由于 node.js 接口事件的限制，请求将立即被视为"已经完成"
    return Boolean(message.upgrade || !socket || !socket.readable || (message.complete && !message.readable))
  }

  // 无法识别message
  return undefined
}

/**
 * 为socket添加监听
 * @param {object} message 要添加监听的IncomingMessage或者ServerResponse
 * @param {function} listener
 */
function attachListener (message, listener) {
  let attached = message.__onFinished
  // 如果__onFinished回调不存在或者不存在队列，创建私有监听队列
  if (!attached || !attached.queue) {
    message.__onFinished = createListener(message)
    attached = message.__onFinished
    attachFinishedListener(message, attached)
  }
  attached.queue.push(listener)
}

function createListener (message) {
  function attached (err) {
    if (message.__onFinished === attached) {
      delete message.__onFinished
    }
    if (!attached.queue) {
      return
    }

    const queue = attached.queue
    for (let index = 0; index < queue.length; index++) {
      queue[index](err, message)
    }
  }
  attached.queue = []
  return attached
}

/**
 * 为socket添加完成的监听
 * @param {object} message 要添加监听的socket
 * @param {function} attached
 */
function attachFinishedListener (message, attached) {
  let eeThunk, thunk
  let finished = false

  function onFinish (error) {
    // 清理事件监听
    eeThunk.cancel()
    thunk.cancel()
    finished = true
    attached(error)
  }
  function onSocket (socket) {
    message.removeListener('socket', onSocket)

    if (finished || eeThunk !== thunk) {
      return
    }

    // socket的close或error方法来获取请求是否结束
    thunk = first([[socket, 'error', 'close']], onFinish)
  }

  // 监听res的end或finish方法是否结束
  eeThunk = thunk = first([[message, 'end', 'finish']], onFinish)
  if (message.socket) {
    onSocket(message.socket)
    return
  }
  message.on('socket', onSocket)
  if (message.socket === undefined) {
    pathAssignSocket(message, onSocket)
  }
}

/**
 * 为ServerResponse添加assignSocket补丁
 * @param {ServerResponse} res 服务器响应体
 * @param {function} callback
 */
function pathAssignSocket (res, callback) {
  const assignSocket = res.assignSocket
  if (typeof assignSocket !== 'function') {
    return
  }
  res.assignSocket = function _assignSocket (socket) {
    assignSocket.call(this, socket)
    callback(socket)
  }
}

index.isFinished = isFinished

module.exports = index
