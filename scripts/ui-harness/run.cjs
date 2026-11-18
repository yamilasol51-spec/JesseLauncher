const { chromium } = require('/opt/npm-tools/node_modules/playwright')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch()
  const results = []
  const ok = (name) => { results.push(name); console.log('PASS', name) }
  const open = async (qs, w = 1280, h = 900) => { const p = await browser.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); await p.goto('file:///tmp/harness/index.html' + qs); await p.waitForTimeout(400); p.errs = errs; return p }

  // ---- Quick play panel
  let p = await open('?lang=en')
  assert.equal((await p.locator('.quick-play-panel h2').innerText()), 'Quick play'); ok('panel renders (en)')
  const opts = await p.locator('#quick-version option').allInnerTexts()
  assert.deepEqual(opts.slice(0,3), ['1.21.4', '1.8.9', '1.8.9-OptiFine_HD_U_M5']); assert.ok(opts.includes('1.21.5') && opts.includes('1.20.1')); ok('version selector lists installed first, then downloadable releases')
  const groups = await p.locator('#quick-version optgroup').evaluateAll(n => n.map(x => x.label)); assert.deepEqual(groups, ['Installed versions', 'Downloaded on launch']); ok('version groups labelled')
  assert.equal(await p.locator('.quick-play-button').isDisabled(), true); ok('play disabled without a valid username')
  await p.fill('#quick-username', 'ab'); assert.match(await p.locator('#quick-username-help').innerText(), /3[–-]16/); assert.equal(await p.locator('.quick-input.invalid').count(), 1); ok('invalid username flagged (too short)')
  await p.fill('#quick-username', 'bad name!'); assert.equal(await p.locator('.quick-input.invalid').count(), 1); assert.equal(await p.locator('.quick-play-button').isDisabled(), true); ok('invalid characters flagged, play stays disabled')
  await p.fill('#quick-username', 'Alex_01'); assert.equal(await p.locator('.quick-play-button').isDisabled(), false); ok('valid username enables play')
  await p.selectOption('#quick-version', '1.21.5')
  assert.equal(await p.locator('.quick-field small').nth(1).innerText(), 'Downloaded on launch'); ok('not-installed version shows download-on-launch hint')
  await p.click('.quick-play-button'); await p.waitForTimeout(300)
  let calls = await p.evaluate(() => window.__calls)
  assert.deepEqual(calls.filter(c => c[0] === 'createOfflineAccount'), [['createOfflineAccount', 'Alex_01']]); assert.deepEqual(calls.filter(c => c[0] === 'play'), [['play', '1.21.5']]); ok('play creates offline account then launches selected version')
  assert.ok(calls.some(c => c[0] === 'selectVersion' && c[1] === '1.21.5')); ok('selected version persisted via selectVersion')
  // second play with same name must not recreate the account
  await p.click('.quick-play-button'); await p.waitForTimeout(200); calls = await p.evaluate(() => window.__calls)
  assert.equal(calls.filter(c => c[0] === 'createOfflineAccount').length, 1); assert.equal(calls.filter(c => c[0] === 'play').length, 2); ok('re-playing with same name reuses the account')
  // switch name to a different one and back -> selectAccount for existing
  await p.fill('#quick-username', 'Steve'); await p.press('#quick-username', 'Enter'); await p.waitForTimeout(200)
  await p.fill('#quick-username', 'Alex_01'); await p.press('#quick-username', 'Enter'); await p.waitForTimeout(200)
  calls = await p.evaluate(() => window.__calls); assert.ok(calls.some(c => c[0] === 'selectAccount' && c[1] === 'off-Alex_01')); ok('returning to an existing name selects the existing account')
  // RAM
  const range = p.locator('#quick-memory')
  assert.equal(await range.getAttribute('max'), '16384'); assert.equal(await range.getAttribute('min'), '1024'); ok('RAM slider bounded by physical memory (16 GB machine)')
  await p.click('.quick-presets button:has-text("8 GB")'); await p.waitForTimeout(200)
  calls = await p.evaluate(() => window.__calls); assert.ok(calls.some(c => c[0] === 'saveSettings' && c[1].memoryMb === 8192)); ok('RAM preset saves memoryMb=8192')
  assert.ok((await p.locator('.quick-label-row strong').first().innerText()).includes('8 GB')); ok('RAM label updates')
  // Java
  const javaOpts = await p.locator('#quick-java option').allInnerTexts(); assert.equal(javaOpts[0], 'Detect automatically'); assert.ok(javaOpts.some(o => o.startsWith('Java 21.0.2')) && javaOpts.some(o => o.startsWith('Java 1.8.0_402'))); ok('Java selector lists auto + detected runtimes')
  await p.selectOption('#quick-java', 'C:/Java/jdk-21/bin/javaw.exe'); await p.waitForTimeout(200)
  calls = await p.evaluate(() => window.__calls); assert.ok(calls.some(c => c[0] === 'saveSettings' && c[1].javaPath === 'C:/Java/jdk-21/bin/javaw.exe')); ok('choosing a Java runtime saves javaPath')
  await p.click('.quick-icon-button'); await p.waitForTimeout(300); calls = await p.evaluate(() => window.__calls)
  assert.ok(calls.some(c => c[0] === 'saveSettings' && c[1].javaPath === 'D:/MyJava/bin/javaw.exe')); assert.ok(await p.locator('#quick-java option[value="D:/MyJava/bin/javaw.exe"]').count() === 1); ok('browsing for a custom Java saves it and keeps it selectable')
  assert.equal(p.errs.length, 0, p.errs.join('\n')); ok('no console/page errors on home panel')
  await p.screenshot({ path: '/tmp/harness/shot-home-en.png' }); await p.close()

  // small RAM machine: slider capped, heavy warning
  p = await open('?lang=en&ram=4096')
  assert.equal(await p.locator('#quick-memory').getAttribute('max'), '4096'); ok('RAM slider capped to 4 GB on a 4 GB machine')
  assert.equal(await p.locator('.quick-warning').count(), 1); ok('high allocation warning shown (4 GB of 4 GB)')
  await p.close()

  // translations
  for (const l of ['de', 'fr', 'ru', 'pl', 'tr']) { p = await open('?lang=' + l); const h = await p.locator('.quick-play-panel h2').innerText(); console.log('  lang', l, '->', h); assert.ok(h.length > 0); await p.close() }
  ok('panel renders in all 6 languages')

  // responsive
  p = await open('?lang=en', 700, 900); const cols = await p.locator('.quick-play-grid').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length); assert.equal(cols, 1); await p.screenshot({ path: '/tmp/harness/shot-home-narrow.png' }); await p.close(); ok('panel collapses to one column on narrow windows')

  // ---- Installed versions manager
  p = await open('?lang=en&page=versions')
  await p.waitForSelector('.installed-row')
  assert.equal(await p.locator('.installed-row').count(), 4); ok('manager lists all installed versions')
  const ids = await p.locator('.installed-row .version-main strong').allInnerTexts(); assert.deepEqual(ids, ['25w10a', 'fabric-loader-0.16.9-1.21.4', '1.21.4', '1.8.9']); ok('default sort: newest first')
  const summary = await p.locator('.installed-summary').innerText(); assert.ok(summary.includes('4') && summary.includes('MB')); ok('summary shows count and total size')
  const sizes = await p.locator('.installed-size').allInnerTexts(); assert.ok(sizes.includes('27.1 MB') && sizes.includes('8.2'.length ? sizes.find(s=>s.endsWith('MB') && s.startsWith('9.3')) : '')); ok('sizes formatted (28.4e6 B -> 27.1 MB, 9.8e6 -> 9.3 MB)')
  await p.click('.filter-tabs button:has-text("Size")'); const bySize = await p.locator('.installed-row .version-main strong').allInnerTexts(); assert.deepEqual(bySize, ['25w10a', '1.21.4', '1.8.9', 'fabric-loader-0.16.9-1.21.4']); ok('sort by size')
  await p.click('.filter-tabs button:has-text("Name")'); const byName = await p.locator('.installed-row .version-main strong').allInnerTexts(); assert.deepEqual(byName, ['1.8.9', '1.21.4', '25w10a', 'fabric-loader-0.16.9-1.21.4']); ok('sort by name (numeric-aware)')
  await p.fill('.installed-toolbar input', 'fabric'); assert.equal(await p.locator('.installed-row').count(), 1); ok('search filters list')
  await p.fill('.installed-toolbar input', 'zzz'); assert.ok((await p.locator('.empty-state').innerText()).includes('No versions')); await p.fill('.installed-toolbar input', ''); ok('empty-filter message')
  const baseRow = p.locator('.installed-row', { hasText: '1.21.4' }).filter({ hasNot: p.locator('text=fabric') }).first()
  const delBtn = p.locator('.installed-row').nth(2).locator('button').nth(2); // after name sort: 1.8.9, 1.21.4, 25w10a, fabric -> index1 is 1.21.4
  await p.click('.filter-tabs button:has-text("Newest")')
  const rows = p.locator('.installed-row'); const base = rows.nth(2) // 1.21.4
  assert.equal(await base.locator('button').nth(2).isDisabled(), true); ok('base version with dependents cannot be deleted (button disabled)')
  assert.equal(await rows.nth(3).locator('button').nth(2).isDisabled(), false); ok('independent version can be deleted')
  await rows.nth(3).locator('button').nth(2).click(); await rows.nth(0).locator('button').nth(0).click(); await rows.nth(0).locator('button').nth(1).click()
  calls = await p.evaluate(() => window.__calls); assert.ok(calls.some(c => c[0] === 'delete' && c[1] === '1.8.9')); assert.ok(calls.some(c => c[0] === 'play' && c[1] === '25w10a')); assert.ok(calls.some(c => c[0] === 'openVersionLocation' && c[1] === '25w10a')); ok('play / open-folder / delete callbacks fire with the right ids')
  assert.equal(p.errs.length, 0, p.errs.join('\n')); ok('no console/page errors in manager')
  await p.screenshot({ path: '/tmp/harness/shot-manager.png' }); await p.close()
  console.log('\nTOTAL PASSED:', results.length)
  await browser.close()
})().catch(e => { console.error('FAIL', e); process.exit(1) })
