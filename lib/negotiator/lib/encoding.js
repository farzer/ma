const simpleEncodingRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/

/**
 * 解释 Accept-Encoding header.
 * @param {Array} accept Accept-Encoding header.
 * @private
 */
function parseAcceptEncoding (accept) {
  const accepts = accept.split(',')
  let hasIdentity = false
  let minQuality = 1
  let i, j
  for (i = 0, j = 0; i < accepts.length; i++) {
    const encoding = parseEncoding(accepts[i].trim(), i)

    if (encoding) {
      accepts[j++] = encoding
      hasIdentity = hasIdentity || specify('identity', encoding)
      minQuality = Math.min(minQuality, encoding.q || 1)
    }
  }

  if (!hasIdentity) {
    /*
     * If identity doesn't explicitly appear in the accept-encoding header,
     * it's added to the list of acceptable encoding with the lowest q
     */
    accepts[j++] = {
      encoding: 'identity',
      q: minQuality,
      i: i
    }
  }

  // trim accepts
  accepts.length = j

  return accepts
}

/**
 * Parse an encoding from the Accept-Encoding header.
 * @private
 */

function parseEncoding (str, i) {
  var match = simpleEncodingRegExp.exec(str)
  if (!match) return null

  var encoding = match[1]
  var q = 1
  if (match[2]) {
    var params = match[2].split(';')
    for (i = 0; i < params.length; i++) {
      var p = params[i].trim().split('=')
      if (p[0] === 'q') {
        q = parseFloat(p[1])
        break
      }
    }
  }

  return {
    encoding: encoding,
    q: q,
    i: i
  }
}

/**
 * Get the priority of an encoding.
 * @private
 */

function getEncodingPriority (encoding, accepted, index) {
  let priority = { o: -1, q: 0, s: 0 }

  for (let i = 0; i < accepted.length; i++) {
    const spec = specify(encoding, accepted[i], index)

    if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
      priority = spec
    }
  }

  return priority
}

/**
 * Get the specificity of the encoding.
 * @private
 */

function specify (encoding, spec, index) {
  let s = 0
  if (spec.encoding.toLowerCase() === encoding.toLowerCase()) {
    s |= 1
  } else if (spec.encoding !== '*') {
    return null
  }

  return {
    i: index,
    o: spec.i,
    q: spec.q,
    s: s
  }
};

/**
 * Get the preferred encodings from an Accept-Encoding header.
 * @public
 */

function preferredEncodings (accept, provided) {
  const accepts = parseAcceptEncoding(accept || '')

  if (!provided) {
    // sorted list of all encodings
    return accepts
      .filter(isQuality)
      .sort(compareSpecs)
      .map(getFullEncoding)
  }

  const priorities = provided.map(function getPriority (type, index) {
    return getEncodingPriority(type, accepts, index)
  })

  // sorted list of accepted encodings
  return priorities.filter(isQuality).sort(compareSpecs).map(function getEncoding (priority) {
    return provided[priorities.indexOf(priority)]
  })
}

/**
 * Compare two specs.
 * @private
 */

function compareSpecs (a, b) {
  return (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i) || 0
}

/**
 * Get full encoding string.
 * @private
 */

function getFullEncoding (spec) {
  return spec.encoding
}

/**
 * Check if a spec has any quality.
 * @private
 */

function isQuality (spec) {
  return spec.q > 0
}

module.exports = preferredEncodings
