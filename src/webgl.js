defineBinaryOperator ('|',  (...args) => pipe         (...args))
defineBinaryOperator ('<<', (...args) => compose      (...args))
defineBinaryOperator ('>>', (...args) => composeRight (...args))

import {
  pipe, compose, composeRight,
    ok, ifOk, ifTrue, ifFalse, ifYes, ifNo, ifPredicate, ifEmpty,
    whenOk, whenTrue, whenFalse, whenYes, whenNo, whenPredicate, whenEmpty,
    dot, dot1, dot2, nieuw, nieuw1, nieuw2,
    guard, otherwise,
    sprintf1, sprintfN, rangeBy,
    noop, doe, blush,
    concatTo, concat, appendTo, append,
    invoke, applyN, pass1,
  lets, letS, compactOk, compact,
    lt, gt, eq, ne, lte, gte,
  factory, factoryInit, factoryProps,
  side, side1, side2, side3, side4, side5, sideN,
  tap,
  assocM,
  divideBy,
  notOk,
  appendToM,
  defaultTo,
  minus, plus,
  whenNotOk,
} from 'stick'

// --- finds truthy and returns the *value*.
const findValue = (f) => (xs) => {
  let v
  for (const i of xs) if (v = f (i)) return v
}

export const getContext = (canvas, options = {}) => {
  const contexts = ['webgl', 'experimental-webgl']
  const getContext = name => canvas.getContext (name, options)

  return contexts
    | findValue (getContext)
    | tap (whenNotOk (() => {
      document.body.classList.add ('no-webgl')
    }))
}

const glCreateProgram = dot ('createProgram')
const attachShader = side2 ('attachShader')
const linkProgram = side1 ('linkProgram')
// const linkProgram = sideN ('linkProgram')
const getProgramParameter = dot2 ('getProgramParameter')
const getShaderParameter = dot2 ('getShaderParameter')
const getProgramInfoLog = dot1 ('getProgramInfoLog')
const getShaderInfoLog = dot1 ('getShaderInfoLog')
const deleteProgram = side1 ('deleteProgram')
const deleteShader = side1 ('deleteShader')
const getAttribLocation = dot2 ('getAttribLocation')
const createBuffer = dot ('createBuffer')
const glCreateShader = dot1 ('createShader')
const bindBuffer = side2 ('bindBuffer')
const bufferData = side3 ('bufferData')
const enableVertexAttribArray = side1 ('enableVertexAttribArray')
const vertexAttribPointer = sideN ('vertexAttribPointer')
const shaderSource = side2 ('shaderSource')
const compileShader = side1 ('compileShader')
const glCreateTexture = dot ('createTexture')
const bindTexture = side2 ('bindTexture')
const texParameteri = side3 ('texParameteri')
const getUniformLocation = dot2 ('getUniformLocation')
const glActiveTexture = side1 ('activeTexture')
const texImage2D = sideN ('texImage2D')

export const createProgram = (gl, vertexScript, fragScript) => {
  const vertexShader = createShader (gl, vertexScript, gl.VERTEX_SHADER)
  const fragShader = createShader (gl, fragScript, gl.FRAGMENT_SHADER)

  const program = gl | glCreateProgram

  const linked = gl | attachShader (program, vertexShader)
                    | attachShader (program, fragShader)
                    | linkProgram (program)
                    | getProgramParameter (program, gl.LINK_STATUS)

  if (!linked) {
      const lastError = gl | getProgramInfoLog (program)
      error ("Error in program linking: " + lastError)
      gl | deleteProgram (program)
      return null
  }

  gl | letS ([
    getAttribLocation (program, "a_position"),
    getAttribLocation (program, "a_texCoord"),
    createBuffer,
    (gl, positionLocation, texCoordLocation, texCoordBuffer) => gl
      | bindBuffer (gl.ARRAY_BUFFER, texCoordBuffer)
      | bufferData (gl.ARRAY_BUFFER, new Float32Array ([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]), gl.STATIC_DRAW)
      | enableVertexAttribArray (texCoordLocation)
      | vertexAttribPointer ([texCoordLocation, 2, gl.FLOAT, false, 0, 0])
      | makeRectangleCornersBuffer (positionLocation)
  ])

  return program
}

const makeRectangleCornersBuffer = (positionLocation) => (gl) => gl
  | bindBuffer (gl.ARRAY_BUFFER, gl | createBuffer)
  | enableVertexAttribArray (positionLocation)
  | vertexAttribPointer ([positionLocation, 2, gl.FLOAT, false, 0, 0])

export const createShader = (gl, script, type) => {
  const shader = gl | glCreateShader (type)

  gl | shaderSource (shader, script)
     | compileShader (shader)

  return gl | getShaderParameter (shader, gl.COMPILE_STATUS) | ifOk (
    _ => shader,
    () => {
      const lastError = gl | getShaderInfoLog (shader)
      error ("Error compiling shader '" + shader + "':" + lastError)
      gl | deleteShader (shader)
      return null
    }
  )
}

export const createTexture = (gl, source, i) => {
  const texture = gl | glCreateTexture
  activeTexture (gl, i)

  gl | bindTexture (gl.TEXTURE_2D, texture)
     // --- set the parameters so we can render any size image.
     | texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
     | texParameteri (gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
     | texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
     | texParameteri (gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  if (source != null) updateTexture (gl, source)
  return texture
}

export const createUniform = (gl, program, type, name, ...args) => {
  const location = gl | getUniformLocation (program, 'u_'+name)
  gl ['uniform'+type] (location, ...args)
}

export const activeTexture = (gl, i) => gl | glActiveTexture (gl ['TEXTURE'+i])

export const updateTexture = (gl, source) => gl
  | texImage2D ([gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source])

export const setRectangle = (gl, x, y, width, height) => lets (
  _ => x,
  (x1) => x1 + width,
  (_, _2) => y,
  (_, _2, y1) => y1 + height,
  (x1, x2, y1, y2) => gl | bufferData (
    gl.ARRAY_BUFFER,
    new Float32Array ([
      x1, y1,
      x2, y1,
      x1, y2,
      x1, y2,
      x2, y1,
      x2, y2
    ]),
    gl.STATIC_DRAW,
  )
)

const error = msg => console.error (msg)
