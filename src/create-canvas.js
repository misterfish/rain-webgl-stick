defineBinaryOperator ('|',  (...args) => pipe         (...args))
defineBinaryOperator ('<<', (...args) => compose      (...args))
defineBinaryOperator ('>>', (...args) => composeRight (...args))

import {
  pipe, compose, composeRight,
    mergeM,
} from 'stick'

export default (width,height) =>
    document.createElement("canvas")
    | mergeM ({ width, height, })
