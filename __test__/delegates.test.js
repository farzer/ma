const delegate = require('../lib/delegates')
describe('.method(name)', () => {
  test('代理方法', () => {
    const obj = {}
    obj.request = {
      foo: function (bar) {
        expect(this).toStrictEqual(obj.request)
        return bar
      }
    }
    delegate(obj, 'request').method('foo')
    expect(obj.foo('something')).toEqual('something')
  })
})

describe('.getter(name)', () => {
  test('代理getter', () => {
    const obj = {}
    obj.request = {
      get type () {
        return 'text/html'
      }
    }
    delegate(obj, 'request').getter('type')
    expect(obj.type).toStrictEqual('text/html')
  })
})

describe('.setter(name)', () => {
  test('代理setter', () => {
    const obj = {}
    obj.request = {
      get type () {
        return this._type.toUpperCase()
      },
      set type (val) {
        this._type = val
      }
    }
    delegate(obj, 'request').setter('type')
    obj.type = 'key'
    expect(obj.request.type).toStrictEqual('KEY')
  })
})

describe('.assess(name)', () => {
  test('代理getter和setter', () => {
    const obj = {}
    obj.request = {
      get type () {
        return this._type.toUpperCase()
      },
      set type (val) {
        this._type = val
      }
    }
    delegate(obj, 'request').access('type')
    obj.type = 'key'
    expect(obj.type).toStrictEqual('KEY')
  })
})
