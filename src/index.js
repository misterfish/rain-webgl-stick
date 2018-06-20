const LEGACY = false

defineBinaryOperator ('|',  (...args) => pipe         (...args))
defineBinaryOperator ('<<', (...args) => compose      (...args))
defineBinaryOperator ('>>', (...args) => composeRight (...args))

import {
  pipe, compose, composeRight,
  ok, ifOk, ifPredicate, whenOk, whenPredicate,
  id, tap, recurry, roll,
  map, filter, reject, reduce, flip, flip3,
  join, split, last, head, tail,
  dot, dot1, dot2, side, side1, side2, side5,
  condS, guard, guardV, otherwise,
  sprintf1, sprintfN, rangeBy,
  noop, blush, always, T, F,
  prop, path, has, hasIn,
  applyTo1, passToN,
  bindPropTo, bindProp, bindTo, bind,
  assoc, assocPath, update, updatePath,
  assocM, assocPathM, updateM, updatePathM,
  concatTo, concat, appendTo, append,
  concatToM, concatM, appendToM, appendM,
  merge, mergeTo, mergeM, mergeToM,
  letS, compactOk, compact,
  lt, gt, eq, ne, lte, gte,
  factory, factoryProps,
  die, raise, decorateException, exception, tryCatch,
  invoke,
} from 'stick-js'

import 'core-js'

import RainRenderer from "./rain-renderer"
import Raindrops from "./raindrops"
import loadImages from "./image-loader"
import createCanvas from "./create-canvas"
import {random} from './random'

import config from './config'

import { allP, axiosGet, } from './util'

const create = dot1 ('create')
const init   = side ('init')
const then    = dot1 ('then')
const recover = dot1 ('catch')
const startP  = _ => Promise.resolve ()
const resolveP = (...args) => Promise.resolve (...args)

const { textureSize, defaultWeather, weatherData, } = config

const loadShadersAndTextures = _ => [loadShaders (), loadTextures ()]
  | allP
  | recover (decorateException ("Can't load shaders and/or textures") >> raise)

export const go = canvas => startP ()
  | then (loadShadersAndTextures)
  | then (([[vertShader, fragShader], [textureImgFg, textureImgBg, dropColor, dropAlpha]]) => start ({
    vertShader,
    fragShader,

    textureImgFg,
    textureImgBg,
    dropColor,
    dropAlpha,

    canvas,
  }))
  | recover (decorateException ('Quitting:') >> raise)

const images = {
  dropAlpha: require ('images/rain/drop-alpha.png'),
  dropColor: require ('images/rain/drop-color.png'),
  textureFg: require ('images/rain/fritz-60s.png'),
  textureBg: require ('images/rain/fritz-60s.png'),
}

const vertShaderLoc = require ('./shaders/simple.vert.shader')
const fragShaderLoc = require ('./shaders/water.frag.shader')

const loadShadersLegacy = _ => {
  const requireShaderScript = require ('glslify')

  const vertShader = requireShaderScript ('./shaders/simple.vert.shader')
  const fragShader = requireShaderScript ('./shaders/water.frag.shader')

  return startP ()
  | then ([vertShader, fragShader] | always)
}

const loadShadersWebpack = _ => [vertShaderLoc, fragShaderLoc]
  | map (axiosGet)
  | allP
  | then (map (prop ('data')))
  | recover (decorateException ('Error loading shaders:') >> raise)

const loadShaders = LEGACY ? loadShadersLegacy : loadShadersWebpack

const loadTextures = _ => {
  return loadImages ([
    { name:"dropAlpha", src: images.dropAlpha },
    { name:"dropColor", src: images.dropColor },
    // --- 'fg' is the image which will be reflected in the droplets.
    { name:"textureFg", src: images.textureFg },
    { name:"textureBg", src: images.textureBg },
  ])
  | then (({ textureFg, textureBg, dropColor, dropAlpha, }) => [
    textureFg.img, textureBg.img, dropColor.img, dropAlpha.img,
  ])
  | recover (decorateException ('Error loading texture images:') >> raise)
}

const setWidthAndHeight = id | always
const legacySetWidthAndHeight = dpi => mergeM ({
      width: window.innerWidth * dpi,
      height: window.innerHeight * dpi,
  })
  >> tap (prop ('style') >> mergeM ({
      width: window.innerWidth + "px",
      height: window.innerHeight + "px",
  }))

const start = (...args) => resolveP (...args)
  | then (_start)
  | recover (decorateException ('Error on init:') >> raise)

// --- xxx: width & height
const _start = ({ vertShader, fragShader, textureImgFg, textureImgBg, dropColor, dropAlpha, canvas: _canvas, }) => {
  const dpi = window.devicePixelRatio

  const canvas = _canvas | setWidthAndHeight (dpi)
  const rect = _canvas.getBoundingClientRect ()
  const raindrops = Raindrops
    | create ({
        dropAlpha,
        dropColor,
        width: rect.width,
        height: rect.height,
        scale: dpi,
        options: {
          trailRate: 1,
          trailScaleRange: [0.2, 0.45],
          collisionRadius: 0.45,
          dropletsCleaningRadiusMultiplier: 0.28,
        },
    })
    | init

  const getTexInfo = (() => {
    const get = letS ([
      ({ width, height, }) => createCanvas (width, height),
      (_, texture)         => texture.getContext ('2d'),
      (_, texture, ctx)    => [texture, ctx],
    ])

    return prop >> applyTo1 (textureSize) >> get
  }) ()

  const [textureFg, textureFgCtx] = getTexInfo ('fg')
  const [textureBg, textureBgCtx] = getTexInfo ('bg')

  ; [
    [textureFgCtx, textureImgFg, textureSize ['fg'], 1],
    [textureBgCtx, textureImgBg, textureSize ['bg'], 1],
  ] | map (generateTexture)

  RainRenderer
    | create ({
      canvas,
      vertShader,
      fragShader,
      imageFg: textureFg,
      imageBg: textureBg,
      canvasLiquid: raindrops.canvas,
      optionsArg: {
        brightness:1.04,
        alphaMultiply:6,
        alphaSubtract:3,
        // minRefraction:256,
        // maxRefraction:512
      }
    })
    | init

  updateWeather ('rain', textureImgFg, textureImgBg, raindrops)
}

const weather = (fg, bg) => (data) => defaultWeather
  | merge (data)
  | mergeM ({ fg, bg, })

const updateWeather = (currentSlide, fg, bg, raindrops) => {
  const data = weatherData [currentSlide] | weather (fg, bg)

  raindrops.options | mergeM (data)
  raindrops.clearDrops ()
}

const generateTexture = ([ctx, img, { width, height }, alpha]) => ctx
 | assocM ('globalAlpha', alpha)
 | side5 ('drawImage', img, 0, 0, width, height)

export default {
    go,
}
