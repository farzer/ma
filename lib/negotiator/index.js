/**
 * http报文解释工具
 * @see https://github.com/jshttp/negotiator/blob/master/index.js
 */
const modules = Object.create(null)

module.exports = Negotiator

function Negotiator (request) {
  if (!(this instanceof Negotiator)) {
    return new Negotiator(request)
  }
  this.request = request
}

Negotiator.prototype.charset = function charset (available) {
  const set = this.charset(available)
  return set && set[0]
}

Negotiator.prototype.charsets = function charsets (available) {
  var preferredCharsets = loadModule('charset').preferredCharsets
  return preferredCharsets(this.request.headers['accept-charset'], available)
}

Negotiator.prototype.encoding = function encoding (available) {
  var set = this.encodings(available)
  return set && set[0]
}

Negotiator.prototype.encodings = function encodings (available) {
  var preferredEncodings = loadModule('encoding').preferredEncodings
  return preferredEncodings(this.request.headers['accept-encoding'], available)
}

Negotiator.prototype.language = function language (available) {
  var set = this.languages(available)
  return set && set[0]
}

Negotiator.prototype.languages = function languages (available) {
  var preferredLanguages = loadModule('language').preferredLanguages
  return preferredLanguages(this.request.headers['accept-language'], available)
}

Negotiator.prototype.mediaType = function mediaType (available) {
  var set = this.mediaTypes(available)
  return set && set[0]
}

Negotiator.prototype.mediaTypes = function mediaTypes (available) {
  var preferredMediaTypes = loadModule('mediaType').preferredMediaTypes
  return preferredMediaTypes(this.request.headers.accept, available)
}

// Backwards compatibility
Negotiator.prototype.preferredCharset = Negotiator.prototype.charset
Negotiator.prototype.preferredCharsets = Negotiator.prototype.charsets
Negotiator.prototype.preferredEncoding = Negotiator.prototype.encoding
Negotiator.prototype.preferredEncodings = Negotiator.prototype.encodings
Negotiator.prototype.preferredLanguage = Negotiator.prototype.language
Negotiator.prototype.preferredLanguages = Negotiator.prototype.languages
Negotiator.prototype.preferredMediaType = Negotiator.prototype.mediaType
Negotiator.prototype.preferredMediaTypes = Negotiator.prototype.mediaTypes

function loadModule (moduleName) {
  let module = modules[moduleName]

  if (module !== undefined) {
    return module
  }

  switch (moduleName) {
    case 'charset':
      module = require('./lib/charset')
      break
    case 'encoding':
      module = require('./lib/encoding')
      break
    case 'language':
      module = require('./lib/language')
      break
    case 'mediaType':
      module = require('./lib/media-type')
      break
    default:
      throw new Error(`无法找到 ${moduleName} 模块`)
  }

  modules[moduleName] = module
  return module
}
