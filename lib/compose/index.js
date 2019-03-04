/**
 * 中间件组合
 * @param {Array} middleware 中间件数组
 * @return {Function}
 */
function compose (middleware) {
  if (!Array.isArray(middleware)) {
    throw new TypeError('中间件栈必须是一个数组')
  }
  for (const fn of middleware) {
    if (typeof fn !== 'function') {
      throw new TypeError('每个中间件必须为一个函数')
    }
  }

  /**
   * @param {object} context ma的上下文
   * @param {function} next 所有中间件执行完后执行的回调
   */
  return function (context, next) {
    let index = -1
    function dispatch (i) {
      if (i <= index) {
        return Promise.reject(new Error('同一个中间件内部next()多次调用'))
      }
      index = i
      let fn = middleware[i]
      if (i === middleware.length) {
        fn = next
      }
      if (!fn) { // 已经不存在下一个中间件
        return Promise.resolve()
      }
      try {
        // 1. fn1(context, () => dispatch(1)) ------ dispatch(0) 调用第一个中间件

        // 2. ---> 中间件会调用next(), 即调用dispatch(1)

        // 3. fn1(context, fn2(context, () => dispatch(2))) ------ dispatch(1) 调用下一个中间件
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (error) {
        return Promise.reject(error)
      }
    }
    return dispatch(0)
  }
}

module.exports = compose
