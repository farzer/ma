const createError = require('../http-errors')
const eql = require('./deep-equal')

function assert (value, status, msg, opts) {
  if (value) {
    return
  }
  throw createError(status, msg, opts)
}

assert.equal = (a, b, status, msg, opts) => assert(a === b, status, msg, opts)
assert.notEqual = (a, b, status, msg, opts) => assert(a != b, status, msg, opts) // eslint-disable-line
assert.ok = (value, status, msg, opts) => assert(value, status, msg, opts)
assert.strictEqual = (a, b, status, msg, opts) => assert(a === b, status, msg, opts)
assert.notStrictEqual = (a, b, status, msg, opts) => assert(a !== b, status, msg, opts)
assert.deepEqual = (a, b, status, msg, opts) => assert(eql(a, b), status, msg, opts)
assert.notDeepEqual = (a, b, status, msg, opts) => assert(!eql(a, b), status, msg, opts)

module.exports = assert
