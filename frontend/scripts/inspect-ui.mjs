import puppeteer from 'puppeteer'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const OUT_DIR = path.resolve('inspect-out')
const PORT = 5174
const BASE = `http://127.0.0.1:${PORT}`

function startVite() {
  return new Promise((resolve, reject) => {
    const viteBin = path.resolve(
      'node_modules',
      'vite',
      'bin',
      'vite.js',
    )
    const proc = spawn(
      process.execPath,
      [viteBin, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
      { stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
    )
    let buf = ''
    const onData = (d) => {
      buf += d.toString()
      if (buf.includes('Local:') || buf.includes('ready in')) {
        resolve(proc)
      }
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)
    proc.on('error', reject)
    setTimeout(() => reject(new Error('vite did not start in 30s\n' + buf)), 30000)
  })
}

const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2 } // iPhone 14 Pro

const FAKE_USER = { id: 9999, nickname: '검사자', profileImage: null }
const FAKE_TOKEN = 'inspect-fake-token'

const SCREENS = [
  { name: '01-login', path: '/login', auth: 'none' },
  { name: '02-onboarding', path: '/onboarding', auth: 'no-team' },
  { name: '03-home', path: '/home', auth: 'with-team' },
  { name: '04-game-select', path: '/game-select', auth: 'with-team' },
  { name: '05-map', path: '/map', auth: 'with-team' },
  { name: '06-report', path: '/report', auth: 'with-team' },
  { name: '07-record', path: '/record', auth: 'with-team' },
  { name: '08-ranking', path: '/ranking', auth: 'with-team' },
  { name: '09-account', path: '/account', auth: 'with-team' },
  { name: '10-avatar', path: '/avatar', auth: 'with-team' },
]

function authState(mode) {
  const base = { state: { user: null, token: null, teamsByUserId: {} }, version: 0 }
  if (mode === 'no-team') {
    base.state.user = FAKE_USER
    base.state.token = FAKE_TOKEN
  } else if (mode === 'with-team') {
    base.state.user = FAKE_USER
    base.state.token = FAKE_TOKEN
    base.state.teamsByUserId = { [FAKE_USER.id]: 'LG 트윈스' }
  }
  return base
}

async function inspect() {
  await mkdir(OUT_DIR, { recursive: true })
  console.error('starting vite...')
  const vite = await startVite()
  console.error('vite started on ' + BASE)
  // verify connectivity from node first
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(BASE + '/')
      if (r.ok) {
        console.error('node fetch OK: ' + r.status)
        break
      }
    } catch (e) {
      if (i === 19) throw new Error('node fetch never succeeded: ' + e)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-proxy-server',
      '--proxy-bypass-list=*',
      '--no-sandbox',
      '--disable-features=NetworkServiceInProcess2',
    ],
  })
  const findings = []

  for (const s of SCREENS) {
    const page = await browser.newPage()
    await page.setViewport(VIEWPORT)
    const consoleErrors = []
    const pageErrors = []
    const reqFails = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning')
        consoleErrors.push({ type: msg.type(), text: msg.text() })
    })
    page.on('pageerror', (err) => pageErrors.push(String(err)))
    page.on('requestfailed', (req) =>
      reqFails.push({ url: req.url(), err: req.failure()?.errorText }),
    )

    // Seed localStorage BEFORE app loads
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
    const auth = JSON.stringify(authState(s.auth))
    await page.evaluate((v) => localStorage.setItem('auth', v), auth)

    const t0 = Date.now()
    let navError = null
    try {
      await page.goto(BASE + s.path, { waitUntil: 'networkidle2', timeout: 15000 })
    } catch (e) {
      navError = String(e)
    }
    const navMs = Date.now() - t0

    // Wait a beat for animations / lazy chunks
    await new Promise((r) => setTimeout(r, 600))

    const finalUrl = page.url()
    const screenshotPath = path.join(OUT_DIR, `${s.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })

    // Pull DOM diagnostics
    const diag = await page.evaluate(() => {
      const out = {
        title: document.title,
        bodyClasses: document.body.className,
        nodeCount: document.querySelectorAll('*').length,
        imgs: [],
        buttons: [],
        smallTouchTargets: [],
        unlabeledInteractive: [],
        contrastIssues: [],
        fixedHexInStyles: 0,
        inlineStyleNodes: 0,
        anchorsNoHref: 0,
        scrollOverflowH: false,
      }

      // images without alt or with broken sources
      document.querySelectorAll('img').forEach((img) => {
        out.imgs.push({
          src: img.currentSrc || img.src,
          alt: img.alt,
          natural: `${img.naturalWidth}x${img.naturalHeight}`,
          rendered: `${img.clientWidth}x${img.clientHeight}`,
        })
      })

      // touch targets
      document.querySelectorAll('button, a, [role="button"], [role="tab"]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        if (r.width < 44 || r.height < 44) {
          out.smallTouchTargets.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().slice(0, 40),
            w: Math.round(r.width),
            h: Math.round(r.height),
          })
        }
        const accName =
          (el.textContent || '').trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('title')
        if (!accName) {
          out.unlabeledInteractive.push({
            tag: el.tagName.toLowerCase(),
            html: el.outerHTML.slice(0, 80),
          })
        }
        if (el.tagName.toLowerCase() === 'a' && !el.getAttribute('href')) out.anchorsNoHref++
      })

      // inline styles count
      document.querySelectorAll('[style]').forEach(() => out.inlineStyleNodes++)

      // horizontal overflow
      out.scrollOverflowH =
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 2

      // primary heading text
      const h1 = document.querySelector('h1, h2')
      out.firstHeading = h1 ? h1.textContent.trim().slice(0, 80) : null

      return out
    })

    // measure LCP-ish: largest visible block
    const layout = await page.evaluate(() => {
      const root = document.querySelector('#root')
      if (!root) return null
      const r = root.getBoundingClientRect()
      return { rootW: Math.round(r.width), rootH: Math.round(r.height) }
    })

    // scroll test: find the inner scrollable element and try to scroll
    const scrollTest = await page.evaluate(() => {
      const cands = Array.from(document.querySelectorAll('*')).filter((el) => {
        const cs = getComputedStyle(el)
        return (
          (cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight + 4
        )
      })
      if (cands.length === 0) return { scrollable: false, reason: 'no overflow:auto with scrollHeight > clientHeight' }
      const el = cands[0]
      const before = el.scrollTop
      el.scrollTop = 9999
      const after = el.scrollTop
      el.scrollTop = before
      return {
        scrollable: after > before,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        maxScroll: after,
        sampleClass: el.className?.toString().slice(0, 60) || '',
      }
    })

    findings.push({
      screen: s.name,
      requested: s.path,
      finalUrl,
      auth: s.auth,
      navMs,
      navError,
      consoleErrors: consoleErrors.slice(0, 10),
      pageErrors,
      reqFails,
      diag,
      layout,
      scrollTest,
      screenshot: path.relative(process.cwd(), screenshotPath),
    })

    await page.close()
  }

  await browser.close()
  vite.kill()
  await writeFile(path.join(OUT_DIR, 'report.json'), JSON.stringify(findings, null, 2))
  console.log(JSON.stringify(findings, null, 2))
}

inspect().catch((e) => {
  console.error(e)
  process.exit(1)
})
