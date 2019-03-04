const http = require('http')
const request = require('supertest')
const Keygrip = require('../lib/keygrip')
const Cookies = require('../lib/cookies')
const Cookie = Cookies.Cookie

describe('new Cookie(name, value, [options]', () => {
  it('正确的构造函数', () => {
    const cookie = new Cookie('foo', 'bar')
    // cookie.__proto__ = Cookies.Cookie.prototype
    expect(cookie.constructor).toStrictEqual(Cookies.Cookie)
  })
  it('抛出不正确的name参数', () => {
    const throwFn = () => {
      new Cookie('foo\n', 'bar')
    }
    expect(throwFn).toThrow('参数name不符合要求')
  })
  it('抛出不正确的value参数', () => {
    const throwFn = () => {
      new Cookie('foo', 'bar\n')
    }
    expect(throwFn).toThrow('参数value不符合要求')
  })
  it('抛出不正确的path', () => {
    const throwFn = () => {
      new Cookie('foo', 'bar', { path: '/\n' })
    }
    expect(throwFn).toThrow('选项path不符合要求')
  })

  it('抛出不正确的domain', () => {
    const throwFn = () => {
      new Cookie('foo', 'bar', { domain: 'baidu.com\n' })
    }
    expect(throwFn).toThrow('选项domain不符合要求')
  })

  describe('options', () => {
    it('设置 maxAge', () => {
      const cookie = new Cookie('foo', 'bar', { maxAge: 86400 })
      expect(cookie.maxAge).toStrictEqual(86400)
    })
    it('设置 domain', () => {
      const cookie = new Cookie('foo', 'bar', { domain: 'baidu.com' })
      expect(cookie.domain).toStrictEqual('baidu.com')
    })
    it('设置httpOnly', () => {
      const cookie = new Cookie('foo', 'bar', { httpOnly: true })
      expect(cookie.httpOnly).toStrictEqual(true)
    })
    describe('sameSite', () => {
      it('设置sameSite属性', () => {
        const cookie = new Cookie('foo', 'bar', { sameSite: true })
        expect(cookie.sameSite).toStrictEqual(true)
      })
      it('默认是false', () => {
        const cookie = new Cookie('foo', 'bar')
        expect(cookie.sameSite).toStrictEqual(false)
      })
      it('抛出不正确的值', () => {
        const throwFn = () => {
          new Cookie('foo', 'bar', { sameSite: 'foo' })
        }
        expect(throwFn).toThrow('选项sameSite不符合要求')
      })

      describe('当设置为false', () => {
        it('不会设置sameSite到header里面', () => {
          const cookie = new Cookie('foo', 'bar', { sameSite: false })
          expect(cookie.toHeader()).toStrictEqual('foo=bar; path=/; httponly')
        })
      })
      describe('当设置为true', () => {
        it('应该在header设置samesite=strict', () => {
          const cookie = new Cookie('foo', 'bar', { sameSite: true })
          expect(cookie.toHeader()).toStrictEqual('foo=bar; path=/; samesite=strict; httponly')
        })
      })
      describe('当设置lax', () => {
        it('应该在header中设置samesite=lax', () => {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'lax' })
          expect(cookie.toHeader()).toStrictEqual('foo=bar; path=/; samesite=lax; httponly')
        })
      })
      describe('当设置成strict', () => {
        it('应该在header设置samesite=strict', () => {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'strict' })
          expect(cookie.toHeader()).toStrictEqual('foo=bar; path=/; samesite=strict; httponly')
        })
      })
      describe('当设置成STRICT', () => {
        it('应该在header设置samesite=strict', () => {
          const cookie = new Cookie('foo', 'bar', { sameSite: 'STRICT' })
          expect(cookie.toHeader()).toStrictEqual('foo=bar; path=/; samesite=strict; httponly')
        })
      })
    })
  })
})

function assertServer (done, test) {
  const server = http.createServer((req, res) => {
    try {
      test(req, res)
      res.end('OK')
    } catch (error) {
      res.statusCode = 500
      res.end(`e.name: ${error.message}`)
    }
  })
  request(server).get('/').expect('OK').expect(200).end(done)
}

describe('new Cookies(req, res, [options]', () => {
  it('创建Cookies的实例', (done) => {
    assertServer(done, (req, res) => {
      const cookies = new Cookies(req, res)
      expect(cookies).toBeTruthy()
      expect(cookies.constructor).toStrictEqual(Cookies)
      expect(cookies.request).toStrictEqual(req)
      expect(cookies.response).toStrictEqual(res)
      expect(cookies.keys).toStrictEqual(undefined)
    })
  })
  describe('options', () => {
    it('接受keys数组', (done) => {
      assertServer(done, (req, res) => {
        const cookies = new Cookies(req, res, { keys: ['keyboard cat'] })
        expect(typeof cookies.keys).toStrictEqual('object')
        const hashStr = cookies.keys.sign('foo=bar')
        expect(hashStr).toStrictEqual('iW2fuCIzk9Cg_rqLT1CAqrtdWs8')
      })
    })

    it('接受Keygrip实例', (done) => {
      assertServer(done, (req, res) => {
        const keys = new Keygrip(['keyboard cat'])
        const cookies = new Cookies(req, res, { keys })
        expect(typeof cookies.keys).toStrictEqual('object')
        const hashStr = cookies.keys.sign('foo=bar')
        expect(hashStr).toStrictEqual('iW2fuCIzk9Cg_rqLT1CAqrtdWs8')
      })
    })
  })
})
