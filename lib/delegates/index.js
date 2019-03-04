function Delegator (proto, target) {
  if (!(this instanceof Delegator)) {
    return new Delegator(proto, target)
  }
  this.proto = proto
  this.target = target
  this.methods = []
  this.getters = []
  this.setters = []
  this.fluents = []
  return this
}

Delegator.auto = function (proto, targetProto, targetProp) {
  const delegator = Delegator(proto, targetProp)
  const properties = Object.getOwnPropertyNames(targetProto)
  for (let index = 0; index < properties.length; index++) {
    const property = properties[index]
    const descriptor = Object.getOwnPropertyDescriptor(targetProto, property)
    if (descriptor.get) {
      descriptor.getter(property)
    }
    if (descriptor.set) {
      descriptor.setter(property)
    }
    if (descriptor.hasOwnProperty('value')) {
      const value = descriptor.value
      if (value instanceof Function) {
        delegator.method(property)
      } else {
        delegator.getter(property)
      }
      if (descriptor.writable) {
        delegator.setter(property)
      }
    }
  }
}

Delegator.prototype.method = function (name) {
  const proto = this.proto
  const target = this.target
  this.methods.push(name)
  proto[name] = function () {
    return this[target][name].apply(this[target], arguments)
  }
  return this
}

Delegator.prototype.access = function (name) {
  return this.getter(name).setter(name)
}

Delegator.prototype.getter = function (name) {
  const proto = this.proto
  const target = this.target
  this.getters.push(name)
  proto.__defineGetter__(name, function () {
    return this[target][name]
  })
  return this
}

Delegator.prototype.setter = function (name) {
  const proto = this.proto
  const target = this.target
  this.setters.push(name)
  proto.__defineSetter__(name, function (val) {
    this[target][name] = val
    return this[target][name]
  })
  return this
}

Delegator.prototype.fluent = function (name) {
  const proto = this.proto
  const target = this.target

  this.fluents.push(name)
  proto[name] = function (val) {
    if (typeof val !== 'undefined') {
      this[target][name] = val
      return this
    } else {
      return this[target][name]
    }
  }
  return this
}

module.exports = Delegator
