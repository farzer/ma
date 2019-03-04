
const db = {}

// initialize with all the IANA types
addData(db, require('../json/iana-types.json'), 'iana')

// add the mime extensions from Apache
addData(db, require('../json/apache-types.json'), 'apache')

// add the mime extensions from nginx
addData(db, require('../json/nginx-types.json'), 'nginx')

// now add all our custom data
addData(db, require('../json/custom-types.json'))

// finally, all custom suffix defaults
const mime = require('../json/custom-suffix.json')
Object.keys(mime).forEach(function (suffix) {
  const s = mime[suffix]

  Object.keys(db).forEach(function (type) {
    if (type.substr(0 - suffix.length) !== suffix) {
      return
    }

    const d = db[type]
    if (d.compressible === undefined) d.compressible = s.compressible
  })
})

// write db
require('./lib/write-db')('db.json', db)

/**
 * Add mime data to the db, marked as a given source.
 */
function addData (db, mime, source) {
  Object.keys(mime).forEach(function (key) {
    const data = mime[key]
    const type = key.toLowerCase()
    const obj = db[type] = db[type] || createTypeEntry(source)

    // add missing data
    setValue(obj, 'charset', data.charset)
    setValue(obj, 'compressible', data.compressible)

    // append new extensions
    appendExtensions(obj, data.extensions)
  })
}

/**
 * Append an extension to an object.
 */
function appendExtension (obj, extension) {
  if (!obj.extensions) {
    obj.extensions = []
  }

  if (obj.extensions.indexOf(extension) === -1) {
    obj.extensions.push(extension)
  }
}

/**
 * Append extensions to an object.
 */
function appendExtensions (obj, extensions) {
  if (!extensions) {
    return
  }

  for (let i = 0; i < extensions.length; i++) {
    const extension = extensions[i]

    // add extension to the type entry
    appendExtension(obj, extension)
  }
}

/**
 * Create a new type entry, optionally marked from a source.
 */
function createTypeEntry (source) {
  const obj = {}

  if (source !== undefined) {
    obj.source = source
  }

  return obj
}

/**
 * Set a value on an object, if not already set.
 */
function setValue (obj, prop, value) {
  if (value !== undefined && obj[prop] === undefined) {
    obj[prop] = value
  }
}
