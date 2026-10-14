import { getState, subscribe } from './store'

/**
 * Procedural sound design on WebAudio. No sample files: everything is synthesized,
 * routed through a compressor and a generated stone-vault reverb.
 */
class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private wet: GainNode | null = null
  private dry: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private charge: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; filter: BiquadFilterNode; crackle: AudioBufferSourceNode; cGain: GainNode } | null = null
  private ambience: { nodes: AudioNode[]; gain: GainNode; stop: () => void } | null = null
  private tensionBed: { osc: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; src: AudioBufferSourceNode; nGain: GainNode } | null = null
  private muted = !getState().settings.sound

  constructor() {
    subscribe(() => {
      const m = !getState().settings.sound
      if (m !== this.muted) {
        this.muted = m
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05)
      }
    })
  }

  /** Must run inside a user gesture the first time. */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      this.ctx = ctx
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -16
      comp.knee.value = 12
      comp.ratio.value = 4
      comp.attack.value = 0.004
      comp.release.value = 0.25
      this.master = ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.9
      this.dry = ctx.createGain()
      this.wet = ctx.createGain()
      this.wet.gain.value = 0.28
      const verb = ctx.createConvolver()
      verb.buffer = this.impulse(2.6, 2.2)
      this.dry.connect(comp)
      this.wet.connect(verb)
      verb.connect(comp)
      comp.connect(this.master)
      this.master.connect(ctx.destination)
      this.noiseBuf = this.makeNoise(2)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running' && !this.muted
  }

  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < len; i++) {
        // Early reflections cluster, then a smooth tail, like a small stone hall.
        const t = i / len
        const early = i < ctx.sampleRate * 0.06 && Math.random() < 0.02 ? 2.5 : 1
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * early
      }
    }
    return buf
  }

  private makeNoise(seconds: number) {
    const ctx = this.ctx!
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  private out(wet = 0.5): AudioNode {
    const ctx = this.ctx!
    const g = ctx.createGain()
    const w = ctx.createGain()
    const dr = ctx.createGain()
    w.gain.value = wet
    dr.gain.value = 1
    g.connect(dr).connect(this.dry!)
    g.connect(w).connect(this.wet!)
    return g
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  private noise(t: number, dur: number, opts: { type?: BiquadFilterType; freq: number; freqEnd?: number; q?: number; gain: number; attack?: number; wet?: number }) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = opts.type ?? 'bandpass'
    f.Q.value = opts.q ?? 1
    f.frequency.setValueAtTime(opts.freq, t)
    if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur)
    const g = ctx.createGain()
    this.env(g, t, opts.gain, opts.attack ?? 0.01, dur)
    src.connect(f).connect(g).connect(this.out(opts.wet ?? 0.4))
    src.start(t, Math.random())
    src.stop(t + dur + 0.1)
  }

  private tone(t: number, freq: number, dur: number, opts: { type?: OscillatorType; gain: number; attack?: number; freqEnd?: number; wet?: number; detune?: number }) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = opts.type ?? 'sine'
    o.frequency.setValueAtTime(freq, t)
    if (opts.freqEnd) o.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + dur)
    if (opts.detune) o.detune.value = opts.detune
    const g = ctx.createGain()
    this.env(g, t, opts.gain, opts.attack ?? 0.005, dur)
    o.connect(g).connect(this.out(opts.wet ?? 0.4))
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private now() {
    return this.ctx!.currentTime
  }

  // ----- UI -----

  hover() {
    if (!this.ready) return
    this.tone(this.now(), 1800, 0.05, { gain: 0.025, type: 'triangle', wet: 0.1 })
  }

  click() {
    if (!this.ready) return
    const t = this.now()
    this.tone(t, 420, 0.09, { gain: 0.08, type: 'triangle', freqEnd: 260, wet: 0.15 })
    this.noise(t, 0.03, { freq: 3000, q: 2, gain: 0.05, wet: 0.1 })
  }

  whoosh(strength = 1) {
    if (!this.ready) return
    this.noise(this.now(), 0.55, { freq: 300, freqEnd: 2400, q: 0.8, gain: 0.18 * strength, attack: 0.18, wet: 0.5 })
  }

  // ----- Chest -----

  thud(strength = 1) {
    if (!this.ready) return
    const t = this.now()
    this.tone(t, 110, 0.45, { gain: 0.5 * strength, freqEnd: 42, wet: 0.35 })
    this.noise(t, 0.18, { type: 'lowpass', freq: 900, gain: 0.35 * strength, wet: 0.5 })
    this.noise(t, 0.6, { type: 'bandpass', freq: 240, q: 0.7, gain: 0.08 * strength, attack: 0.02, wet: 0.9 })
  }

  rattle(intensity: number) {
    if (!this.ready) return
    const t = this.now()
    this.metal(t, 0.5 + intensity * 0.6, 0.06 + intensity * 0.05, 0.12)
    this.noise(t, 0.05, { freq: 1600, q: 4, gain: 0.05 + intensity * 0.05, wet: 0.2 })
  }

  private metal(t: number, base: number, gain: number, dur: number) {
    // Inharmonic partials read as struck iron.
    const partials = [1, 2.76, 5.4, 8.93]
    partials.forEach((p, i) => this.tone(t, 320 * base * p, dur * (1 - i * 0.18), { gain: gain / (i + 1), type: 'sine', wet: 0.6 }))
  }

  clank() {
    if (!this.ready) return
    const t = this.now()
    this.metal(t, 1.15, 0.22, 0.9)
    this.noise(t, 0.08, { freq: 4200, q: 1.5, gain: 0.16, wet: 0.4 })
    this.tone(t, 180, 0.25, { gain: 0.18, freqEnd: 90, wet: 0.3 })
  }

  creak(duration = 0.9) {
    if (!this.ready) return
    const ctx = this.ctx!
    const t = this.now()
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(70, t)
    o.frequency.linearRampToValueAtTime(110, t + duration * 0.6)
    o.frequency.linearRampToValueAtTime(85, t + duration)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 23
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 14
    lfo.connect(lfoGain).connect(o.frequency)
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 900
    f.Q.value = 6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.12)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    o.connect(f).connect(g).connect(this.out(0.7))
    o.start(t)
    lfo.start(t)
    o.stop(t + duration + 0.05)
    lfo.stop(t + duration + 0.05)
  }

  /** Starts the hold-to-open drone. Call setCharge with progress 0..1, then stopCharge. */
  startCharge() {
    if (!this.ready || this.charge) return
    const ctx = this.ctx!
    const t = this.now()
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 55
    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = 110
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 200
    filter.Q.value = 8
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.15)
    osc.connect(filter)
    osc2.connect(filter)
    filter.connect(gain).connect(this.out(0.5))
    const crackle = ctx.createBufferSource()
    crackle.buffer = this.noiseBuf
    crackle.loop = true
    const cf = ctx.createBiquadFilter()
    cf.type = 'highpass'
    cf.frequency.value = 3500
    const cGain = ctx.createGain()
    cGain.gain.value = 0.0
    crackle.connect(cf).connect(cGain).connect(this.out(0.3))
    osc.start(t)
    osc2.start(t)
    crackle.start(t)
    this.charge = { osc, osc2, gain, filter, crackle, cGain }
  }

  setCharge(p: number) {
    if (!this.charge || !this.ctx) return
    const t = this.now()
    const { osc, osc2, filter, cGain, gain } = this.charge
    osc.frequency.setTargetAtTime(55 + p * 110, t, 0.05)
    osc2.frequency.setTargetAtTime(110 + p * 330, t, 0.05)
    filter.frequency.setTargetAtTime(200 + p * 2600, t, 0.05)
    cGain.gain.setTargetAtTime(p * p * 0.06, t, 0.05)
    gain.gain.setTargetAtTime(0.1 + p * 0.12, t, 0.05)
  }

  stopCharge(release = 0.25) {
    if (!this.charge || !this.ctx) return
    const t = this.now()
    const c = this.charge
    c.gain.gain.cancelScheduledValues(t)
    c.gain.gain.setTargetAtTime(0.0001, t, release / 3)
    c.cGain.gain.setTargetAtTime(0.0001, t, release / 3)
    ;[c.osc, c.osc2, c.crackle].forEach((n) => n.stop(t + release + 0.1))
    this.charge = null
  }

  /** Rarity upgrade bell. step 0..5 climbs a minor pentatonic. */
  ting(step: number) {
    if (!this.ready) return
    const t = this.now()
    const scale = [0, 3, 5, 7, 10, 12, 15]
    const f = 392 * Math.pow(2, (scale[Math.min(step, scale.length - 1)] ?? 0) / 12)
    ;[1, 2.0, 3.01, 4.2].forEach((p, i) => this.tone(t, f * p, 1.6 - i * 0.3, { gain: 0.12 / (i + 1), wet: 0.8 }))
    this.noise(t, 0.12, { freq: 6000, q: 1, gain: 0.04, wet: 0.6 })
  }

  /** The lid burst. tier 1..6 scales weight and tail. */
  burst(tier: number) {
    if (!this.ready) return
    const t = this.now()
    const k = 0.5 + tier / 6
    this.tone(t, 90, 0.9 + tier * 0.15, { gain: 0.55 * k, freqEnd: 30, wet: 0.5 })
    this.noise(t, 0.5 + tier * 0.15, { type: 'lowpass', freq: 2400, freqEnd: 300, gain: 0.4 * k, wet: 0.7 })
    this.metal(t + 0.02, 0.9, 0.12 * k, 1.2)
    if (tier >= 3) this.shimmer(0.6 + tier * 0.25, tier)
    if (tier >= 5) this.choir(tier)
  }

  shimmer(duration = 1, density = 3) {
    if (!this.ready) return
    const t = this.now()
    const count = Math.floor(8 + density * 6)
    for (let i = 0; i < count; i++) {
      const at = t + Math.random() * duration
      this.tone(at, 2400 + Math.random() * 3600, 0.25, { gain: 0.025, wet: 0.9 })
    }
  }

  /** Swelling chord for legendary and relic reveals. */
  choir(tier: number) {
    if (!this.ready) return
    const ctx = this.ctx!
    const t = this.now()
    const root = tier >= 6 ? 146.83 : 174.61
    const chord = tier >= 6 ? [1, 1.189, 1.498, 2, 2.378] : [1, 1.26, 1.498, 2, 2.52]
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(400, t)
    f.frequency.exponentialRampToValueAtTime(2600, t + 1.4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.9)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2)
    f.connect(g).connect(this.out(0.9))
    chord.forEach((m) => {
      ;[-7, 7].forEach((det) => {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = root * m
        o.detune.value = det
        o.connect(f)
        o.start(t)
        o.stop(t + 4.4)
      })
    })
  }

  /** Count-up tick; pitch rises with progress 0..1. */
  tick(progress: number) {
    if (!this.ready) return
    this.tone(this.now(), 900 + progress * 900, 0.04, { gain: 0.035, type: 'square', wet: 0.05 })
  }

  coins(count = 6) {
    if (!this.ready) return
    const t = this.now()
    for (let i = 0; i < count; i++) {
      const at = t + i * 0.055 + Math.random() * 0.03
      this.tone(at, 2600 + Math.random() * 900, 0.18, { gain: 0.05, wet: 0.4 })
      this.tone(at, 5200 + Math.random() * 1200, 0.12, { gain: 0.02, wet: 0.4 })
    }
  }

  stamp() {
    if (!this.ready) return
    const t = this.now()
    this.tone(t, 70, 0.35, { gain: 0.45, freqEnd: 38, wet: 0.3 })
    this.noise(t, 0.09, { type: 'lowpass', freq: 1400, gain: 0.3, wet: 0.3 })
  }

  /** Low drone with fire crackle for the opening chamber. */
  startAmbience() {
    if (!this.ready || this.ambience) return
    const ctx = this.ctx!
    const t = this.now()
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 1.2)
    gain.connect(this.out(0.6))
    const drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 49
    const dg = ctx.createGain()
    dg.gain.value = 0.08
    drone.connect(dg).connect(gain)
    const fire = ctx.createBufferSource()
    fire.buffer = this.noiseBuf
    fire.loop = true
    const ff = ctx.createBiquadFilter()
    ff.type = 'lowpass'
    ff.frequency.value = 600
    const fg = ctx.createGain()
    fg.gain.value = 0.05
    fire.connect(ff).connect(fg).connect(gain)
    drone.start(t)
    fire.start(t)
    let alive = true
    const crackle = () => {
      if (!alive || !this.ready) return
      this.noise(this.now(), 0.02 + Math.random() * 0.03, { type: 'highpass', freq: 2500 + Math.random() * 3000, gain: 0.03 + Math.random() * 0.05, wet: 0.5 })
      window.setTimeout(crackle, 60 + Math.random() * 380)
    }
    crackle()
    this.ambience = {
      nodes: [drone, fire],
      gain,
      stop: () => {
        alive = false
        const n = this.now()
        gain.gain.setTargetAtTime(0.0001, n, 0.3)
        drone.stop(n + 1.2)
        fire.stop(n + 1.2)
      },
    }
  }

  stopAmbience() {
    this.ambience?.stop()
    this.ambience = null
    this.stopTension()
  }

  // ----- Opening ritual v2 -----

  /** A candle catching: a soft breath of flame. */
  ignite() {
    if (!this.ready) return
    const t = this.now()
    this.noise(t, 0.35, { freq: 700, freqEnd: 2200, q: 0.9, gain: 0.07, attack: 0.04, wet: 0.6 })
    this.tone(t, 180, 0.12, { gain: 0.05, freqEnd: 90, wet: 0.3 })
  }

  /** One heartbeat: a strong low thump and a softer echo. */
  heartbeat(strength = 1) {
    if (!this.ready) return
    const t = this.now()
    this.tone(t, 62, 0.2, { gain: 0.42 * strength, freqEnd: 38, wet: 0.15 })
    this.tone(t + 0.21, 58, 0.18, { gain: 0.26 * strength, freqEnd: 36, wet: 0.15 })
  }

  /** The lid falling back onto the chest: wood on wood, a little iron. */
  slam(strength = 1) {
    if (!this.ready) return
    const t = this.now()
    this.tone(t, 96, 0.3, { gain: 0.4 * strength, freqEnd: 44, wet: 0.35 })
    this.noise(t, 0.12, { type: 'lowpass', freq: 1300, gain: 0.32 * strength, wet: 0.4 })
    this.metal(t + 0.01, 0.6, 0.04 * strength, 0.25)
  }

  /** A held bed of rising tension under the tease; set 0..1, stop to release. */
  startTension() {
    if (!this.ready || this.tensionBed) return
    const ctx = this.ctx!
    const t = this.now()
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.8)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 220
    filter.Q.value = 6
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 55
    osc.connect(filter)
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    src.loop = true
    const nGain = ctx.createGain()
    nGain.gain.value = 0.25
    src.connect(nGain).connect(filter)
    filter.connect(gain).connect(this.out(0.7))
    osc.start(t)
    src.start(t)
    this.tensionBed = { osc, filter, gain, src, nGain }
  }

  setTension(level: number) {
    const b = this.tensionBed
    if (!b || !this.ready) return
    const t = this.now()
    const x = Math.max(0, Math.min(1, level))
    b.filter.frequency.setTargetAtTime(220 + x * x * 2400, t, 0.25)
    b.osc.frequency.setTargetAtTime(55 * (1 + x * 0.5), t, 0.4)
    b.gain.gain.setTargetAtTime(0.05 + x * 0.11, t, 0.3)
  }

  stopTension(release = 0.35) {
    const b = this.tensionBed
    if (!b || !this.ctx) return
    const t = this.now()
    b.gain.gain.setTargetAtTime(0.0001, t, release / 3)
    b.osc.stop(t + release + 0.2)
    b.src.stop(t + release + 0.2)
    this.tensionBed = null
  }

  /** Before a top-tier reveal: everything drops away to a sub-bass fall and silence. */
  blackout() {
    if (!this.ready) return
    const t = this.now()
    this.tone(t, 70, 1.1, { gain: 0.5, freqEnd: 24, attack: 0.02, wet: 0.6 })
    this.stopTension(0.15)
    const amb = this.ambience?.gain
    if (amb) {
      amb.gain.setTargetAtTime(0.02, t, 0.05)
      amb.gain.setTargetAtTime(0.5, t + 0.9, 0.4)
    }
  }
}

export const sfx = new Sfx()
