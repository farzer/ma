function each (obj, func, context) {
  let result
  context || (context = null)
  for (const x in obj) {
    if (obj.hasOwnProperty(x)) {
      result = func.call(context, obj[x], x, obj)
      if (result !== undefined) {
        return result
      }
    }
  }
  return result
}

/**
 * 继承多个对象
 * @param {object} to 要继承多个对象的目标
 * @returns {object}
 */
function extend (to) {
  const from = Array.prototype.slice.call(arguments, 1)
  const func = (value, prop) => to[prop] = value
  for (let x = 0; x < from.length; x++) {
    each(from[x], func)
  }
  return to
}

/**
 * 继承
 * @param {function} Parent 要继承的父类
 * @param {object} protoProps 要继承的原型属性
 * @param {object} staticProps 要继承的静态方法和静态属性
 */
function index (Parent, protoProps = {}, staticProps = {}) {
  let Child
  if (protoProps.hasOwnProperty('constructor') && typeof protoProps.constructor === 'function') {
    Child = protoProps.constructor
  } else {
    Child = function () {
      Parent.apply(this, arguments)
    }
  }

  // 继承静态方法或者静态属性
  extend(Child, Parent, staticProps)

  // 避免实例子类的时候调用两次父类方法
  // 间接让子类的原型访问父类的原型
  function Surrogate () {}
  Surrogate.prototype = Parent.prototype
  Child.prototype = new Surrogate()

  // 继承原型
  extend(Child.prototype, protoProps)

  // 当实例化的时候，实例对象会自动添加constructor等属性和方法
  Child.prototype.constructor = Child

  return Child
}

module.exports = index
