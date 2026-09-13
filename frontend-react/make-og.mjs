/* One-off: rasterize og-card.html → public/og.png (1200×630). */
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.goto('file:///' + path.join(ROOT, 'og-card.html').replaceAll('\\', '/'))
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(1500)
await page.screenshot({ path: path.join(ROOT, 'public', 'og.png') })

/* Also rasterize the brand mark for apple-touch-icon (Safari ignores SVG favicons). */
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } })
await icon.goto('file:///' + path.join(ROOT, 'public', 'logo.svg').replaceAll('\\', '/'))
await icon.setViewportSize({ width: 180, height: 180 })
await icon.screenshot({ path: path.join(ROOT, 'public', 'apple-touch-icon.png') })

await browser.close()
console.log('og.png + apple-touch-icon.png rendered')
