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
  applyTo1, passToN,
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
const logWith = (header) => (...args) => log (... [header, ...args])

import 'core-js'
import RainRenderer from "./rain-renderer"
import Raindrops from "./raindrops"
import loadImages from "./image-loader"
import createCanvas from "./create-canvas"
import {random} from './random'

import config from './config'

const create = dot1 ('create')
const init   = side ('init')

const { canvasSelector, textureSize, defaultWeather, weatherData, } = config

const then    = dot1 ('then')
const recover = dot1 ('catch')
const startP  = _ => Promise.resolve ()

const go = () => startP ()
  | then (loadTextures)
  | then (([textureImgFg, textureImgBg, dropColor, dropAlpha]) => start ({
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

const start = (args) => new Promise ((res, rej) =>
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

  const raindrops = Raindrops
    | create ({
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

const weather = (fg, bg) => (data) => Object.assign (
  {},
  defaultWeather,
  data,
  { fg, bg },
)

const updateWeather = (currentSlide, fg, bg, raindrops) => {
  const data = weatherData [currentSlide] | weather (fg, bg)

  raindrops.options | mergeM (data)
  raindrops.clearDrops ()
}

const generateTexture = ([ctx, img, { width, height }, alpha]) => ctx
 | assocM ('globalAlpha', alpha)
 | side5 ('drawImage', img, 0, 0, width, height)

go ()
