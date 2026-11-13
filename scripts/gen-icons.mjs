#!/usr/bin/env node
/**
 * Generates PWA icons from public/favicon.svg using sharp.
 * Run: npm run icons
 * Output: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png
 */
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const svgPath = join(publicDir, 'favicon.svg')

const svg = await readFile(svgPath)

const icons = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of icons) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, name))
  console.log(`✓ ${name} (${size}×${size})`)
}
