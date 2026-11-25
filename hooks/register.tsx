import { atom, read, update } from 'claude-code'
import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// Colours taken from the fjord photo: clear blue sky, deep fjord water,
// grey granite, moss-green slopes and the hiker's red jacket.
const { theme, problems } = makeColors({
  label: 'Mountain view',
  // Accent is the moss green of the slopes; errors take the jacket red, success a brighter emerald.
  roles: { accent: '#4f7a2e', danger: '#d0261f', success: '#2e8a5a', warning: '#b07a1a', pro: '#1f5fa8' },
  light: {
    gray: {
      anchors: {
        // surface-0 is the page colour, which shows mostly in the side panel: sky blue.
        'surface-0': '#d6eaf9',
        'surface-1': '#ebf2f8',
        'surface-2': '#f4f8fb',
        'surface-3': '#f4f8fb',
        'text-primary': '#0f1f35',
        'text-secondary': '#2c3f58',
        'text-muted': '#4a5a70',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        // A deep evening-sky blue, so light text still reads.
        'surface-0': '#0e2d4c',
        'surface-1': '#10304f',
        'surface-2': '#123352',
        'surface-3': '#143655',
        'text-primary': '#f2f7fc',
        'text-secondary': '#d0dcea',
        'text-muted': '#adbfd3',
      },
    },
  },
})

// True while Claude is working on a task; the scene shows birds then.
const isRunning = atom({ plugin: 'mountain-view', key: 'isRunning' } as const, false)

