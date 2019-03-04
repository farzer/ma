/**
 * @see https://github.com/substack/node-deep-equal
 */

const supportsArgumentsClass = (function () {
  return Object.prototype.toString.call(arguments)
})() === '[object Arguments]'

function supported (object) {
  return Object.prototype.toString.call(object) === '[object Arguments]'
}

function unsupported (object) {
  return object &&
    typeof object === 'object' &&
    typeof object.length === 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false
}

const isArguments = supportsArgumentsClass ? supported : unsupported

isArguments.supported = supported

isArguments.unsupported = unsupported

const isUndefinedOrNull = value => value === null || value === undefined

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') {
    return false
  }
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false
  }
  if (x.length > 0 && typeof x[0] !== 'number') {
    return false
  }
  return true
}

const pSlice = Array.prototype.slice

function objEquiv (a, b, opts) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b)) {
    return false
  }
  if (a.prototype !== b.prototype) {
    return false
  }
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false
    }
    a = pSlice.call(a)
    b = pSlice.call(b)
    return index(a, b, opts)
  }

  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false
    }
    if (a.length !== b.length) {
      return false
    }
    for (let index = 0; index < a.length; index++) {
      if (a[index] !== b[index]) {
        return false
      }
    }
    return true
  }

  let ka, kb
  try {
    ka = Object.keys(a)
    kb = Object.keys(b)
  } catch (e) {
    return false
  }
  if (ka.length !== kb.length) {
    return false
  }
  ka.sort()
  kb.sort()
  for (let index = ka.length - 1; index >= 0; index--) {
    if (ka[index] !== kb[index]) {
      return false
    }
  }
  let key
  for (let index = ka.length - 1; index >= 0; index--) {
    key = ka[index]
    if (!index(a[key], b[key], opts)) {
      return false
    }
  }
  return typeof a === typeof b
}

function index (actual, expected, opts) {
  if (!opts) {
    opts = {}
  }
  if (actual === expected) {
    return true
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime()
  } else if (!actual || !expected || typeof actual !== 'object' && typeof expected !== 'object') {
    return opts.strict ? actual === expected : actual == expected // eslint-disable-line
  } else {
    return objEquiv(actual, expected, opts)
  }
}

module.exports = index
