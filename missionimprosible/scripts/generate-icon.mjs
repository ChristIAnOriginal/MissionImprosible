import { Jimp } from 'jimp'
import pngToIco from 'png-to-ico'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const src  = join(root, 'src/renderer/assets/falso-vacio.jpg')
const out  = join(root, 'build/icon.ico')

mkdirSync(join(root, 'build'), { recursive: true })

const sizes = [16, 32, 48, 64, 128, 256]
const pngBuffers = await Promise.all(
  sizes.map(async size => {
    const img = await Jimp.read(src)
    img.resize({ w: size, h: size })
    return img.getBuffer('image/png')
  })
)

const ico = await pngToIco(pngBuffers)
writeFileSync(out, ico)
console.log('Icon generated:', out)
