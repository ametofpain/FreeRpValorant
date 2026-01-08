(() => {
  const start = document.getElementById('start')
  const overlay = document.getElementById('overlay')
  const close = document.getElementById('close')
  const scary = document.getElementById('scary')

  let audioCtx = null
  let continuousNodes = null

  function initAudio(){
    if(audioCtx) return
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }

  function playJumpscareSound(){
    // legacy burst (kept for compatibility) — starts a short intense burst
    if(!audioCtx) initAudio()
    const ctx = audioCtx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(120, ctx.currentTime)
    o.connect(g)
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    o.start()
    o.stop(ctx.currentTime + 1.0)
  }

  function startContinuousSound(){
    if(continuousNodes) return
    if(!audioCtx) initAudio()
    const ctx = audioCtx
    const master = ctx.createGain()
    master.gain.value = 1.2
    master.connect(ctx.destination)

    const sh = ctx.createWaveShaper()
    const curve = new Float32Array(65536)
    for(let i=0;i<curve.length;i++){
      const x = i * 2 / curve.length - 1
      curve[i] = Math.tanh(5 * x)
    }
    sh.curve = curve

    const o1 = ctx.createOscillator()
    o1.type = 'sawtooth'
    o1.frequency.setValueAtTime(70, ctx.currentTime)

    const o2 = ctx.createOscillator()
    o2.type = 'square'
    o2.frequency.setValueAtTime(900, ctx.currentTime)

    const bufferSize = ctx.sampleRate * 2
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1)
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true

    const bf = ctx.createBiquadFilter()
    bf.type = 'bandpass'
    bf.frequency.value = 1200
    bf.Q.value = 0.6

    const gn = ctx.createGain()
    const g1 = ctx.createGain()

    o1.connect(sh)
    o2.connect(sh)
    sh.connect(g1)
    g1.connect(master)

    noise.connect(bf)
    bf.connect(gn)
    gn.connect(master)

    // steady envelopes (sustained)
    g1.gain.setValueAtTime(0.0001, ctx.currentTime)
    g1.gain.exponentialRampToValueAtTime(1.8, ctx.currentTime + 0.05)

    gn.gain.setValueAtTime(0.0001, ctx.currentTime)
    gn.gain.exponentialRampToValueAtTime(1.2, ctx.currentTime + 0.03)

    o1.start()
    o2.start()
    noise.start()

    continuousNodes = {ctx, o1, o2, noise, master, sh, bf, g1, gn}
  }

  function stopContinuousSound(){
    if(!continuousNodes) return
    const n = continuousNodes
    try{
      if(n.o1) n.o1.stop()
      if(n.o2) n.o2.stop()
      if(n.noise) n.noise.stop()
    }catch(e){}
    // disconnect everything
    try{ if(n.master) n.master.disconnect() }catch(e){}
    continuousNodes = null
  }

  function showJumpscare(){
    overlay.classList.remove('hidden')
    overlay.classList.add('show','flash','intense')
    overlay.setAttribute('aria-hidden','false')
    // force reflow then animate
    void scary.offsetWidth
    // start continuous sound
    try{ startContinuousSound() }catch(e){
      console.warn(e)
      try{ playJumpscareSound() }catch(e2){}
    }

    // vibrate if available
    if(navigator.vibrate) navigator.vibrate([200,100,200])
    // overlay remains until user closes
  }

  start.addEventListener('click', async (e)=>{
    // user interaction — allowed to start audio and fullscreen
    initAudio()
    try{
      if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen()
      else if(document.documentElement.webkitRequestFullscreen) await document.documentElement.webkitRequestFullscreen()
    }catch(e){/* ignore */}

    // small timeout so user sees fullscreen transition
    setTimeout(showJumpscare, 200)
  })

  close.addEventListener('click', ()=>{
    overlay.classList.add('hidden')
    overlay.classList.remove('show','flash')
    overlay.setAttribute('aria-hidden','true')
    // try exit fullscreen
    if(document.fullscreenElement){
      document.exitFullscreen().catch(()=>{})
    }
  })

  // allow Esc to close
  document.addEventListener('keydown', (ev)=>{
    if(ev.key === 'Escape'){
      close.click()
    }
  })
})();
