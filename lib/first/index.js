/**
 * ee-first 学习
 * 一个竞争事件收集器，可以为多个事件对象绑定多个事件，并在某个事件触发后移除该对象的所有事件
 * @param {array} stuff 竞争事件数组
 * @param {function} done 竞争时间后的回调
 * @returns {function} thunk
 */

function index (stuff, done = () => {}) {
  if (!Array.isArray(stuff)) {
    throw new TypeError('stuff参数必须是一个二维数组，元素为[EventEmitter实例, event事件+(+表示一个或者多个)]')
  }
  // cleanups变量保存所有事件对象绑定事件的数组
  const cleanups = []

  // 清理所有注册的监听事件
  // 之所以需要清除是因为绑定事件监听函数会对内存有不小的消耗，默认最多十多
  function cleanup () {
    for (let index = 0; index < cleanups.length; index++) {
      const element = cleanups[index]
      element.ee.removeListener(element.event, element.fn)
    }
  }

  for (let index = 0; index < stuff.length; index++) {
    const element = stuff[index]
    if (!Array.isArray(element) || element.length < 2) {
      throw TypeError('数组元素结构为[EventEmitter实例, event事件+]')
    }

    const ee = element[0]
    for (let j = 1; j < element.length; j++) {
      const event = element[j]
      // 对传入的每一个事件名，都会通过 listener 生成一个事件监听函数
      const fn = listener(event, callback)

      // 将生成的事件响应函数绑定到对应的 EventEmitter
      ee.on(event, fn)

      // 把事件监听推进要清理的列表
      cleanups.push({
        ee,
        event,
        fn
      })
    }
  }

  // 注册事件的回调需要做两件事
  // 1. 清空所有注册事件
  // 2. 触发竞争事件
  function callback () {
    cleanup()
    done.apply(null, arguments)
  }

  function thunk (fn) {
    done = fn
  }

  thunk.cancel = cleanup

  return thunk
}

function listener (event, done) {
  return function onevent (arg1) {
    const args = new Array(arguments.length)
    const ee = this
    // 对 error 事件进行了特殊的处理
    // 因为在 Node.js 中，假如进行某些操作失败了的话，那么会将错误信息作为第一个参数传给回调函数
    const err = event === 'error' ? arg1 : null

    for (let index = 0; index < args.length; index++) {
      args[index] = arguments[index]
    }
    done(err, ee, event, args)
  }
}

module.exports = index
