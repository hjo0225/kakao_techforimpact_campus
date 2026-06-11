/**
 * 튜토리얼 스크린샷 캡처 — 로컬 dev 서버(5173) + 로컬 BE(3002) 가동 상태에서 실행.
 *
 *   TUTORIAL_TOKEN=<jwt> TUTORIAL_USER='{"id":"2","nickname":"깡총이","teamCode":"LG"}' \
 *     node scripts/capture-tutorial.cjs
 *
 * 4장 생성: src/assets/tutorial/{map,verify,card,record}.png
 * - map    /map      잠실야구장 매장 지도 (BE 시드 데이터)
 * - verify /home     용기인증 카메라 (getUserMedia를 canvas 스트림으로 대체)
 * - card   /home     야구네컷 1컷 에디터 (게이트 해제 + 촬영 + 캐릭터 스티커)
 * - record /calendar 캘린더 (인증 이력 API 목킹)
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE = 'http://localhost:5173';
const OUT_DIR = path.resolve(__dirname, '../src/assets/tutorial');
const TOKEN = process.env.TUTORIAL_TOKEN;
const USER = JSON.parse(process.env.TUTORIAL_USER ?? 'null');
if (!TOKEN || !USER) {
  console.error('TUTORIAL_TOKEN / TUTORIAL_USER 환경변수가 필요합니다');
  process.exit(1);
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

// 캘린더 목 데이터 — 이번 달 3일에 걸친 인증 이력
function mockHistory() {
  const now = new Date();
  const at = (dayOffset, hour) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset, hour, 24);
    return d.toISOString();
  };
  let n = 0;
  const item = (dayOffset, hour) => ({
    id: `mock-${++n}`,
    kind: 'USE',
    userLabel: 'REUSABLE',
    status: 'CONFIRMED',
    confidence: 90 + n,
    createdAt: at(dayOffset, hour),
  });
  return [item(0, 18), item(0, 12), item(1, 19), item(3, 13), item(3, 18)];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 전체 화면 캡처 — cb-photo(image-rendering: auto) 적용으로 축소돼도 선명

async function bootstrapSession(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user, today }) => {
      localStorage.setItem('auth', JSON.stringify({
        state: { user: { profileImage: null, ...user }, token, teamsByUserId: {} },
        version: 2,
      }));
      // 튜토리얼 오버레이가 캡처를 가리지 않게 + 야구네컷 게이트 해제
      localStorage.setItem('tutorial', JSON.stringify({ state: { dismissed: true }, version: 0 }));
      localStorage.setItem('verify-gate', JSON.stringify({ state: { lastVerifiedDate: today }, version: 0 }));
    },
    { token: TOKEN, user: USER, today: todayKey() },
  );
}

// getUserMedia → canvas 스트림 (야구장 일러스트를 카메라 피드처럼)
async function fakeCamera(page) {
  await page.evaluateOnNewDocument(() => {
    const fake = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = '/src/assets/tutorial/stadium-bg.png';
      await new Promise((r) => { img.onload = r; img.onerror = r; });
      const draw = () => {
        ctx.fillStyle = '#FAF5EF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (img.naturalWidth) {
          const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
          const w = img.naturalWidth * s;
          const h = img.naturalHeight * s;
          ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        }
      };
      draw();
      setInterval(draw, 100);
      return canvas.captureStream(15);
    };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: fake });
  });
}

async function shoot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`✔ ${name}.png`);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    // ── 1. 지도 ──────────────────────────────────────────────
    let page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
    await bootstrapSession(page);
    await page.goto(`${BASE}/map`, { waitUntil: 'networkidle2' });
    await sleep(2500);
    await shoot(page, 'map');
    await page.close();

    // ── 2. 용기인증 카메라 ────────────────────────────────────
    page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
    await fakeCamera(page);
    await bootstrapSession(page);
    await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await page.locator('button ::-p-text(용기인증)').click(); // 기본 모드가 야구네컷일 수 있음
    await sleep(1800);
    await shoot(page, 'verify');

    // ── 3. 야구네컷 1컷 에디터 ────────────────────────────────
    await page.locator('button ::-p-text(야구네컷)').click();
    await sleep(900);
    await page.locator('button[aria-label="프레임"]').click();
    await sleep(400);
    await page.locator('button ::-p-text(1컷)').click();
    await sleep(400);
    await page.locator('button[aria-label="기본 캐릭터 추가"]').click(); // 팔레트에서 캐릭터 추가 (시트 자동 닫힘)
    await sleep(600);
    await page.locator('button[aria-label="촬영"]').click();
    await sleep(800);
    await page.locator('button[aria-label="편집 닫기"]').click(); // 슬롯 편집 패널 닫기
    await sleep(2400); // 토스트(2200ms) 사라질 때까지 + 카드 합성 대기
    await shoot(page, 'card');
    await page.close();

    // ── 4. 캘린더 (이력 목킹) ─────────────────────────────────
    page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
    await page.setRequestInterception(true);
    const photoBytes = fs.readFileSync(path.resolve(__dirname, '../src/assets/tutorial/stadium-bg.png'));
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };
    page.on('request', (req) => {
      const url = req.url();
      const mocked = /\/verify\/history(\/[^/]+\/image)?$/.test(url);
      if (!mocked) {
        req.continue();
        return;
      }
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: cors }); // CORS preflight
        return;
      }
      if (/\/image$/.test(url)) {
        req.respond({ status: 200, headers: cors, contentType: 'image/png', body: photoBytes });
      } else {
        req.respond({
          status: 200,
          headers: cors,
          contentType: 'application/json',
          body: JSON.stringify(mockHistory()),
        });
      }
    });
    await bootstrapSession(page);
    await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle2' });
    await sleep(2500);
    await shoot(page, 'record');
    await page.close();
  } finally {
    await browser.close();
  }
})();
