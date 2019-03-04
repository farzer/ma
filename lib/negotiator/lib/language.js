const simpleLanguageRegExp = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/

/**
 * Parse the Accept-Language header.
 * @private
 */

function parseAcceptLanguage (accept) {
  const accepts = accept.split(',')
  let j = 0
  for (let i = 0; i < accepts.length; i++) {
    const language = parseLanguage(accepts[i].trim(), i)

    if (language) {
      accepts[j++] = language
    }
  }

  // trim accepts
  accepts.length = j

  return accepts
}

/**
 * Parse a language from the Accept-Language header.
 * @private
 */

function parseLanguage (str, i) {
  const match = simpleLanguageRegExp.exec(str)
  if (!match) return null

  const prefix = match[1]
  const suffix = match[2]
  let full = prefix

  if (suffix) full += '-' + suffix

  let q = 1
  if (match[3]) {
    const params = match[3].split(';')
    for (i = 0; i < params.length; i++) {
      const p = params[i].split('=')
      if (p[0] === 'q') q = parseFloat(p[1])
    }
  }

  return {
    prefix: prefix,
    suffix: suffix,
    q: q,
    i: i,
    full: full
  }
}

/**
 * Get the priority of a language.
 * @private
 */

function getLanguagePriority (language, accepted, index) {
  let priority = { o: -1, q: 0, s: 0 }

  for (let i = 0; i < accepted.length; i++) {
    const spec = specify(language, accepted[i], index)

    if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
      priority = spec
    }
  }

  return priority
}

/**
 * Get the specificity of the language.
 * @private
 */

function specify (language, spec, index) {
  const p = parseLanguage(language)
  if (!p) return null
  let s = 0
  if (spec.full.toLowerCase() === p.full.toLowerCase()) {
    s |= 4
  } else if (spec.prefix.toLowerCase() === p.full.toLowerCase()) {
    s |= 2
  } else if (spec.full.toLowerCase() === p.prefix.toLowerCase()) {
    s |= 1
  } else if (spec.full !== '*') {
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
 * Get the preferred languages from an Accept-Language header.
 * @public
 */

function preferredLanguages (accept, provided) {
  // RFC 2616 sec 14.4: no header = *
  const accepts = parseAcceptLanguage(accept === undefined ? '*' : accept || '')

  if (!provided) {
    // sorted list of all languages
    return accepts
      .filter(isQuality)
      .sort(compareSpecs)
      .map(getFullLanguage)
  }

  const priorities = provided.map(function getPriority (type, index) {
    return getLanguagePriority(type, accepts, index)
  })

  // sorted list of accepted languages
  return priorities.filter(isQuality).sort(compareSpecs).map(function getLanguage (priority) {
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
 * Get full language string.
 * @private
 */

function getFullLanguage (spec) {
  return spec.full
}

/**
 * Check if a spec has any quality.
 * @private
 */

function isQuality (spec) {
  return spec.q > 0
}

module.exports = preferredLanguages
