/**
 * @see https://github.com/jshttp/methods/blob/master/index.js
 */

const http = require('http')

module.exports = getCurrentNodeMethods() || getBasicNodeMethods()

function getCurrentNodeMethods () {
  return http.METHODS && http.METHODS.map((method) => method.toLowerCase())
}

function getBasicNodeMethods () {
  return [
    'get',
    'post',
    'put',
    'head',
    'delete',
    'options',
    'trace',
    'copy',
    'lock',
    'mkcol',
    'move',
    'purge',
    'propfind',
    'proppatch',
    'unlock',
    'report',
    'mkactivity',
    'checkout',
    'merge',
    'm-search',
    'notify',
    'subscribe',
    'unsubscribe',
    'patch',
    'search',
    'connect'
  ]
}
