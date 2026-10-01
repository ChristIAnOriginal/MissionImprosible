/**
 * Graba vídeos de ejemplo de las animaciones, fotograma a fotograma.
 *
 *   npm run render:ejemplos            → todos los de JOBS
 *   npm run render:ejemplos -- farol   → sólo los que contengan "farol"
 *   npm run render:ejemplos -- diorama --still=6
 *        → en vez de vídeo, una imagen fija en el segundo 6 (ejemplos/fijas/),
 *          y se pueden forzar valores: --set=light=noche
 *
 * Se ejecuta con Electron: abre `dist/render/index.html` fuera de pantalla,
 * pinta cada instante con `window.renderScene` y va pasando las capturas a
 * ffmpeg (tiene que estar en el PATH). Los vídeos quedan en `ejemplos/`.
 */
const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const FPS = 30
const OUT_DIR = path.join(__dirname, '../../ejemplos')

/** Qué se graba: animación, duración y valores distintos de los de su ficha. */
const BASE_JOBS = [
  { id: 'trono-rey', seconds: 12, values: {} },
  // La ruta de la mesa de dibujo tarda ~17 s en trazarse entera.
  { id: 'biblioteca-cartografo', seconds: 18, values: {} },
  // Ciclo corto para que en el vídeo se vean dos días y dos noches.
  { id: 'farol-enano', seconds: 16, values: { mode: 'auto', cycleSeconds: 8 } },
]

/** Cada fondo se graba en los tres estilos: `<id>.mp4`, `<id>-realista.mp4` y `<id>-diorama.mp4`. */
const JOBS = BASE_JOBS.flatMap(job => [
  { ...job, look: 'plano', name: job.id },
  { ...job, look: 'realista', name: `${job.id}-realista` },
  { ...job, look: 'diorama', name: `${job.id}-diorama` },
])

/** Escenas de cabina: plano y realista. */
for (const id of ['cabina-deriva', 'nave-apagada', 'nave-encendida']) {
  JOBS.push({ id, seconds: 10, values: {}, look: 'plano', name: id })
  JOBS.push({ id, seconds: 10, values: {}, look: 'realista', name: `${id}-realista` })
}

/** Imágenes fijas: un solo acabado, sin estilos. */
for (const id of ['boa', 'elefante']) JOBS.push({ id, seconds: 4, values: {}, look: 'plano', name: id })

async function record(win, job) {
  const file = path.join(OUT_DIR, `${job.name}.mp4`)
  const ffmpeg = spawn(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', file],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  )
  const done = new Promise((resolve, reject) => {
    ffmpeg.on('error', reject)
    ffmpeg.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg salió con ${code}`))))
  })

  const frames = Math.round(job.seconds * FPS)
  for (let i = 0; i < frames; i++) {
    const ok = await win.webContents.executeJavaScript(
      `window.renderScene(${JSON.stringify(job.id)}, ${JSON.stringify(job.values)}, ${i / FPS}, ${JSON.stringify(job.look)})`
    )
    if (!ok) throw new Error(`No existe la animación ${job.id}`)
    // Dos fotogramas del navegador: el render ya está pintado al capturar.
    await win.webContents.executeJavaScript(
      'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))'
    )
    const png = (await win.webContents.capturePage()).toPNG()
    if (!ffmpeg.stdin.write(png)) await new Promise(r => ffmpeg.stdin.once('drain', r))
    if (i % FPS === 0) process.stdout.write(`\r${job.name}: ${Math.round((i / frames) * 100)}%   `)
  }
  ffmpeg.stdin.end()
  await done
  process.stdout.write(`\r${job.name}: listo → ${path.relative(process.cwd(), file)}\n`)
}

app.whenReady().then(async () => {
  const args = process.argv.slice(2)
  const filter = args.find(a => !a.startsWith('-') && !a.endsWith('.cjs'))
  const still = args.find(a => a.startsWith('--still='))
  const sets = Object.fromEntries(
    args
      .filter(a => a.startsWith('--set='))
      .map(a => a.slice(6).split('='))
      .map(([k, v]) => [k, v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v])
  )
  const tag = Object.entries(sets).map(([k, v]) => `-${k}-${v}`).join('')
  const jobs = JOBS.filter(j => !filter || j.name.includes(filter)).map(j => ({ ...j, values: { ...j.values, ...sets } }))
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    useContentSize: true,
    webPreferences: { offscreen: true, backgroundThrottling: false },
  })
  await win.loadFile(path.join(__dirname, '../../dist/render/index.html'))

  try {
    if (still) {
      const t = Number(still.slice(8))
      const dir = path.join(OUT_DIR, 'fijas')
      fs.mkdirSync(dir, { recursive: true })
      for (const job of jobs) {
        await win.webContents.executeJavaScript(
          `window.renderScene(${JSON.stringify(job.id)}, ${JSON.stringify(job.values)}, ${t}, ${JSON.stringify(job.look)})`
        )
        await win.webContents.executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
        const file = path.join(dir, `${job.name}${tag}.png`)
        fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG())
        console.log(`${job.name}: ${path.relative(process.cwd(), file)}`)
      }
    } else {
      for (const job of jobs) await record(win, job)
    }
  } catch (err) {
    console.error(`\n${err.message}`)
    process.exitCode = 1
  }
  app.quit()
})
