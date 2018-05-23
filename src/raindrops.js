defineBinaryOperator ('|',  (...args) => pipe         (...args))
defineBinaryOperator ('<<', (...args) => compose      (...args))
defineBinaryOperator ('>>', (...args) => composeRight (...args))

window.CREATEDROP = 0
window.UPDATERAIN = 0

import ramda, {
  curry, clamp,
} from 'ramda'

import {
  pipe, compose, composeRight,
  tap,
  each, addIndex,
    ok, ifOk, ifTrue, ifFalse, ifYes, ifNo, ifPredicate, ifEmpty,
    whenOk, whenTrue, whenFalse, whenYes, whenNo, whenPredicate, whenEmpty,
  // dot, dot1, dot2,
    nieuw, nieuw1, nieuw2,
    guard, otherwise,
    sprintf1, sprintfN, rangeBy,
    noop, doe, blush,
    concatTo, concat, appendTo, append,
    invoke, applyN, pass1,
    compactOk, compact,
    lt, gt, eq, ne, lte, gte,
  factory, factoryInit, factoryProps,
  mergeM,
  // side, side1, side2, side3, side4, side5,
  timesF,
  // xxx
  // assocM,
  // divideBy,
  notOk,
  appendToM,
  defaultTo,
  minus, plus,
  die,
  lets,
} from 'stick'

const min = a => b => Math.min (a, b)
const max = a => b => Math.max (a, b)

import memoize from 'memoize-immutable'

import loadImages from "./image-loader"
import times from "./times.js"
import createCanvas from "./create-canvas.js"
import {random, chance} from "./random"

import Drop from './drop'
import config from './config'

export const divideBy = m => n => n / m
export const multiply = x => y => x * y
export const dot  = prop => o => o [prop] ()
export const dot1 = prop => val1 => o => o [prop] (val1)
export const dot2 = prop => val1 => val2 => o => o [prop] (val1, val2)
export const dot3 = prop => val1 => val2 => val3 => o => o [prop] (val1, val2, val3)
export const dot4 = prop => val1 => val2 => val3 => val4 => o => o [prop] (val1, val2, val3, val4)
export const dot5 = prop => val1 => val2 => val3 => val4 => val5 => o => o [prop] (val1, val2, val3, val4, val5)

export const side  = prop => o => (o [prop] (), o)
export const side1 = prop => val1 => o => (o [prop] (val1), o)
export const side2 = prop => val1 => val2 => o => (o [prop] (val1, val2), o)
export const side3 = prop => val1 => val2 => val3 => o => (o [prop] (val1, val2, val3), o)
export const side4 = prop => val1 => val2 => val3 => val4 => o => (o [prop] (val1, val2, val3, val4), o)
export const side5 = prop => val1 => val2 => val3 => val4 => val5 => o => (o [prop] (val1, val2, val3, val4, val5), o)

const { log, } = console
const logWith = header => (...args) => log (... [header, ...args])

const dropSize = 64

const { defaultRaindrops, } = config

const toThe = m => n => Math.pow (n, m)
const square = toThe (2)
const cube   = toThe (3)

const makeRainDrop = (r, width, height, scale, spawnArea, minR) => ({
  r,
  spreadX: 1.5,
  spreadY: 1.5,
  x: random (width/scale),
  y: random ((height/scale)*spawnArea[0], (height/scale)*spawnArea[1]),
  momentum: 1 + ((r-minR)*0.1) + random (2),
})

const slowDropMomentum = (timeScale, minR, drop) => {
  const { momentum, momentumX, } = drop
  const f = ((minR*0.5)-momentum) | max (1)
  drop.momentum = (momentum - f*0.1*timeScale) | max (0)
  drop.momentumX *= 0.7 | toThe (timeScale)
}

const pi = Math.PI
const sqrt = Math.sqrt

const slice = dot2 ('slice')

const eachX = each | addIndex
const defaultToA = blush >> defaultTo
const updateM = curry ((prop, f, o) => (o [prop] = o [prop] | f, o))

