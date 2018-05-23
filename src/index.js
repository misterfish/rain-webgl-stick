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
  cond, condS, guard, guardV, otherwise,
  sprintf1, sprintfN, rangeBy,
  noop, blush, always, T, F,
  prop, path, has, hasIn,
  bindPropTo, bindProp, bindTo, bind,
  assoc, assocPath, update, updatePath,
  assocM, assocPathM, updateM, updatePathM,
  concatTo, concat, appendTo, append,
  concatToM, concatM, appendToM, appendM,
  merge, mergeTo, mergeM, mergeToM,
  laat as lets, letS, compactOk, compact,
  lt, gt, eq, ne, lte, gte,
  factory, factoryProps,
  die, raise, decorateException, exception, tryCatch,
} from 'stick'

const { log } = console
const logWith = header => (...args) => log (... [header, ...args])

import 'core-js'
import RainRenderer from "./rain-renderer"
import Raindrops from "./raindrops"
import loadImages from "./image-loader"
import createCanvas from "./create-canvas"
import {random} from './random'

import config from './config'

const { canvasSelector, defaultWeather, weatherData, } = config

let textureBgSize={
  width:384,
  height:256
}
let textureFgSize={
  width:96,
  height:64
}

let raindrops, renderer

const then = dot1 ('then')
const recover = dot1 ('catch')
const startP = _ => Promise.resolve ()

const go = () => startP ()
  | then (loadTextures)
  | then (([textureImgFg, textureImgBg, dropColor, dropAlpha]) => init ({
    textureImgFg,
    textureImgBg,
    dropColor,
    dropAlpha,

    canvasSelector,
  }))
  | recover (decorateException ('Quitting:') >> raise)

const loadTextures = _ => loadImages ([
    { name:"dropAlpha", src:"img/drop-alpha.png" },
    { name:"dropColor", src:"img/drop-color.png" },
    // --- 'fg' is the image which will be reflected in the droplets.
    { name:"textureFg", src:"img/fritz-60s.png" },
    { name:"textureBg", src:"img/fritz-60s.png" },
  ])
  | then (({ textureFg, textureBg, dropColor, dropAlpha, }) => [
    textureFg.img, textureBg.img, dropColor.img, dropAlpha.img,
  ])
  | recover (decorateException ('Error loading texture images:') >> raise)

const init = (args) => new Promise ((res, rej) =>
  (_ => _init (args))
  | tryCatch (
    res,
    decorateException ('Error on init:') >> rej,
  )
)

const _init = ({ textureImgFg, textureImgBg, dropColor, dropAlpha, canvasSelector, }) => {
  const dpi = window.devicePixelRatio

  const canvas = document.querySelector(canvasSelector)
    | mergeM ({
        width: window.innerWidth * dpi,
        height: window.innerHeight * dpi,
    })
    | tap (prop ('style') >> mergeM ({
        width: window.innerWidth + "px",
        height: window.innerHeight + "px",
      })
    )
  | tap (logWith ('sss'))

  raindrops = Raindrops.create ({
    dropAlpha,
    dropColor,
    width: canvas.width,
    height: canvas.height,
    scale: dpi,
    options: {
      trailRate: 1,
      trailScaleRange: [0.2, 0.45],
      collisionRadius: 0.45,
      dropletsCleaningRadiusMultiplier: 0.28,
    },
  }).init ()

  const textureFg = createCanvas (textureFgSize.width,textureFgSize.height)
  const textureFgCtx = textureFg.getContext ('2d')
  const textureBg = createCanvas (textureBgSize.width,textureBgSize.height)
  const textureBgCtx = textureBg.getContext ('2d')

  ; [
    [textureFgCtx, textureImgFg, textureFgSize, 1],
    [textureBgCtx, textureImgBg, textureBgSize, 1],
  ] | map (generateTexture)

  renderer = RainRenderer.create ({
    canvas,
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
  renderer = renderer.init ()

  setupWeather (textureImgFg, textureImgBg)
}

const setupWeather = (fg, bg) => {
  updateWeather ('rain', fg, bg)
}

const weather = (fg, bg) => (data) => Object.assign (
  {},
  defaultWeather,
  data,
  { fg, bg },
)

const updateWeather = (currentSlide, fg, bg) => {
  const data = weatherData[currentSlide] | weather (fg, bg)

  raindrops.options | mergeM (data)
  raindrops.clearDrops ()
}

const generateTexture = ([ctx, img, { width, height }, alpha]) => ctx
  // --- xxx new versions
 | assocM ('globalAlpha', alpha)
 | side5 ('drawImage') (img, 0, 0, width, height)

go ()
