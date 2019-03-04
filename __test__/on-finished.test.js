const http = require('http')
const net = require('net')
const onFinished = require('../lib/on-finished')

function sendGet (server) {
  server.listen(() => {
    const port = server.address().port
    http.get('http://127.0.0.1:' + port, (res) => {
      res.resume()
      res.on('end', server.close.bind(server))
    })
  })
}

function writeRequest (socket, chunked) {
  socket.write('GET / HTTP/1.1\r\n')
  socket.write('Host: localhost\r\n')
  socket.write('Connection: keep-alive\r\n')

  if (chunked) {
    socket.write('Transfer-Encoding: chunked\r\n')
  }

  socket.write('\r\n')
}

describe('onFinished(res, listener)', () => {
  test('会触发回调，如果传入一个未知的对象', done => {
    onFinished({}, done)
  })

  describe('当响应完成', () => {
    test('应该触发回调', (done) => {
      const server = http.createServer((req, res) => {
        onFinished(res, done)
        setTimeout(res.end.bind(res), 0)
      })
      sendGet(server)
    })
    test('应该包含返回响应体对象', (done) => {
      const server = http.createServer((req, res) => {
        onFinished(res, (err, msg) => {
          expect(err).toBeFalsy()
          expect(msg).toStrictEqual(res)
          done()
        })
        setTimeout(() => {
          res.end()
        }, 0)
      })
      sendGet(server)
    })

    test('应该在完成事件后直接触发回调', (done) => {
      const server = http.createServer((req, res) => {
        onFinished(res, () => {
          onFinished(res, done)
        })
        setTimeout(res.end.bind(res), 0)
      })
      sendGet(server)
    })
  })
  describe('当使用keep-alive的时候', () => {
    test('应该为每个响应触发回调', (done) => {
      let called = false
      let socket
      const server = http.createServer((req, res) => {
        onFinished(res, () => {
          if (called) {
            socket.end()
            server.close()
            done(called !== req ? null : new Error('调用同一个请求两次'))
            return
          }
          called = req
          writeRequest(socket)
        })
        res.end()
      })
      server.listen(() => {
        socket = net.connect(server.address().port, () => {
          writeRequest(socket)
        })
      })
    })
  })

  describe('当请求再管道中', () => {
    test('应该触发每一个请求回调', (done) => {
      let count = 0
      const responses = []
      let socket
      const server = http.createServer((req, res) => {
        responses.push(res)
        onFinished(res, (err) => {
          expect(err).toBeFalsy()
          expect(responses[0]).toStrictEqual(res)
          responses.shift()

          if (responses.length === 0) {
            socket.end()
            return
          }

          responses[0].end('response b')
        })

        onFinished(req, (err) => {
          expect(err).toBeFalsy()
          if (++count !== 2) {
            return
          }
          expect(responses.length).toStrictEqual(2)
          responses[0].end('response a')
        })
        if (responses.length === 1) {
          writeRequest(socket)
        }
        req.resume()
      })
      server.listen(() => {
        let data = ''
        socket = net.connect(server.address().port, () => {
          writeRequest(socket)
        })

        socket.on('data', (chunk) => {
          data += chunk.toString('binary')
        })
        socket.on('end', () => {
          expect(/response a/.test(data)).toBe(true)
          expect(/response b/.test(data)).toBe(true)
          server.close(done)
        })
      })
    })
  })

  describe('当响应错误', () => {
    // test('每次错误应该触发回调', (done) => {
    //   let socket
    //   const server = http.createServer((req, res) => {
    //     onFinished(res, err => {
    //       expect(err).not.toBeFalsy()
    //       server.close(done)
    //     })

    //     socket.on('error', () => {})
    //     socket.write('W')
    //   })
    //   server.listen(() => {
    //     socket = net.connect(server.address().port, () => {
    //       writeRequest(socket, true)
    //     })
    //   })
    // })
  })
})
