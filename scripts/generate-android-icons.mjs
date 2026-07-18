import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const svgBuffer = readFileSync(resolve(projectRoot, 'public', 'icon.svg'))

// Android mipmap sizes
const sizes = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
]

async function generateAndroidIcons() {
  for (const { dir, size } of sizes) {
    const outDir = resolve(projectRoot, 'android', 'app', 'src', 'main', 'res', dir)
    mkdirSync(outDir, { recursive: true })

    // Generate ic_launcher.png
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(resolve(outDir, 'ic_launcher.png'))
    console.log(`Generated ${dir}/ic_launcher.png (${size}x${size})`)

    // Generate ic_launcher_round.png (same icon, just rounded by system)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(resolve(outDir, 'ic_launcher_round.png'))
    console.log(`Generated ${dir}/ic_launcher_round.png (${size}x${size})`)

    // Generate ic_launcher_foreground.png (for adaptive icons)
    await sharp(svgBuffer)
      .resize(Math.round(size * 0.8), Math.round(size * 0.8))
      .png()
      .toFile(resolve(outDir, 'ic_launcher_foreground.png'))
    console.log(`Generated ${dir}/ic_launcher_foreground.png (${Math.round(size * 0.8)}x${Math.round(size * 0.8)})`)
  }

  console.log('All Android icons generated!')
}

generateAndroidIcons().catch(console.error)
