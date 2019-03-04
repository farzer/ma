const EventEmitter = require('events').EventEmitter
const first = require('../lib/first')

describe('测试first', () => {
  test('模块引入成功', () => {
    expect(first).toBeDefined()
  })

  test('第一个参数应该是二维数组', () => {
    const e1 = new EventEmitter()
    expect(first.bind(null, 'string')).toThrow('stuff参数必须是一个二维数组，元素为[EventEmitter实例, event事件+(+表示一个或者多个)]')
    expect(first.bind(null, 1)).toThrow('stuff参数必须是一个二维数组，元素为[EventEmitter实例, event事件+(+表示一个或者多个)]')
    expect(first.bind(null, {})).toThrow('stuff参数必须是一个二维数组，元素为[EventEmitter实例, event事件+(+表示一个或者多个)]')
    expect(first.bind(null, [e1, 'on'])).toThrow('数组元素结构为[EventEmitter实例, event事件+]')
  })

  test('应该返回一个thunk函数', (done) => {
    const e1 = new EventEmitter()
    const e2 = new EventEmitter()
    const thunk = first([
      [e1, 'event1', 'event2', 'event3'],
      [e2, 'event4', 'event5', 'event6']
    ])
    thunk((err, ee, event, args) => {
      expect(err).toBeNull()
      expect(ee).toEqual(e1)
      expect(event).toEqual('event1')
      expect(args).toEqual(['hello'])
      done()
    })
    e1.emit('event1', 'hello')
  })

  test('如果event === error，返回错误', (done) => {
    const e1 = new EventEmitter()
    const e2 = new EventEmitter()
    const e3 = new EventEmitter()
    first([
      [e1, 'error', 'b', 'c'],
      [e2, 'error', 'b', 'c'],
      [e3, 'error', 'b', 'c']
    ], (err, ee, event, args) => {
      expect(err.message).toEqual('Boommmmm')
      expect(ee).toEqual(e3)
      expect(event).toEqual('error')
      done()
    })

    e3.emit('error', new Error('Boommmmm'))
  })

  test('事件触发后触发事件回调', done => {
    const e1 = new EventEmitter()
    first([
      [e1, 'a', 'b', 'c']
    ], () => {
      done()
    })
    e1.emit('a')
  })

  test('事件触发后清楚所有监听', (done) => {
    const e1 = new EventEmitter()
    const e2 = new EventEmitter()
    const e3 = new EventEmitter()
    first([
      [e1, 'a', 'b', 'c'],
      [e2, 'a', 'b', 'c'],
      [e3, 'a', 'b', 'c']
    ], () => {
      [e1, e2, e3].forEach(e => {
        ['a', 'b', 'c'].forEach(listen => {
          expect(e.listenerCount(listen)).toEqual(0)
        })
      })
      done()
    })
    e1.emit('a')
  })

  test('thunk传参改变竞争事件回调', done => {
    const e1 = new EventEmitter()
    const thunk = first([
      [e1, 'a', 'b', 'c']
    ], () => {
      expect(true).toEqual(false)
    })
    thunk(() => {
      done()
    })
    e1.emit('a')
  })

  test('调用thunk.cancel()无法触发事件', done => {
    const e1 = new EventEmitter()
    const thunk = first([
      [e1, 'a', 'b', 'c']
    ], (_, ee, event, args) => {
      expect.apply(null, args).toBeFalsy()
    })
    thunk.cancel()
    e1.emit('a', true)
    process.nextTick(done)
  })

  test('调用thunk.cancel()清除监听列表', (done) => {
    const e1 = new EventEmitter()
    const e2 = new EventEmitter()
    const e3 = new EventEmitter()
    const thunk = first([
      [e1, 'a', 'b', 'c'],
      [e2, 'a', 'b', 'c'],
      [e3, 'a', 'b', 'c']
    ])
    thunk.cancel()
    process.nextTick(() => {
      [e1, e2, e3].forEach(e => {
        ['a', 'b', 'c'].forEach(listen => {
          expect(e.listenerCount(listen)).toEqual(0)
        })
      })
      done()
    })
  })
})
