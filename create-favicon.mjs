import sharp from 'sharp'

// Create square favicon from max-logo.jpg
const inputPath = './public/max-logo.jpg'

// Read and get metadata
const metadata = await sharp(inputPath).metadata()
console.log(`Original: ${metadata.width}x${metadata.height}`)

// Calculate center square crop
const size = Math.min(metadata.width, metadata.height)
const left = Math.floor((metadata.width - size) / 2)
const top = Math.floor((metadata.height - size) / 2)

console.log(`Cropping to ${size}x${size} from (${left}, ${top})`)

// Create square favicon versions
await sharp(inputPath)
  .extract({ left, top, width: size, height: size })
  .resize(180, 180)
  .jpeg({ quality: 90 })
  .toFile('./public/favicon-180.jpg')

await sharp(inputPath)
  .extract({ left, top, width: size, height: size })
  .resize(32, 32)
  .png()
  .toFile('./public/favicon-32.png')

await sharp(inputPath)
  .extract({ left, top, width: size, height: size })
  .resize(16, 16)
  .png()
  .toFile('./public/favicon-16.png')

// Also create a square version of the logo
await sharp(inputPath)
  .extract({ left, top, width: size, height: size })
  .resize(512, 512)
  .jpeg({ quality: 90 })
  .toFile('./public/max-logo-square.jpg')

console.log('Created:')
console.log('  - public/favicon-180.jpg (Apple touch icon)')
console.log('  - public/favicon-32.png')
console.log('  - public/favicon-16.png')
console.log('  - public/max-logo-square.jpg')