const beginPath = side ('beginPath')
const arc = side5 ('arc')
const fill = side ('fill')

// e.g., const aFunc = side3 ('aFunc') | successive
// then, aFunc (a, b, c) translates to side3 ('aFunc') (a) (b) (c)
const successive = (f) => (...args) => {
  let g = f
  for (const i of args) g = g (i)
  return g
}

const drawImage = side5 ('drawImage') | successive
const getContext2d = dot1 ('getContext') ('2d')

const assocMCapped = prop => val => o => (o[prop] = val, o)
const assocM = assocMCapped

const clearDroplets = getContext2d
  >> assocM ('fillStyle') ('#000')
  >> beginPath
  >> arc (64) (64) (64) (0) (pi * 2)
  >> fill

const _radiusFactor = (r, minR, deltaR) => (r - minR) / deltaR * 0.9
const radiusFactor = memoize (_radiusFactor >> clamp (0, 1))

const spreadFactor = memoize ((spreadX, spreadY) =>
  1 + ((spreadX + spreadY) * 0.5)
)

const shouldCleanSmallDrops = (r, autoShrink, minR, timeScale) =>
  autoShrink && r <= minR && chance (0.05 * timeScale)

const updateGravity = ({ drop, r, minR, maxR, dropFallMultiplier, deltaR, timeScale}) => {
    drop.momentum += chanceCreepDown (
      r, minR, dropFallMultiplier, deltaR, timeScale
    ) ? random ((r / maxR) * 4)
      : 0
}

const chanceCreepDown = (r, minR, dropFallMultiplier, deltaR, timeScale) =>
  chance ((r - (minR * dropFallMultiplier)) * 0.1 / deltaR * timeScale)

const normalizeSpread = (timeScale, drop) => drop
  | updateM ('spreadX') (0.4 | toThe (timeScale) | multiply)
  | updateM ('spreadY') (0.7 | toThe (timeScale) | multiply)

const checkCollision = (moved, { isNew, killed }) => (moved || isNew) && !killed

const updateShrinkage = (r1, shrink, killedOrig, timeScale) => lets (
  _ => r1 - shrink * timeScale,
  (r) => r <= 0,
  (r, killed) => [r, killed || killedOrig],
)

const props = {
  width: 0,
  height: 0,
  scale: 0,
  dropAlpha: void 8,
  dropColor: void 8,
  canvas: void 8,
  ctx: void 8,
  dropletsPixelDensity: 1,
  droplets: void 8,
  dropletsCtx: void 8,
  dropletsCounter: 0,
  drops: [],
  dropsGfx: [],
  clearDropletsGfx: void 8,
  textureCleaningIterations: 0,
  lastRender: void 8,
  options: void 8,
  optionsArg: void 8,
}