// One bird: two wing strokes that flap.
const bird = (x: number, y: number, s: number) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path class="wing" d="M-12 0 Q-6 -7 0 0 Q6 -7 12 0" fill="none" stroke="#0f1a28" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g>`

// Big, bold birds so they still read through the frosted glass over the chat.
const FLOCKS = `
<g class="flock f1">${bird(0, 0, 3.2)}${bird(-110, 45, 2.7)}${bird(-200, 95, 2.4)}${bird(90, 55, 2.6)}${bird(170, 110, 2.2)}</g>
<g class="flock f2">${bird(0, 0, 2.4)}${bird(-85, 40, 2)}${bird(75, 35, 2.1)}</g>
<g class="flock f3">${bird(0, 0, 2.8)}${bird(-95, -40, 2.5)}${bird(-170, 10, 2.2)}</g>`

// The light changes with the local time of day.
type Phase = 'dawn' | 'morning' | 'day' | 'sunset' | 'night'

type Light = {
  ray: string // ray colour
  low: number // ray opacity at its dimmest
  high: number // ray opacity at its brightest
  glow: string // halo colour around the sun
  sun: string // sun disc colour
  warm: number // how strongly the sky is tinted orange-pink
}

const LIGHTS: Record<Phase, Light> = {
  dawn: { ray: '#ffb877', low: 0.3, high: 0.45, glow: '#ffc58a', sun: '#ffd9a8', warm: 0.35 },
  morning: { ray: '#fff3cf', low: 0.14, high: 0.24, glow: '#fff4d2', sun: '#fff6de', warm: 0 },
  day: { ray: '#fffbe6', low: 0.5, high: 0.72, glow: '#fff6c2', sun: '#fffdf0', warm: 0 },
  sunset: { ray: '#ff9a55', low: 0.38, high: 0.55, glow: '#ffae6b', sun: '#ffc98f', warm: 0.45 },
  night: { ray: '#c9d6f0', low: 0, high: 0, glow: '#c9d6f0', sun: '#e6ecf7', warm: 0 },
}

// dawn 5-7, soft morning 7-11, bright day 11-18, sunset 18-20, night otherwise.
const phaseAt = (ms: number): Phase => {
  const hour = new Date(ms).getHours()

  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 18) return 'day'
  if (hour >= 18 && hour < 20) return 'sunset'
  return 'night'
}

const phase = atom({ plugin: 'mountain-view', key: 'phase' } as const, 'day' as Phase)

const scene = (withBirds: boolean, light: Light) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
  .dusk { opacity: 0; }
  @media (prefers-color-scheme: dark) { .dusk { opacity: 0.6; } }
  .warm { opacity: ${light.warm}; }
  .rays { opacity: ${light.low}; transform-origin: 110px 100px; animation: shine 14s ease-in-out infinite; }
  @keyframes shine { 0%, 100% { opacity: ${light.low}; transform: rotate(-1.5deg); } 50% { opacity: ${light.high}; transform: rotate(1.5deg); } }
  .flock { opacity: 0.95; }
  .f1 { transform: translate(500px, 220px); animation: fly1 30s linear infinite; animation-delay: -12s; }
  .f2 { transform: translate(900px, 140px); animation: fly2 38s linear infinite; animation-delay: -20s; }
  .f3 { transform: translate(1100px, 330px); animation: fly3 34s linear infinite; animation-delay: -8s; }
  @keyframes fly1 { from { transform: translate(-300px, 240px); } to { transform: translate(1900px, 180px); } }
  @keyframes fly2 { from { transform: translate(-300px, 130px); } to { transform: translate(1900px, 200px); } }
  @keyframes fly3 { from { transform: translate(1900px, 340px); } to { transform: translate(-300px, 280px); } }
  .wing { transform-box: fill-box; transform-origin: center bottom; animation: flap 1.6s ease-in-out infinite; }
  @keyframes flap { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.35); } }
</style>
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3d8fd6"/>
    <stop offset="0.45" stop-color="#6fb1e6"/>
    <stop offset="0.6" stop-color="#a9d2f0"/>
  </linearGradient>
  <linearGradient id="farRock" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8b93a3"/>
    <stop offset="1" stop-color="#6b7486"/>
  </linearGradient>
  <linearGradient id="bigRock" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#5b6372"/>
    <stop offset="0.5" stop-color="#8a909b"/>
    <stop offset="1" stop-color="#6c7380"/>
  </linearGradient>
  <linearGradient id="slope" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6d7f4a"/>
    <stop offset="1" stop-color="#4c6a2e"/>
  </linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a5a93"/>
    <stop offset="1" stop-color="#14305c"/>
  </linearGradient>
  <linearGradient id="stone" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#d9d6cf"/>
    <stop offset="1" stop-color="#8e8b85"/>
  </linearGradient>
</defs>
<rect width="1600" height="1000" fill="url(#sky)"/>
<!-- warm orange-pink sky at dawn and sunset -->
<linearGradient id="warmsky" x1="0" y1="0" x2="0.6" y2="1">
  <stop offset="0" stop-color="#ff9a5a"/>
  <stop offset="0.5" stop-color="#ff7f8f"/>
  <stop offset="1" stop-color="#ffc59a"/>
</linearGradient>
<rect class="warm" width="1600" height="1000" fill="url(#warmsky)"/>
<!-- sun and rays, pinned to the top left corner on any screen -->
<svg x="0" y="0" width="1600" height="1000" viewBox="0 0 1600 1000" preserveAspectRatio="xMinYMin meet" overflow="visible">
  <defs>
    <radialGradient id="sunglow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${light.sun}" stop-opacity="0.95"/>
      <stop offset="0.25" stop-color="${light.glow}" stop-opacity="0.6"/>
      <stop offset="1" stop-color="${light.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ray" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light.ray}" stop-opacity="0.7"/>
      <stop offset="1" stop-color="${light.ray}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g class="rays">
    <path d="M110 100 L1150 380 L1110 470Z" fill="url(#ray)"/>
    <path d="M110 100 L900 700 L820 760Z" fill="url(#ray)"/>
    <path d="M110 100 L560 900 L470 920Z" fill="url(#ray)"/>
    <path d="M110 100 L1250 120 L1240 200Z" fill="url(#ray)" opacity="0.7"/>
    <path d="M110 100 L250 980 L170 980Z" fill="url(#ray)" opacity="0.7"/>
  </g>
  <circle cx="110" cy="100" r="260" fill="url(#sunglow)"/>
  <circle class="sun" cx="110" cy="100" r="58" fill="${light.sun}"/>
</svg>
<!-- far granite peaks with snow -->
<path d="M0 470 L60 380 L120 330 L170 360 L230 400 L290 380 L340 340 L400 390 L470 420 L540 360 L600 330 L660 345 L720 300 L780 340 L840 380 L900 420 L900 620 L0 620Z" fill="url(#farRock)"/>
<path d="M110 336 L120 330 L140 344 L128 352Z M710 306 L720 300 L748 318 L730 324Z M592 334 L600 330 L622 342 L606 346Z" fill="#f2f4f7"/>
<path d="M0 520 L80 470 L160 500 L260 560 L380 600 L0 640Z" fill="#7b8291" opacity="0.8"/>
<!-- the great peak on the right -->
<path d="M820 640 L900 470 L980 380 L1080 250 L1160 110 L1240 90 L1300 140 L1340 260 L1400 230 L1460 190 L1520 210 L1600 300 L1600 700 L820 700Z" fill="url(#bigRock)"/>
<path d="M1160 110 L1240 90 L1268 112 L1230 118 L1196 128Z M1460 190 L1490 196 L1478 210Z" fill="#f2f4f7"/>
<path d="M1300 140 L1340 260 L1280 330 L1220 300 Z" fill="#4d5462" opacity="0.6"/>
<!-- green slopes down to the water -->
<path d="M300 690 L520 640 L760 600 L980 540 L1200 500 L1400 470 L1600 450 L1600 800 L300 800Z" fill="url(#slope)"/>
<path d="M0 640 L200 650 L420 690 L0 700Z" fill="#7a8a55" opacity="0.8"/>
<!-- the fjord -->
<path d="M0 690 L180 688 L320 720 L520 760 L760 790 L1000 810 L1300 815 L1600 812 L1600 1000 L0 1000Z" fill="url(#water)"/>
<path d="M180 688 L320 720 L520 760 L760 790 L1000 810 L1300 815 L1600 812" fill="none" stroke="#d8dccf" stroke-width="2" opacity="0.6"/>
<!-- the rock you sit on, bottom left -->
<path d="M0 1000 L0 900 L60 880 L170 870 L280 890 L330 930 L360 960 L520 990 L600 1000Z" fill="url(#stone)"/>
<path d="M0 960 L120 940 L260 960 L380 1000 L0 1000Z" fill="#7d7a74" opacity="0.7"/>
${withBirds ? FLOCKS : ''}
<rect class="dusk" width="1600" height="1000" fill="#0b1a33"/>
</svg>`


const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'mountain-view', glass: { blur: 6, opacity: 0.55 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await update($, isRunning, () => false)

    // Set the light for now, then check every 5 minutes and redraw only when the phase changes.
    await update($, phase, () => phaseAt(Date.now()))
    $.clock.every(5 * 60 * 1000, async () => {
      const now = phaseAt(await $.clock.now())

      if (now !== (await read($, phase))) {
        await update($, phase, () => now)
        $.ui.invalidate('ui.render')
      }
    })

    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  // Birds take off when Claude starts a task and land when it ends.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, isRunning, () => true)
      $.ui.invalidate('ui.render')
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, isRunning, () => false)
      $.ui.invalidate('ui.render')
    }

    return next(e)
  })

  // If the app refuses or stills the scene, say why instead of failing quietly.
  on('ui.fault', ($, e, next) => {
    $.ui.toast(`Mountain view: ${e.reason}`)

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const busy = await read($, isRunning)
    const now = await read($, phase)

    return (
      <Svg
        source={scene(busy, LIGHTS[now])}
        alt={`A fjord seen from a mountain top in the ${now} light${busy ? ', with birds flying across the sky' : ''}`}
      />
    )
  })
}
