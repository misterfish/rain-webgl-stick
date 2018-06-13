defineBinaryOperator ('|',  (...args) => pipe         (...args))
defineBinaryOperator ('<<', (...args) => compose      (...args))
defineBinaryOperator ('>>', (...args) => composeRight (...args))

import {
  pipe, compose, composeRight,
  factory, factoryProps,
} from 'stick-js'

// --- original code had these properties in the prototype: keeping it.

const proto = {
  x: 0,
  y: 0,
  r: 0,
  spreadX: 0,
  spreadY: 0,
  momentum: 0,
  momentumX: 0,
  lastSpawn: 0,
  nextSpawn: 0,
  parent: void 8,
  isNew: true,
  killed: false,
  shrink: 0,
}

const props = {
}

export default proto | factory | factoryProps (props)
