'use strict'

/**
 * Convert these text files to JSON for browser usage.
 */

const getBody = require('raw-body')
const https = require('https')
const writedb = require('./lib/write-db')

/**
 * Mime types and associated extensions are stored in the form:
 *
 *   <type> <ext> <ext> <ext>;
 */
const TYPE_LINE_REGEXP = /^\s*([\w-]+\/[\w+.-]+)((?:\s+[\w-]+)*);\s*$/gm

/**
 * URL for the mime.types file in the NGINX project source.
 *
 * This uses the Github.com mirror of the Mercurial repository
 * as the Mercurial web interface requires cookies.
 */
const URL = 'https://raw.githubusercontent.com/nginx/nginx/master/conf/mime.types'

get(URL, function onResponse (err, body) {
  if (err) throw err

  const json = {}
  let match = null

  TYPE_LINE_REGEXP.index = 0

  while ((match = TYPE_LINE_REGEXP.exec(body))) {
    const mime = match[1]

    // parse the extensions
    const extensions = (match[2] || '')
      .split(/\s+/)
      .filter(Boolean)
    const data = json[mime] || (json[mime] = {})

    // append the extensions
    appendExtensions(data, extensions)
  }

  writedb('src/nginx-types.json', json)
})

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
  if (extensions.length === 0) {
    return
  }

  for (let i = 0; i < extensions.length; i++) {
    const extension = extensions[i]

    // add extension to the type entry
    appendExtension(obj, extension)
  }
}

/**
 * Get HTTPS resource.
 */
function get (url, callback) {
  https.get(url, function onResponse (res) {
    if (res.statusCode !== 200) {
      callback(new Error('got status code ' + res.statusCode + ' from ' + URL))
    } else {
      getBody(res, true, callback)
    }
  })
}
