import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const sizes = [48, 72, 96, 128, 144, 152, 192, 384, 512]

async function generateIcons() {
  const svgBuffer = readFileSync(resolve(projectRoot, 'public', 'icon.svg'))

  const outputDir = resolve(projectRoot, 'public', 'icons')
  mkdirSync(outputDir, { recursive: true })

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(resolve(outputDir, `icon-${size}x${size}.png`))
    console.log(`Generated icon-${size}x${size}.png`)
  }

  // Also create a 1024x1024 for Android
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(resolve(outputDir, 'icon-1024x1024.png'))
  console.log('Generated icon-1024x1024.png')

  console.log('All icons generated!')
}

generateIcons().catch(console.error)