const proto = {
  init () {
    const { optionsArg, width, height, dropletsPixelDensity, } = this
    this.options = Object.assign ({}, defaultRaindrops, optionsArg)
    const canvas = createCanvas (width, height)
    const droplets = createCanvas (width * dropletsPixelDensity, height * dropletsPixelDensity)
    return this | mergeM ({
      canvas,
      droplets,
      ctx: canvas.getContext ('2d'),
      dropletsCtx: droplets.getContext ('2d'),
    })
    | side ('renderDropsGfx')
    | side ('update')
  },

  get deltaR(){
    return this.options.maxR-this.options.minR;
  },
  get area(){
    return (this.width*this.height)/this.scale;
  },
  get areaMultiplier(){
    return Math.sqrt(this.area/(1024*768));
  },

  drawDroplet (x, y, r) {
    const { dropletsPixelDensity, dropletsCtx, } = this
    return this.drawDrop (
      dropletsCtx,
      Drop.create ({
        x: x*dropletsPixelDensity,
        y: y*dropletsPixelDensity,
        r: r*dropletsPixelDensity,
      }),
    )
  },

  renderDrop (dropBuffer, dropBufferCtx, i) {
    const drop = createCanvas (dropSize, dropSize)
    const dropCtx = drop.getContext ('2d')

    dropBufferCtx.clearRect (0, 0, dropSize, dropSize)

    dropBufferCtx.globalCompositeOperation = "source-over"
    dropBufferCtx.drawImage (this.dropColor, 0, 0, dropSize, dropSize)

    // --- blue overlay,  for depth
    dropBufferCtx.globalCompositeOperation = "screen"
    dropBufferCtx.fillStyle = "rgba (0, 0, "+i+", 1)"
    dropBufferCtx.fillRect (0, 0, dropSize, dropSize)

    // --- alpha
    dropCtx.globalCompositeOperation = "source-over"
    dropCtx.drawImage (this.dropAlpha, 0, 0, dropSize, dropSize)

    dropCtx.globalCompositeOperation = "source-in"
    dropCtx.drawImage (dropBuffer, 0, 0, dropSize, dropSize)
    return drop
  },

  renderDropsGfx () {
    const dropBuffer = createCanvas (dropSize,  dropSize)
    const dropBufferCtx = dropBuffer.getContext ('2d')
    const renderDrop = i => this.renderDrop (dropBuffer, dropBufferCtx, i)
    this.dropsGfx = renderDrop | timesF (255)

    // --- create circle that will be used as a brush to remove droplets
    this.clearDropletsGfx = createCanvas (128, 128)
    | tap (clearDroplets)
  },

  drawDrop (ctx, drop) {
    if (this.dropsGfx.length === 0) return

    const x=drop.x
    const y=drop.y
    const r=drop.r
    const spreadX=drop.spreadX
    const spreadY=drop.spreadY

    const scaleX=1
    const scaleY=1.5

    const { options, deltaR, dropsGfx, scale, } = this
    const { minR, } = options

    let d

    // --- this uses way more cpu than the original formula (below)
    if (false) d = 1
      | multiply (radiusFactor (r, minR, deltaR))
      | divideBy (spreadFactor (drop.spreadX, drop.spreadY))
      | multiply (dropsGfx.length - 1)
      | Math.floor

    // --- original calculation of d
    d=Math.max(0,Math.min(1,((r-this.options.minR)/(this.deltaR))*0.9));
    d*=1/(((drop.spreadX+drop.spreadY)*0.5)+1);
    d=Math.floor(d*(this.dropsGfx.length-1));

    ctx | assocM ('globalAlpha') (1)
        | assocM ('globalCompositeOperation') ('source-over')
        | drawImage (
          dropsGfx [d],
          (x-(r*scaleX*(spreadX+1)))*scale,
          (y-(r*scaleY*(spreadY+1)))*scale,
          (r*2*scaleX*(spreadX+1))*scale,
          (r*2*scaleY*(spreadY+1))*scale,
        )

  },

  clearDroplets (x, y, r = 30) {
    const { dropletsCtx: ctx, clearDropletsGfx, dropletsPixelDensity, scale, } = this
    ctx | assocM ('globalCompositeOperation') ('destination-out')
        | drawImage (
          clearDropletsGfx,
          (x-r)*dropletsPixelDensity*scale,
          (y-r)*dropletsPixelDensity*scale,
          (r*2)*dropletsPixelDensity*scale,
          (r*2)*dropletsPixelDensity*scale*1.5,
        )
  },

  clearCanvas () {
    this.ctx.clearRect (0, 0, this.width, this.height)
  },

  haveMaxDrops () {
    const { drops: { length }, options: { maxDrops }, areaMultiplier, } = this
    return length >= maxDrops * areaMultiplier
  },

  createDrop (options) {
    if (! (++window.CREATEDROP % 1000))
      console.log ('createDrop() has been called', window.CREATEDROP, 'times')
    if (this.haveMaxDrops ()) return
    return Drop.create (options)
  },

  // --- not used
  addDrop (drop) {
  },

  updateRain (timeScale) {
    const { options, areaMultiplier, height, width, scale, } = this
    const { raining, rainLimit, rainChance, minR, maxR, spawnArea, } = options
    if (!raining) return []
    const rainDrops = []
    const limit = rainLimit*timeScale*areaMultiplier

    let count = 0
    while (chance (rainChance*timeScale*areaMultiplier) && count<limit) {
      count++
      lets (
        _ => random (minR, maxR, cube),
        (r) => makeRainDrop (
          r, width, height, scale, spawnArea, minR
        ),
        (_, dropper) => this.createDrop (dropper),
        (_, _2, drop) => drop | whenOk (appendToM (rainDrops)),
      )
    }
    return rainDrops
  },

  clearDrops () {
    this.drops | each ((drop) => setTimeout (
      () => drop.shrink = 0.1 + (0.5 | random),
      1200 | random,
    ))
    this.clearTexture()
  },

  clearTexture () {
    this.textureCleaningIterations = 50
  },

  textureCleaning (timeScale) {
    const { textureCleaningIterations, dropletsCtx, width, height, dropletsPixelDensity, } = this
    this | updateM ('textureCleaningIterations') (minus (timeScale))

    dropletsCtx
      | assocM ('globalCompositeOperation') ('destination-out')
      | assocM ('fillStyle') ((.05 * timeScale) | sprintf1 ("rgba(0,0,0,%s)"))
      | side4 ('fillRect') (
        0, 0,
        width*dropletsPixelDensity,
        height*dropletsPixelDensity,
      )
  },

  drawDroplets (timeScale) {
    const { dropletsCounter: ctr, options, areaMultiplier, width, height, scale, } = this
    const { dropletsRate, dropletsSize, } = options
    const iters = ctr
      | plus (dropletsRate * timeScale * areaMultiplier)
      | Math.floor

    // @ref
    //this.drawRandomDroplet (height, width, scale, dropletsSize)
    //| sTimesV (iters)

    let i = iters
    while (i--) this.drawDroplet (
        random (width/scale),
        random (height/scale),
        random (...dropletsSize, square),
    )

    this.dropletsCounter = 0
  },

  updateDroplets (timeScale) {
    const { ctx, droplets, width, height, textureCleaningIterations, options, } = this
    const { raining, } = options

    if (textureCleaningIterations > 0) this.textureCleaning (timeScale)
    if (raining) this.drawDroplets (timeScale)

    // xxx
    ctx.drawImage (droplets, 0, 0, width, height)
  },

  sortDrops () {
    this.drops.sort ((a, b) => {
      const va = (a.y*(this.width/this.scale)) + a.x
      const vb = (b.y*(this.width/this.scale)) + b.x
      return va - vb
    })
  },

  updateTrails (timeScale, newDrops, drop) {
    const { options, } = this
    const { minR, maxR, trailRate, trailScaleRange, } = options
    const { momentum, nextSpawn, x, y, r, } = drop

    drop.lastSpawn += momentum * timeScale * trailRate
    if (drop.lastSpawn <= nextSpawn) return

    const trailDrop = this.createDrop ({
      x: x+(random(-r, r)*0.1),
      y: y-(r*0.01),
      r: r*random(...trailScaleRange),
      spreadY: drop.momentum*0.1,
      parent: drop,
    })

    if (trailDrop | notOk) return

    newDrops.push (trailDrop)

    drop.r *= 0.97 | toThe (timeScale)
    drop.lastSpawn = 0
    drop.nextSpawn = random (minR, maxR) - (momentum*2*trailRate) + (maxR-drop.r)
  },

  updatePosition (drop) {
    const { options, height, scale, } = this
    const { globalTimeScale, } = options
    const { momentum, momentumX, killed, r, } = drop
    const moved = momentum > 0

    if (!moved || killed) return moved

    drop.y += momentum * globalTimeScale
    drop.x += momentumX * globalTimeScale

    if (drop.y > (height / scale) + r) drop.killed = true

    return moved
  },

  doCollisions (drop, i, timeScale) {
    const { drops, } = this
    drops | slice (i+1) (i+70)
          | each (drop2 => this.doCollision (drop, i, drop2, timeScale))
  },

  doCollision (drop, i, drop2, timeScale) {
    const { options, drops, } = this
    const {
      collisionRadius, collisionRadiusIncrease,
      collisionBoostMultiplier, collisionBoost,
      maxR,
    } = options

    // --- basic check.
    if (
      drop == drop2 || drop.r <= drop2.r || drop.parent == drop2 ||
      drop2.parent == drop || drop2.killed
    ) return

    const dx = drop2.x-drop.x
    const dy = drop2.y-drop.y
    const d = ((dx*dx)+(dy*dy)) | sqrt

    const acceptableDistance = (drop.r+drop2.r) *
      (collisionRadius + (drop.momentum*collisionRadiusIncrease*timeScale))

    if (d >= acceptableDistance) return

    const r1 = drop.r
    const r2 = drop2.r
    const a1 = pi*(r1*r1)
    const a2 = pi*(r2*r2)
    const targetR = ((a1+(a2*0.8))/pi)
      | sqrt
      // --- original contained a bug, skipping
      // | min (maxR)

    drop.r = targetR
    drop.momentumX += dx*0.1
    drop.spreadX = 0
    drop.spreadY = 0
    drop2.killed = true
    drop.momentum = (drop.momentum+(targetR*collisionBoostMultiplier)+collisionBoost)
      | min (40)
      | max (drop2.momentum)
  },

  updateDrop (timeScale, newDrops, i, drop) {
    const { r, } = drop
    const { options, deltaR, ctx, } = this
    const {
      minR, maxR, dropFallMultiplier,
      autoShrink, raining, trailRate,
      trailScaleRange, globalTimeScale, height, scale,
      collisionRadius, collisionRadiusIncrease,
      collisionBoostMultiplier, collisionBoost,
      dropletsRate, dropletsCleaningRadiusMultiplier,
    } = options

    // --- changes .momentum
    updateGravity ({ drop, r, minR, maxR, dropFallMultiplier, deltaR, timeScale, })

    drop.shrink += shouldCleanSmallDrops (r, autoShrink, minR, timeScale)
      ? 0.01
      : 0

    ; [drop.r, drop.killed] = updateShrinkage (drop.r, drop.shrink, drop.killed, timeScale)

    // --- changes .r, .lastSpawn, .nextSpawn
    if (raining) this.updateTrails (timeScale, newDrops, drop)

    // --- might use more cpu, old way below.
    // normalizeSpread (timeScale, drop)

    drop.spreadX *= Math.pow (0.4, timeScale)
    drop.spreadY *= Math.pow (0.7, timeScale)
    const moved = this.updatePosition (drop)

    if (checkCollision (moved, drop)) this.doCollisions (drop, i, timeScale)

    drop.isNew = false

    slowDropMomentum (timeScale, minR, drop)

    if (drop.killed) return

    newDrops.push (drop)
    if (moved && dropletsRate>0) this.clearDroplets (
      drop.x, drop.y, drop.r*dropletsCleaningRadiusMultiplier
    )

    this.drawDrop (ctx, drop)
  },

  updateDrops (timeScale) {
    this.sortDrops ()
    this.updateDroplets (timeScale)

    const rainDrops = this.updateRain (timeScale)
    const newDrops = rainDrops

    // --- looks suspiciously like a map :D
    this.drops | eachX ((drop, i) => {
      if (drop.killed) return
      this.updateDrop (timeScale, newDrops, i, drop)
    })

    this.drops = newDrops;
  },
  update(){
    this.clearCanvas();

    let now=Date.now();
    if(this.lastRender==null) this.lastRender=now;
    let deltaT=now-this.lastRender;
    let timeScale=deltaT/((1/60)*1000);
    if(timeScale>1.1) timeScale=1.1;
    timeScale*=this.options.globalTimeScale;
    this.lastRender=now;

    this.updateDrops(timeScale);

    requestAnimationFrame(this.update.bind(this));
  }
}

export default proto | factory | factoryProps (props)
