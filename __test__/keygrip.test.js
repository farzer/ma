const crypto = require('crypto')
const Keygrip = require('../lib/keygrip')

describe('Keygrip', () => {
  describe('构造方法', () => {
    test('构造实例', () => {
      const keys = new Keygrip(['SEKRIT1'])
      expect(keys).toBeTruthy()
      expect(keys).toBeInstanceOf(Keygrip)
    })

    test('可以省略new关键字', () => {
      const keys = Keygrip(['SEKRIT1'])
      expect(keys).toBeTruthy()
      expect(keys).toBeInstanceOf(Keygrip)
    })
  })
  describe('keys 参数', () => {
    describe('当为undefined', () => {
      test('抛出错误', () => {
        let keys
        const test = () => {
          keys = new Keygrip()
        }
        expect(test).toThrow(/keys参数不能为空/)
        expect(!keys).toBeTruthy()
      })
    })

    describe('当为空数组', () => {
      test('抛出错误', () => {
        let keys
        expect(() => {
          keys = new Keygrip([])
        }).toThrow(/keys参数不能为空/)
        expect(!keys).toBeTruthy()
      })
    })

    describe('当为字符串数组', () => {
      test('返回一个Keygrip实例对象', () => {
        const keys = new Keygrip(['SEKRIT1'])
        expect(keys).toBeTruthy()
        expect(keys).toBeInstanceOf(Keygrip)
      })
    })
  })
  describe('.index(data) 方法', () => {
    test('应该返回签名数据的key索引', () => {
      const keys = new Keygrip(['SEKRIT1', 'SEKRIT2'])
      const data = 'Keyboard Cat has a hat'
      const hash1 = generatorHashStr('SEKRIT1', data)
      const hash2 = generatorHashStr('SEKRIT2', data)
      expect(keys.index(data, hash1)).toStrictEqual(0)
      expect(keys.index(data, hash2)).toStrictEqual(1)
    })

    test('如果没有匹配的key应该返回-1', (done) => {
      const keys = new Keygrip(['SEKRIT1', 'SEKRIT2'])
      const data = 'Keyboard Cat has a hat'
      const hash3 = generatorHashStr('SEKRIT3', data)
      expect(keys.index(data, hash3)).toStrictEqual(-1)
      done()
    })

    describe('传入algorithm参数', () => {
      test('应该返回使用algorithm的key索引', () => {
        const keys = new Keygrip(['SEKRIT1'], 'sha256')
        const data = 'Keyboard Cat has a hat'
        const hashStr = generatorHashStr('SEKRIT1', data, 'sha256')
        expect(keys.index(data, hashStr)).toStrictEqual(0)
      })
    })

    describe('传入encoding参数', () => {
      test('应该返回使用encoding的key index', () => {
        const keys = new Keygrip(['SEKRIT1'], undefined, 'hex')
        const data = 'Keyboard Cat has a hat'
        const hashStr = generatorHashStr('SEKRIT1', data, undefined, 'hex')
        expect(keys.index(data, hashStr)).toStrictEqual(0)
      })
    })
  })
  describe('.sign(data) 方法', () => {
    test('对一个字符串进行签名', () => {
      const keys = new Keygrip(['SEKRIT1'])
      const data = 'Keyboard Cat has a hat'
      const hashTemp = generatorHashStr('SEKRIT1', data)
      const hash = keys.sign(data)
      expect(hash).toStrictEqual(hashTemp)
    })

    test('会使用第一个key作为秘钥进行签名', () => {
      const keys = new Keygrip(['SEKRIT2', 'SEKRIT1'])
      const data = 'Keyboard Cat has a hat'
      const hashTemp = generatorHashStr('SEKRIT2', data)
      const hashTemp2 = generatorHashStr('SEKRIT1', data)
      const hash = keys.sign(data)
      expect(hash).toStrictEqual(hashTemp)
      expect(hash).not.toStrictEqual(hashTemp2)
    })

    describe('传入algorithm', () => {
      test('应该返回使用传入algorithm的签名', () => {
        const keys = new Keygrip(['SEKRIT1'], 'sha256')
        const data = 'Keyboard Cat has a hat'
        const hash = keys.sign(data)
        const hashTemp = generatorHashStr('SEKRIT1', data, 'sha256')
        expect(hash).toStrictEqual(hashTemp)
      })
    })
    describe('传入encoding', () => {
      test('应该返回使用传入encoding的签名', () => {
        const keys = new Keygrip(['SEKRIT1'], undefined, 'hex')
        const data = 'Keyboard Cat has a hat'
        const hash = keys.sign(data)
        const hashTemp = generatorHashStr('SEKRIT1', data, undefined, 'hex')
        expect(hash).toStrictEqual(hashTemp)
      })
    })
  })
})

function generatorHashStr (key, data, algorithm = 'sha1', encoding = 'base64') {
  return crypto.createHmac(algorithm, key).update(data).digest(encoding).replace(/\/|\+|=/g, function (x) {
    return ({ '/': '_', '+': '-', '=': '' })[x]
  })
}
