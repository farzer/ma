
const fs = require('fs')

module.exports = function writeDatabaseSync (fileName, obj) {
  const fd = fs.openSync(fileName, 'w')
  const keys = Object.keys(obj).sort()

  fs.writeSync(fd, '{\n')

  keys.forEach(function (key, i, arr) {
    fs.writeSync(fd, '  ' + JSON.stringify(key) + ': {')

    const end = endLine.apply(this, arguments)
    const data = obj[key]
    const keys = Object.keys(data).sort(sortDataKeys)

    if (keys.length === 0) {
      fs.writeSync(fd, '}' + end)
      return
    }

    fs.writeSync(fd, '\n')
    keys.forEach(function (key, i, arr) {
      const end = endLine.apply(this, arguments)
      const val = data[key]

      if (val !== undefined) {
        const str = Array.isArray(val) && val.some(function (v) { return String(v).length > 15 })
          ? JSON.stringify(val, null, 2).split('\n').join('\n    ')
          : JSON.stringify(val)

        fs.writeSync(fd, '    ' + JSON.stringify(key) + ': ' + str + end)
      }
    })

    fs.writeSync(fd, '  }' + end)
  })

  fs.writeSync(fd, '}\n')

  fs.closeSync(fd)
}

function endLine (key, i, arr) {
  const comma = i + 1 === arr.length
    ? ''
    : ','
  return comma + '\n'
}

function sortDataKeys (a, b) {
  const cmp = a.localeCompare(b)

  return a !== 'source' || !cmp
    ? cmp
    : -1
}
