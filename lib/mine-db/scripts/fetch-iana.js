
/**
 * Convert the IANA definitions from CSV to local.
 */

global.Promise = global.Promise || loadBluebird()

const co = require('co')
const getRawBody = require('raw-body')
const cogent = require('cogent')
const parser = require('csv-parse')
const toArray = require('stream-to-array')
const writedb = require('./lib/write-db')

const extensionsRegExp = /^\s*(?:\d\.\s+)?File extension(?:\(s\)|s|)\s?:\s+(?:\*\.|\.|)([0-9a-z_-]+)\s*(?:\(|$)/im
const extensionsQuotedRegExp = /^\s*(?:\d\.\s+)?File extension(?:\(s\)|s|)\s?:(?:[^'"\r\n]+)(?:"\.?([0-9a-z_-]+)"|'\.?([0-9a-z_-]+)')/im
const intendedUsageRegExp = /^\s*(?:(?:\d{1,2}\.|o)\s+)?Intended\s+Usage\s*:\s*(\S+)/im
const leadingSpacesRegExp = /^\s+/
const listColonRegExp = /:(?:\s|$)/m
const nameWithNotesRegExp = /^(\S+)(?: - (.*)$| \((.*)\)$|)/
const mimeTypeLineRegExp = /^(?:\s*|[^:\s-]*\s+)(?:MIME type(?: name)?|MIME media type(?: name)?|Media type(?: name)?|Type name)\s?:\s+(.*)$/im
const mimeSubtypeLineRegExp = /^[^:\s-]*\s*(?:MIME |Media )?subtype(?: name)?\s?:\s+(?:[a-z]+ Tree\s+(?:- ?)?|(?:[a-z]+ )+- )?([^([\r\n]*).*$/im
const mimeSubtypesLineRegExp = /^[^:\s-]*\s*(?:MIME |Media )?subtype(?: names)?\s?:\s+(?:[a-z]+ Tree\s+(?:- ?)?)?(.*)$/im
const rfcReferenceRegExp = /\[(RFC[0-9]{4})]/gi
const slurpModeRegExp = /^\s{0,3}(?:[1-4]\. )?[a-z]{4,}(?: [a-z]{4,})+(?:s|\(s\))?\s*:\s*/i
const symbolRegExp = /[._-]/g
const trimQuotesRegExp = /^"|"$/gm
const urlReferenceRegExp = /\[(https?:\/\/[^\]]+)]/gi

co(function * () {
  let gens = yield [
    get('application', { extensions: /\/vnd\.apple\./ }),
    get('audio'),
    get('font', { extensions: true }),
    get('image', { extensions: true }),
    get('message', { extensions: true }),
    get('model'),
    get('multipart'),
    get('text'),
    get('video')
  ]

  // flatten generators
  gens = gens.reduce(concat, [])

  // get results in groups
  let results = []
  while (gens.length !== 0) {
    results.push(yield gens.splice(0, 10))
  }

  // flatten results
  results = results.reduce(concat, [])

  const json = Object.create(null)
  results.forEach(function (result) {
    const mime = result.mime

    if (mime in json) {
      throw new Error('duplicate entry for ' + mime)
    }

    json[mime] = {
      extensions: result.extensions,
      notes: result.notes,
      sources: result.sources
    }
  })

  writedb('src/iana-types.json', json)
}).then()

function addTemplateData (data, options) {
  const opts = options || {}

  if (!data.template) {
    return data
  }

  return function * get () {
    let res = yield * cogent('http://www.iana.org/assignments/media-types/' + data.template, { retries: 3 })
    const ref = data.type + '/' + data.name
    const rfc = getRfcReferences(data.reference)[0]

    if (res.statusCode === 404 && data.template !== ref) {
      console.log('template ' + data.template + ' not found, retry as ' + ref)
      data.template = ref
      res = yield * cogent('http://www.iana.org/assignments/media-types/' + ref, { retries: 3 })

      // replace the guessed mime
      if (res.statusCode === 200) {
        data.mime = data.template
      }
    }

    if (res.statusCode === 404 && rfc !== undefined) {
      console.log('template ' + data.template + ' not found, fetch ' + rfc)
      res = yield * cogent('http://tools.ietf.org/rfc/' + rfc.toLowerCase() + '.txt')
    }

    if (res.statusCode === 404) {
      console.log('template ' + data.template + ' not found')
      return data
    }

    if (res.statusCode !== 200) {
      throw new Error('got status code ' + res.statusCode + ' from template ' + data.template)
    }

    const body = yield getTemplateBody(res)
    const href = res.urls[0].href
    const mime = extractTemplateMime(body)

    // add the template as a source
    addSource(data, href)

    if (mimeEql(mime, data.mime)) {
      // use extracted mime
      data.mime = mime

      // use extracted extensions
      const useExt = opts.extensions &&
        (opts.extensions === true || opts.extensions.test(data.mime))
      if (useExt && extractIntendedUsage(body) === 'common') {
        data.extensions = extractTemplateExtensions(body)
      }
    }

    return data
  }
}

function extractIntendedUsage (body) {
  const match = intendedUsageRegExp.exec(body)

  return match
    ? match[1].toLocaleLowerCase()
    : undefined
}

function extractTemplateMime (body) {
  let type = mimeTypeLineRegExp.exec(body)
  let subtype = mimeSubtypeLineRegExp.exec(body)

  if (!subtype && (subtype = mimeSubtypesLineRegExp.exec(body)) && !/^[A-Za-z0-9]+$/.test(subtype[1])) {
    return
  }

  if (!type || !subtype) {
    return
  }

  type = type[1].trim().replace(trimQuotesRegExp, '')
  subtype = subtype[1].trim().replace(trimQuotesRegExp, '')

  if (!subtype) {
    return
  }

  if (subtype.substr(0, type.length + 1) === type + '/') {
    // strip type from subtype
    subtype = subtype.substr(type.length + 1)
  }

  return (type + '/' + subtype).toLowerCase()
}

function extractTemplateExtensions (body) {
  const match = extensionsRegExp.exec(body) || extensionsQuotedRegExp.exec(body)

  if (!match) {
    return
  }

  const ext = (match[1] || match[2]).toLowerCase()

  if (ext !== 'none' && ext !== 'undefined') {
    return [ext]
  }
}

function * get (type, options) {
  const res = yield * cogent('http://www.iana.org/assignments/media-types/' + encodeURIComponent(type) + '.csv', { retries: 3 })

  if (res.statusCode !== 200) {
    throw new Error('got status code ' + res.statusCode + ' from ' + type)
  }

  const mimes = yield toArray(res.pipe(parser()))
  const headers = mimes.shift().map(normalizeHeader)
  const reduceRows = generateRowMapper(headers)
  const templates = Object.create(null)

  return mimes.map(function (row) {
    const data = row.reduce(reduceRows, { type: type })

    if (data.template) {
      if (data.template === type + '/example') {
        return
      }

      if (templates[data.template]) {
        // duplicate entry
        return
      }

      templates[data.template] = true
    }

    // guess mime type
    data.mime = (data.template || (type + '/' + data.name)).toLowerCase()

    // extract notes from name
    const nameMatch = nameWithNotesRegExp.exec(data.name)
    data.name = nameMatch[1]
    data.notes = nameMatch[2] || nameMatch[3]

    // add reference sources
    parseReferences(data.reference).forEach(function (url) {
      addSource(data, url)
    })

    return addTemplateData(data, options)
  })
}

function * getTemplateBody (res) {
  const body = yield getRawBody(res, { encoding: 'ascii' })
  const lines = body.split(/\r?\n/)
  let slurp = false

  return lines.reduce(function (lines, line) {
    line = line.replace(/=20$/, ' ')

    const prev = (lines[lines.length - 1] || '')
    const match = leadingSpacesRegExp.exec(line)

    if (slurp && line.trim().length === 0 && !/:\s*$/.test(prev)) {
      slurp = false
      return lines
    }

    if (slurpModeRegExp.test(line)) {
      slurp = false
      lines.push(line)
    } else if (slurp) {
      lines[lines.length - 1] = appendToLine(prev, line)
    } else if (match && match[0].length >= 3 && match[0].trim() !== 0 && prev.trim().length !== 0 && !listColonRegExp.test(line)) {
      lines[lines.length - 1] = appendToLine(prev, line)
    } else {
      lines.push(line)
    }

    // turn on slurp mode
    slurp = slurp || slurpModeRegExp.test(line)

    return lines
  }, []).join('\n')
}

function addSource (data, url) {
  const sources = data.sources || (data.sources = [])

  if (sources.indexOf(url) === -1) {
    sources.push(url)
  }
}

function appendToLine (line, str) {
  const trimmed = line.trimRight()
  const append = trimmed.substr(-1) === '-'
    ? str.trimLeft()
    : ' ' + str.trimLeft()
  return trimmed + append
}

function concat (a, b) {
  return a.concat(b.filter(Boolean))
}

function generateRowMapper (headers) {
  return function reduceRows (obj, val, index) {
    if (val !== '') {
      obj[headers[index]] = val
    }

    return obj
  }
}

function getRfcReferences (reference) {
  let match = null
  const rfcs = []

  rfcReferenceRegExp.index = 0

  while ((match = rfcReferenceRegExp.exec(reference))) {
    rfcs.push(match[1].toUpperCase())
  }

  return rfcs
}

function getUrlReferences (reference) {
  let match = null
  const urls = []

  urlReferenceRegExp.index = 0

  while ((match = urlReferenceRegExp.exec(reference))) {
    urls.push(match[1])
  }

  return urls
}

function loadBluebird () {
  const Promise = require('bluebird')

  // Silence all warnings
  Promise.config({
    warnings: false
  })

  return Promise
}

function mimeEql (mime1, mime2) {
  return mime1 && mime2 &&
    mime1.replace(symbolRegExp, '-') === mime2.replace(symbolRegExp, '-')
}

function normalizeHeader (val) {
  return val.substr(0, 1).toLowerCase() + val.substr(1).replace(/ (.)/, function (s, c) {
    return c.toUpperCase()
  })
}

function parseReferences (reference) {
  return getUrlReferences(reference).concat(getRfcReferences(reference).map(function (rfc) {
    return 'http://tools.ietf.org/rfc/' + rfc.toLowerCase() + '.txt'
  }))
}
