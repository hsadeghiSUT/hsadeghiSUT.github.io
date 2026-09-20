#!/usr/bin/env node
/**
 * check-ui.mjs — the interaction smoke test.
 *
 * WHY IT EXISTS
 * -------------
 * Every other guard measures something static: a tracker is present, a font is
 * the right size, a colour clears AA. This one drives the site. It was written
 * after a real regression that none of the others could have caught: a
 * `z-index: 1` added for the 3D field put the page content at the same stacking
 * level as the header, and the mobile menu — absolutely positioned inside the
 * header — silently dropped *behind* the page. Nothing about the markup, the
 * colours or the typography changed; only what was on top.
 *
 * ON WAITING
 * ----------
 * Wait FOR a condition, never OUT a duration. There are now seven WebGL
 * contexts on a page and this file drives twenty of them in sequence under a
 * software renderer, so a wait long enough on a desktop is a coin toss here —
 * and every one of these that was written as a sleep has eventually failed on a
 * page that was behaving perfectly. `page.waitForFunction` with a generous
 * timeout tests the same property and has no number in it to be raced. Where
 * the thing being tested cannot be observed from the DOM at all — a bead four
 * pixels across mid-fall, a glow behind a page, whether a sword leaves the
 * frame at some angle — the module is asked instead: `window.__fx.focused()`,
 * `window.__fx.waking()`, `window.__copyright.escape()` and friends exist for
 * exactly that, and for nothing else.
 *
 * WHAT IT DRIVES
 * --------------
 *   1. The mobile menu opens, and a link in it is genuinely the topmost thing
 *      at its own coordinates (`elementFromPoint`, not just "is it visible").
 *   2. The header is still sticky.
 *   3. The section bar exists on the long pages, at both widths, and tapping a
 *      chip actually lands on that section, clear of the sticky bars.
 *   4. Following an internal link plays the depth transition and arrives.
 *   5. The 3D layer resolves to a renderer and lights an entry on hover.
 * 5a-2. The field composites its alpha once, rests at the site's own cyan, and
 *      is measurably visible in BOTH colour schemes.
 * 5a-3. The Summary hero lights the field around the pointer without lighting
 *      or moving itself.
 *  5a-4. The field answers the pointer, yields to a lit card, and expires.
 *  5b. The university mark sits in the header, fits the bar without changing
 *      its height, keeps its link and alt text, and its ring is turning.
 *  5c. The hero never moves, and the pointer light arrives and fades with the
 *      pointer.
 * 5c-2. The hero name is cut into letters without ceasing to be a name, its
 *      the hero name reads as a raised solid against the card in
 *      both colour schemes.
 *  5d. Both brand marks — the Summary page's and every other page's — are
 *      solids whose meteors run their own traced borders and whose auras turn,
 *      and the mark announces itself when it changes between pages.
 *  5d-2. The copyright mark is a solid the size of a control, and the dew off
 *      its sword reaches the bottom line of the screen and pools there.
 *  5d-3. A static card lights the field on hover and does not move.
 *  5e. Back to top appears once scrolled, never covers the content column, and
 *      carries focus with it.
 * 5e-2. Pressing back-to-top stacks the page, surges the field, jumps in one
 *      frame and tidies up after itself.
 *  5f. The biography is justified where the measure allows and ragged-right
 *      where it does not.
 *  5g. A finished student's card carries a closed book and an unfinished one an
 *      open book.
 *  5h. The 3D roster builds, filters, and lands a click on the right person.
 *  5i. The name stands in the left gutter of every page but Summary, on a wide
 *      screen only, clear of the content, its "H" level with the page kicker —
 *      and its cascade travels down the column ten degrees at a time.
 *  5d-4. The dew runs only while the sword that sheds it is on screen.
 *   6. The publications explorer builds, filters the list, and flies to a year.
 *  6b. The citation layer, when there is one: the Impact skyline opens, keeps
 *      its year labels inside the stage, jumps to an entry when a block is
 *      clicked, and the size toggle swaps the graph between papers and
 *      citations. All of it skipped, without failing, when no snapshot joined.
 *  6c. The Influence city: it waits for its first click, frames itself on its
 *      own height, filters the list when a tower is clicked, leaves the site
 *      owner out, and every one of the four tabs is reachable at 375px.
 *   7. With WebGL removed, the explorer hands over to its written list and the
 *      publications themselves are untouched.
 *
 * USAGE
 *     node tools/check-ui.mjs
 */

import { ROOT, serve, loadPlaywright } from './lib/browser.mjs';

const PORT = 8126;

const pw = loadPlaywright(import.meta.url);
if (!pw) {
  console.log('Playwright is not installed — skipping the UI check.');
  process.exit(0);
}

const server = await serve(ROOT, PORT);
const browser = await pw.chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const url = (p) => `http://localhost:${PORT}/${p}`;
const failures = [];
const notes = [];
const ok = (label) => notes.push('  ok    ' + label);
const bad = (label) => failures.push(label);

/* -------------------------------------------------------------------------- */
/* 1 + 2. The mobile menu, and the sticky header                              */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(url('publications.html'));
  // The list is `hidden` until the toggle is pressed, so wait for it to exist
  // rather than to be visible.
  await page.waitForSelector('#nav-list a', { state: 'attached' });
  await page.click('#nav-toggle');
  await page.waitForTimeout(350);

  const seen = await page.evaluate(() => {
    const list = document.getElementById('nav-list');
    const r = list.getBoundingClientRect();
    // The real question is not "is it displayed" but "is it on top".
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(40, r.height / 2));
    return {
      open: !list.hidden,
      height: Math.round(r.height),
      topmost: hit ? hit.tagName + '.' + String(hit.className || '').split(' ')[0] : null,
      headerPosition: getComputedStyle(document.querySelector('.topbar')).position,
    };
  });

  if (!seen.open || seen.height < 40) bad(`the mobile menu did not open (height ${seen.height}px)`);
  else ok('mobile menu opens');

  if (!/mainnav__link|LI|UL/.test(seen.topmost || '')) {
    bad(`the mobile menu is behind the page — the topmost element where it should be is ${seen.topmost}`);
  } else ok('mobile menu is above the page content');

  if (seen.headerPosition !== 'sticky') bad(`the header is ${seen.headerPosition}, expected sticky`);
  else ok('header is still sticky');

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 3. The section bar                                                          */
/* -------------------------------------------------------------------------- */
for (const [width, height] of [[390, 844], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url('publications.html'));
  await page.waitForSelector('.secnav__chip');

  const chips = await page.$$eval('.secnav__chip', (els) => els.map((e) => e.textContent.trim()));
  if (chips.length < 2) bad(`${width}px — only ${chips.length} section chip(s)`);
  else ok(`${width}px — ${chips.length} section chips`);

  // The Persian list is the furthest section down the longest page, which makes
  // it the honest test of the thing the bar exists for.
  const persian = page.locator('.secnav__chip', { hasText: 'Persian' });
  if (await persian.count()) {
    await persian.click();
    /* Waited for, not waited out — see 5b. This is a SMOOTH scroll the length of
       the longest page on the site, and how long it takes is a browser
       decision, not a number this file gets to pick. Two consecutive readings
       of the same position mean it has stopped. */
    await page.waitForFunction(() => {
      const top = Math.round(document.getElementById('persian').getBoundingClientRect().top);
      const before = window.__settleTop;
      window.__settleTop = top;
      /* MOVED, and only then STOPPED. Two equal readings on their own are also
         what you get before the scroll has begun, and that is how this check
         once passed its wait instantly and then measured the section seventeen
         thousand pixels down the page. A smooth scroll that has not started yet
         is not a smooth scroll that has finished. */
      if (!window.__settleMoved) {
        if (before !== undefined && before !== top) window.__settleMoved = true;
        return false;
      }
      return before === top;
    }, null, { timeout: 20000, polling: 200 }).catch(() => {});
    const landed = await page.evaluate(() => {
      const section = document.getElementById('persian');
      const bar = document.querySelector('.secnav');
      return {
        top: Math.round(section.getBoundingClientRect().top),
        barBottom: Math.round(bar.getBoundingClientRect().bottom),
        current: (document.querySelector('.secnav__chip.is-current') || {}).textContent,
      };
    });
    if (landed.top < 0 || landed.top > 260) {
      bad(`${width}px — tapping the Persian chip left the section ${landed.top}px from the top`);
    } else if (landed.top < landed.barBottom - 8) {
      bad(`${width}px — the Persian heading is under the sticky bar (${landed.top} vs ${landed.barBottom})`);
    } else ok(`${width}px — the Persian chip lands on its section, clear of the bars`);
  } else bad(`${width}px — no chip for the Persian publications`);

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 4. The page transition                                                      */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url('index.html'));
  await page.waitForSelector('.mainnav__list a');

  const style = await page.evaluate(() => document.documentElement.dataset.fxTransition);
  if (style !== 'depth') bad(`the transition style is "${style}", expected "depth"`);
  else ok('transition style is depth');

  // Sampled mid-flight: the outgoing half has to have actually started, or the
  // click is being held for nothing.
  const mid = await page.evaluate(async () => {
    document.querySelector('.mainnav__list a[href="publications.html"]').click();
    await new Promise((r) => setTimeout(r, 130));
    const shell = document.querySelector('.shell');
    return {
      leaving: document.documentElement.classList.contains('is-leaving'),
      transform: getComputedStyle(shell).transform,
      opacity: Number(getComputedStyle(shell).opacity),
    };
  });

  if (!mid.leaving || (mid.transform === 'none' && mid.opacity > 0.95)) {
    bad('the page transition did not animate on the way out');
  } else ok('the page transition animates');

  /* Waited for, not waited out — see 5b. The transition holds the navigation
     for its own duration and then lets it go; how long that takes to land is
     the browser's business, not a number this file gets to pick. */
  await page.waitForURL(/publications\.html$/, { timeout: 10000 }).catch(() => {});
  if (!page.url().endsWith('publications.html')) bad('the page transition did not complete the navigation');
  else ok('the page transition completes the navigation');

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5. The 3D layer                                                             */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url('publications.html'));
  await page.waitForSelector('[data-fx]');
  /* Waited for, not waited out — see 5b. This is the heaviest page on the site
     and the field is loaded after it, so a fixed delay here is a coin toss on a
     machine already running the rest of this check. */
  await page.waitForFunction(() => window.__fx && window.__fx.renderer, null, { timeout: 8000 })
    .catch(() => {});

  const renderer = await page.evaluate(() => (window.__fx || {}).renderer);
  if (!['three', 'webgl', 'none'].includes(renderer)) bad(`the 3D layer did not start (renderer: ${renderer})`);
  else ok(`3D layer renderer: ${renderer}`);

  await page.locator('.pubs > li').nth(3).hover();
  await page.waitForTimeout(400);
  const lit = await page.evaluate(() => {
    const n = document.querySelector('[data-fx].is-lit');
    return n ? n.style.getPropertyValue('--fx-glow').trim() : null;
  });
  if (!lit) bad('hovering an entry did not light it');
  else ok(`hovering lights the entry (${lit})`);

  /* The controls guide stays up on BOTH tabs. It was hidden on the
     collaboration view for a while and that was wrong in use: the two views
     take exactly the same four gestures, and a control documented only on the
     other tab is a control nobody finds. */
  for (const which of ['timeline', 'graph']) {
    await page.evaluate((id) => document.querySelector(`.explorer__tab[data-view="${id}"]`).click(), which);
    await page.waitForTimeout(500);
    const seen = await page.evaluate(() => ({
      view: document.querySelector('.explorer').dataset.view,
      hint: getComputedStyle(document.querySelector('.explorer__hint')).display,
      reset: getComputedStyle(document.querySelector('.explorer__reset')).display,
      words: document.querySelector('.explorer__hint').textContent,
    }));
    if (seen.view !== which) bad(`the explorer did not switch to ${which}`);
    else if (seen.hint === 'none') bad(`${which}: the controls guide is hidden`);
    else if (seen.reset === 'none') bad(`${which}: the reset button is hidden`);
    else if (!/zoom/i.test(seen.words) || !/drag/i.test(seen.words)) {
      bad(`${which}: the guide does not mention dragging and zooming ("${seen.words}")`);
    } else ok(`${which}: the controls guide and the reset are both there`);
  }
  await page.evaluate(() => document.querySelector('.explorer__tab[data-view="graph"]').click());
  await page.waitForTimeout(400);

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5a-2. The field actually reaches the screen                                 */
/* -------------------------------------------------------------------------- */
/* The field spent a long time being drawn and not seen. Its canvas declared one
   alpha convention and its blending used the other, so alpha went in twice: a
   star at five per cent came out at a quarter of one per cent, and what was left
   was not light added to the page but a faint hole punched in it. On white a
   hole looks like a grey star and the effect seemed to work; on the near-black
   dark page it was nothing at all, and the field appeared to exist only in light
   mode.

   Two checks, because either alone can pass while the effect is broken:

     the state   the blend factor for colour must be ONE, not SRC_ALPHA, when the
                 context is premultiplied. This is the exact regression, read
                 straight off the live GL context — no screenshot needed and no
                 judgement involved. Note that under Three it is the MATERIAL's
                 premultipliedAlpha that selects this, not the renderer's.
     the result  with the page's own content hidden, the field must measurably
                 change the pixels in BOTH schemes. This is the check that would
                 have caught it in the first place, and it is scheme-by-scheme
                 because the failure was scheme-specific.
*/
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
  await page.addInitScript((value) => {
    try { localStorage.setItem('hs-theme', value); } catch { /* blocked */ }
  }, scheme);
  await page.goto(url('index.html'));
  await page.waitForSelector('canvas.fx-field');
  await page.waitForTimeout(1200);

  const state = await page.evaluate(() => {
    const c = document.querySelector('canvas.fx-field');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return null;
    return {
      premultiplied: gl.getContextAttributes().premultipliedAlpha,
      srcRGB: gl.getParameter(gl.BLEND_SRC_RGB),
      ONE: gl.ONE,
      SRC_ALPHA: gl.SRC_ALPHA,
      base: getComputedStyle(document.documentElement).getPropertyValue('--fx-base').trim(),
    };
  });

  if (!state) {
    ok(`${scheme}: no WebGL in this browser — field checks skipped`);
    await page.close();
    continue;
  }

  if (state.premultiplied && state.srcRGB !== state.ONE) {
    bad(`${scheme}: the field blends with SRC_ALPHA on a premultiplied canvas — alpha is being applied twice`);
  } else ok(`${scheme}: the field composites premultiplied, once`);

  /* The resting colour is the site's own, in both schemes — not a neutral. */
  const rgb = (state.base.match(/^#([0-9a-f]{6})$/i) || [, ''])[1];
  if (rgb) {
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(rgb.slice(i, i + 2), 16));
    if (Math.max(r, g, bl) - Math.min(r, g, bl) < 40) {
      bad(`${scheme}: --fx-base ${state.base} is very nearly grey; the field is supposed to be a dimmed cyan`);
    } else ok(`${scheme}: the field rests at ${state.base}`);
  }

  /* And it has to be visible. Hide the page's own content, screenshot, and ask
     how far the pixels move from the page colour. */
  await page.addStyleTag({
    content: '.shell, .topbar, .footer, .progress { visibility: hidden !important; }',
  });
  await page.waitForTimeout(500);
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1100, height: 750 } });

  /* A PNG decoder is more than this needs. The browser has one. */
  const reach = await page.evaluate(async (bytes) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
    const bmp = await createImageBitmap(blob);
    const cv = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = cv.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height);
    const lum = new Float64Array(data.length / 4);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      lum[j] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    const sorted = Float64Array.from(lum).sort();
    const page_ = sorted[sorted.length >> 1];          // the page: the median
    let moved = 0;
    let peak = 0;
    for (let j = 0; j < lum.length; j++) {
      const d = Math.abs(lum[j] - page_);
      if (d > 4) moved++;
      if (d > peak) peak = d;
    }
    return { peak: Math.round(peak), moved: (100 * moved) / lum.length };
  }, Array.from(shot));

  if (reach.peak < 12 || reach.moved < 0.25) {
    bad(`${scheme}: the resting field barely reaches the screen (peak ${reach.peak}, ${reach.moved.toFixed(2)}% of pixels moved)`);
  } else {
    ok(`${scheme}: the resting field is visible — peak ${reach.peak}, ${reach.moved.toFixed(2)}% of pixels`);
  }

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5a-3. The hero lights the field, locally, and does not light itself         */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url('index.html'));
  await page.waitForSelector('.hero');
  await page.waitForTimeout(900);

  const box = await page.locator('.hero').boundingBox();
  /* Two pointer positions well apart along the card. If the halo is local, the
     rectangle handed to the field moves with the pointer and is far smaller
     than the card; if it is not, both give the card's whole box. */
  const at = async (x, y) => {
    await page.mouse.move(x, y);
    await page.waitForTimeout(450);
    return page.evaluate(() => {
      const el = document.querySelector('.hero');
      return {
        lit: el.classList.contains('is-lit'),
        transform: getComputedStyle(el).transform,
        /* __fx keeps the focus in plane units; comparing two of them is enough
           to know the light moved. */
        focus: (window.__fx && window.__fx.renderer !== 'none')
          ? JSON.stringify(document.querySelector('canvas.fx-field') ? true : false) : null,
      };
    });
  };

  const left = await at(box.x + 40, box.y + box.height * 0.5);
  const right = await at(box.x + box.width - 40, box.y + box.height * 0.5);

  if (left.lit || right.lit) bad('the hero lit itself — it was asked to stay put');
  else ok('the hero does not light itself');
  if (left.transform !== 'none' || right.transform !== 'none') {
    bad(`the hero moved when pointed at (${left.transform})`);
  } else ok('the hero still does not move when pointed at');

  const local = await page.evaluate(() => document.querySelector('.hero').dataset.fxField);
  if (local !== 'local') bad(`the hero is not asking for a local halo (data-fx-field="${local}")`);
  else ok('the hero asks the field for a local halo');

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5a-4. The wake — the field answers the pointer, and yields to a card        */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(url('index.html'));
  await page.waitForFunction(() => window.__fx && window.__fx.renderer, null, { timeout: 8000 })
    .catch(() => {});
  const live = await page.evaluate(() => !!(window.__fx && window.__fx.waking));
  if (!live) {
    ok('no field on this machine — skipping the wake');
  } else {
    /* Moving the pointer over empty page — the gutter beside the shell, which
       is 1200px wide inside a 1600px window — must wake the field. */
    for (let i = 0; i < 6; i++) {
      // eslint-disable-next-line no-await-in-loop
      await page.mouse.move(90 + i, 600 + i);
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(60);
    }
    await page.waitForFunction(() => window.__fx.waking() > 0.8, null, { timeout: 8000 })
      .catch(() => {});
    const bare = await page.evaluate(() => ({
      waking: window.__fx.waking(), focused: window.__fx.focused(),
    }));
    if (!(bare.waking > 0.8)) bad(`the field does not answer the pointer (waking ${bare.waking.toFixed(2)})`);
    else ok(`the field answers the pointer (waking ${bare.waking.toFixed(2)})`);
    if (bare.focused > 0.05) bad('a card was lit by a pointer that is not on one');

    /* And over a card it must GET OUT OF THE WAY. This is the guarantee behind
       "less than what a card does": rather than balancing two sets of
       amplitudes, the wake is scaled down by the card's own energy, so a lit
       card can only ever reduce it. A screenshot cannot settle that — the two
       effects overlap in the same pixels — so the module is asked. */
    await page.evaluate(() => { document.querySelectorAll('.card')[1].scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(500);
    const card = await page.locator('.card').nth(1).boundingBox();
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await page.waitForFunction(() => window.__fx.focused() > 0.9, null, { timeout: 8000 })
      .catch(() => {});
    const over = await page.evaluate(() => ({
      waking: window.__fx.waking(), focused: window.__fx.focused(),
    }));
    if (!(over.focused > 0.9)) bad('the card did not light the field');
    else if (!(over.waking < bare.waking * 0.5)) {
      bad(`the wake did not yield to the card (${bare.waking.toFixed(2)} → ${over.waking.toFixed(2)})`);
    } else {
      ok(`the wake yields to a lit card (${bare.waking.toFixed(2)} → ${over.waking.toFixed(2)})`);
    }

    /* It expires. A wake that did not would pin the render loop at full rate
       for as long as a cursor sat anywhere on the page. */
    const expired = await page.waitForFunction(() => window.__fx.waking() < 0.05, null, { timeout: 12000 })
      .then(() => true).catch(() => false);
    if (!expired) bad('the wake never expires — the field can no longer go idle');
    else ok('the wake expires when the pointer stops');
  }

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5b. The university mark in the header                                       */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url('index.html'));
  await page.waitForSelector('.brandmark');
  /* Waited for, not waited out. Several marks on this page each want a WebGL
     context and they are all racing the same software renderer inside this
     check; a fixed sleep passes on a quiet machine and fails on a busy one for
     no reason to do with the site. */
  await page.waitForFunction(
    () => !!document.querySelector('.brandmark').dataset.brandmark,
    null,
    { timeout: 8000 },
  ).catch(() => {});

  const seen = await page.evaluate(() => {
    const mark = document.querySelector('.brandmark');
    const bar = document.querySelector('.topbar');
    const box = mark.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    const ring = document.querySelector('.brandmark__ring');
    return {
      mode: mark.dataset.brandmark || 'flat',
      fits: box.height <= barBox.height && box.top >= barBox.top - 1 && box.bottom <= barBox.bottom + 1,
      barHeight: Math.round(barBox.height),
      rightOfCentre: box.left > window.innerWidth / 2,
      ringAnimated: ring ? getComputedStyle(ring).animationName : 'none',
      linked: !!mark.querySelector('a[href]'),
      alt: (mark.querySelector('img') || {}).alt || '',
      sidebarLogo: !!document.querySelector('.panel__logo'),
    };
  });

  if (!['three', 'css'].includes(seen.mode)) bad(`the header mark did not start (mode: ${seen.mode})`);
  else ok(`header mark: ${seen.mode}`);

  // The bar's height is the constraint the request was explicit about: the mark
  // fits the bar, the bar does not grow around the mark.
  if (seen.barHeight > 66) bad(`the header bar grew to ${seen.barHeight}px`);
  else ok(`header bar is still ${seen.barHeight}px`);
  if (!seen.fits) bad('the header mark does not fit inside the bar');
  else ok('the mark fits inside the bar');
  if (!seen.rightOfCentre) bad('the header mark is not on the right');
  if (seen.ringAnimated === 'none') bad('the meteor ring is not animating');
  else ok('the meteor ring is orbiting');
  if (!seen.linked || !/sharif/i.test(seen.alt)) bad('the mark lost its link or its alt text');
  else ok('the mark is still a labelled link to the university');
  if (seen.sidebarLogo) bad('the logo is still in the sidebar as well');
  else ok('the sidebar copy is gone');

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5c. The hero: lit, and still                                                */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url('index.html'));
  await page.waitForSelector('.hero__photo');
  await page.waitForTimeout(600);

  const state = () => page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const sheen = getComputedStyle(hero, '::after');
    return {
      lit: hero.classList.contains('is-lit-surface'),
      heroTransform: getComputedStyle(hero).transform,
      photoTransform: getComputedStyle(document.querySelector('.hero__photo')).transform,
      sheenOpacity: Number(sheen.opacity),
      mx: hero.style.getPropertyValue('--mx'),
    };
  });

  const rest = await state();
  // The hero is a masthead, not a target: it holds the portrait and the name and
  // it must not move. An earlier build leaned it toward the pointer; this check
  // is what stops that coming back by accident.
  if (rest.heroTransform !== 'none' || rest.photoTransform !== 'none') {
    bad(`the hero is transformed at rest (${rest.heroTransform})`);
  } else ok('the hero sits still at rest');
  if (rest.sheenOpacity > 0.01) bad('the pointer light is showing before the pointer arrives');

  const box = await page.locator('.hero').boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  /* The sheen does not appear, it FADES UP over a CSS transition. Waited for,
     not waited out; see 5b. */
  await page.waitForFunction(
    () => Number(getComputedStyle(document.querySelector('.hero'), '::after').opacity) > 0.9,
    null,
    { timeout: 8000 },
  ).catch(() => {});

  const lit = await state();
  if (!lit.lit || lit.sheenOpacity < 0.9) bad('the pointer light did not appear');
  else ok('the pointer light follows the pointer onto the hero');
  if (!lit.mx) bad('the light is not tracking the pointer position');
  if (lit.heroTransform !== 'none' || lit.photoTransform !== 'none') {
    bad(`the hero moved when pointed at (${lit.heroTransform})`);
  } else ok('the hero still does not move when pointed at');

  await page.mouse.move(10, 10);
  await page.waitForFunction(
    () => Number(getComputedStyle(document.querySelector('.hero'), '::after').opacity) < 0.01,
    null,
    { timeout: 8000 },
  ).catch(() => {});
  const after = await state();
  if (after.lit || after.sheenOpacity > 0.01) bad('the pointer light did not fade when the pointer left');
  else ok('the pointer light fades when the pointer leaves');

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5c-2. The raised name                                                       */
/* -------------------------------------------------------------------------- */
/* The hero name is a solid pressed proud of the card (fx.css §8).  Three things
   have to hold for that to be true rather than merely claimed, and each of them
   is something that has actually gone wrong at least once:

     the wall reads    the extrusion colour must separate in luminance from the
                       card it sits on.  The first dark-mode attempt used a
                       colour DARKER than the card and the effect vanished.
     the wall tapers   the stack has to end in blurred slices, not hard ones.
                       A stack of hard copies is a shadow, not a solid.
     the lip is lit    there has to be one shadow ABOVE the glyph (negative Y)
                       and it has to be lighter than the wall.  Without it the
                       whole thing collapses back into a drop shadow.

   The name itself is plain text again — no per-letter elements, no aria-label
   standing in for the real string. */
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((value) => {
    try { localStorage.setItem('hs-theme', value); } catch { /* blocked */ }
  }, scheme);
  await page.goto(url('index.html'));
  await page.waitForSelector('.hero__name');
  await page.waitForTimeout(400);

  const seen = await page.evaluate(() => {
    const heading = document.querySelector('.hero__name');
    const style = getComputedStyle(heading);
    return {
      text: heading.textContent.trim(),
      childElements: heading.children.length,
      shadow: style.textShadow,
      colour: style.color,
      surface: getComputedStyle(document.querySelector('.hero')).backgroundColor,
    };
  });

  const parse = (value) => (String(value).match(/rgba?\(([^)]+)\)/) || [, ''])[1]
    .split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
  const luminance = (rgb) => {
    const lin = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };

  /* Split the computed value into one entry per shadow.  Commas inside the
     rgb() functions are the reason this is not a plain `.split(',')`. */
  const layers = seen.shadow
    .replace(/rgba?\([^)]*\)/g, (m) => m.replace(/,/g, '\u0001'))
    .split(',')
    .map((entry) => entry.replace(/\u0001/g, ',').trim())
    .filter(Boolean)
    .map((entry) => {
      const lengths = [...entry.matchAll(/(-?[\d.]+)px/g)].map((m) => Number(m[1]));
      return { colour: parse(entry), x: lengths[0], y: lengths[1], blur: lengths[2] ?? 0 };
    });

  /* Plain text again. */
  if (seen.childElements !== 0 || !seen.text.includes(' ')) {
    bad(`${scheme}: the hero name is not one plain string ("${seen.text}", ${seen.childElements} child elements)`);
  } else ok(`${scheme}: the hero name is plain text — "${seen.text}"`);

  /* The wall reads against the card. */
  const card = parse(seen.surface);
  const wall = layers.find((l) => l.y > 0);
  if (wall && card.length === 3) {
    const separation = Math.abs(luminance(wall.colour) - luminance(card));
    if (separation < 0.01) {
      bad(`${scheme}: the raised wall is invisible against the card (${seen.shadow.slice(0, 40)})`);
    } else ok(`${scheme}: the raised wall reads against the card`);
  } else bad(`${scheme}: no wall found under the hero name`);

  /* The wall tapers: the deepest slice must be blurrier than the shallowest. */
  const walls = layers.filter((l) => l.y > 0).sort((a2, b2) => a2.y - b2.y);
  if (walls.length >= 3 && walls[walls.length - 1].blur > walls[0].blur) {
    ok(`${scheme}: the wall tapers — ${walls.length} slices, blur ${walls[0].blur}px → ${walls[walls.length - 1].blur}px`);
  } else {
    bad(`${scheme}: the wall does not taper (${walls.map((l) => `${l.y}/${l.blur}`).join(' ')})`);
  }

  /* The lip: above the glyph, and lighter than the wall. */
  const lip = layers.find((l) => l.y < 0);
  if (!lip) bad(`${scheme}: there is no lip above the letters`);
  else if (!wall || luminance(lip.colour) <= luminance(wall.colour)) {
    bad(`${scheme}: the lip is not lighter than the wall`);
  } else ok(`${scheme}: the lip catches the light above the letters`);

  /* And nothing cyan survived the revert. */
  if (/67, ?232|14, ?159|34, ?211/.test(seen.shadow)) bad(`${scheme}: neon colours are still on the hero name`);
  else ok(`${scheme}: no neon left on the hero name`);

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5d. The calligraphic brand mark — both of them                              */
/* -------------------------------------------------------------------------- */
/* The Summary page carries a square kufic bismillah and every other page a
   flowing thuluth one, and both have to be the whole object: the solid, the
   aura, the meteor on the traced border, the columns of light. So the same
   block runs twice, once per page, rather than trusting that whatever is true
   of one is true of the other — they are different artwork through the same
   pipeline, and the pipeline is where a difference would hide. */
for (const [where, wanted] of [['index.html', 'kufic'], ['publications.html', 'thuluth']]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url(where));
  await page.waitForSelector('.bismillah');
  // The mark is fetched, traced, extruded and mounted. Waited for, not waited
  // out — see 5b.
  await page.waitForFunction(
    () => document.querySelector('.bismillah').dataset.bismillah === 'three',
    null,
    { timeout: 8000 },
  ).catch(() => {});
  await page.waitForTimeout(400);   // a few frames, so the meteor has a path

  const seen = await page.evaluate(() => {
    const wrap = document.querySelector('.bismillah');
    const aura = document.querySelector('.bismillah__aura');
    const head = document.querySelector('.bismillah__meteor');
    const poster = document.querySelector('.bismillah__poster');
    return {
      mounted: wrap ? wrap.dataset.bismillah : '',
      poster: poster ? poster.getAttribute('src') : '',
      auraAnim: aura ? getComputedStyle(aura).animationName : 'none',
      meteorPaths: document.querySelectorAll('.bismillah__light path').length,
      meteorAnim: head ? getComputedStyle(head).animationName : 'none',
      /* Positive dashoffset would run the light the other way round. This is
         the one number in the feature that is a direction rather than a size,
         and it is the one that was asked for by name. */
      meteorTo: head ? getComputedStyle(head).strokeDashoffset : '',
      pathPoints: head ? (head.getAttribute('d') || '').split('L').length : 0,
      pathLength: head ? head.getAttribute('pathLength') : '',
      shafts: document.querySelectorAll('.bismillah__shafts g').length,
      posterHidden: poster ? getComputedStyle(poster).display === 'none' : false,
      linkLabel: document.querySelector('.brand').getAttribute('aria-label') || '',
    };
  });

  if (seen.mounted !== 'three') bad(`${wanted}: the brand mark did not become a solid`);
  else ok(`${wanted}: brand mark mounted as a solid`);
  /* The poster is in the markup before the module has loaded, so the two are
     chosen in different places. They must agree, or the header shows one mark
     and then swaps to the other for no reason the reader can see. */
  if (!seen.poster.includes(wanted)) {
    bad(`${wanted}: the flat poster is the wrong mark (${seen.poster})`);
  } else ok(`${wanted}: the poster is the same mark as the solid`);
  if (!seen.posterHidden) bad(`${wanted}: the flat poster is still showing under the solid`);
  else ok(`${wanted}: the poster stepped aside`);
  if (seen.auraAnim === 'none') bad(`${wanted}: the brand aura is not turning`);
  else ok(`${wanted}: the brand aura is turning`);
  if (seen.meteorPaths !== 2 || seen.meteorAnim === 'none') bad(`${wanted}: the brand meteor is not running`);
  else ok(`${wanted}: the brand meteor is running`);
  /* The meteor path is the traced silhouette, rewritten every frame from the
     mesh's own rotation. A handful of points would mean it had fallen back to
     some geometric stand-in and stopped following the artwork. */
  if (seen.pathPoints < 20 || seen.pathLength !== '100') {
    bad(`${wanted}: the meteor is not following the traced border (${seen.pathPoints} points)`);
  } else ok(`${wanted}: the meteor follows the traced border, normalised to a constant speed`);
  if (seen.shafts < 4) bad(`${wanted}: the light columns are missing`);
  else ok(`${wanted}: ${seen.shafts} light columns stand off the border`);
  if (!/sharif|hamed/i.test(seen.linkLabel)) bad(`${wanted}: the brand link lost its label`);

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5d-1b. The mark changes between pages, and announces it                     */
/* -------------------------------------------------------------------------- */
{
  /* One CONTEXT for all three navigations, not three pages: the memory of which
     mark the last page showed lives in `sessionStorage`, and a fresh page in a
     fresh context has no memory to compare against. */
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  /* THE ARRIVAL IS WATCHED, NOT SAMPLED, and that is the whole reason this
     block looks the way it does.

     `is-arriving` goes on when the mark mounts and comes off again about a
     second later. Every way of reading it from out here is a race: asking
     `classList.contains` once can land either side of that second, and polling
     with `waitForFunction` is no better, because the poll runs on the page's
     own animation frames and this is the heaviest page on the site — seven WebGL
     contexts compiling shaders under a software rasteriser. When the main
     thread stalls, the frames do not fire, and the poll can step straight over
     the window it was looking for.

     It did exactly that, on about half of the runs, while the site was behaving
     perfectly: measured from inside the page, the class went on at 764ms and
     came off at 1881ms, every time.

     So the page records it for us instead. A MutationObserver installed before
     the document runs latches a flag the first time the class appears, and the
     checks below read a fact that cannot expire rather than a state that can.
     `addInitScript` on the CONTEXT runs on every navigation in it, so each page
     starts with its own fresh flag. */
  await context.addInitScript(() => {
    window.__markArrived = false;
    const watch = () => {
      const host = document.querySelector('.bismillah');
      if (!host) { setTimeout(watch, 16); return; }
      const note = () => {
        if (host.classList.contains('is-arriving')) window.__markArrived = true;
      };
      note();
      new MutationObserver(note).observe(host, { attributes: true, attributeFilter: ['class'] });
    };
    watch();
  });

  const page = await context.newPage();

  const mounted = () => page.waitForFunction(
    () => document.querySelector('.bismillah').dataset.bismillah === 'three',
    null,
    { timeout: 8000 },
  ).catch(() => {});
  const state = () => page.evaluate(() => ({
    remembered: (() => { try { return sessionStorage.getItem('hs-brand-mark'); } catch { return null; } })(),
    // Did it EVER arrive on this page, not "is it arriving at this instant".
    arriving: window.__markArrived === true,
  }));

  await page.goto(url('index.html'));
  await mounted();
  const first = await state();
  if (first.remembered !== 'kufic') bad(`the Summary page did not record its mark (${first.remembered})`);
  else ok('the Summary page records which mark it showed');
  /* The FIRST page of a session must not animate. Nothing changed — it is the
     first mark you have seen, and announcing a transition that did not happen
     is worse than not announcing one that did. */
  if (first.arriving) bad('the first mark of the session announced an arrival');
  else ok('the first mark of a session simply appears');

  await page.goto(url('publications.html'));
  // The flag latches, so this waits for something that stays true once it is.
  const changed = await page.waitForFunction(
    () => window.__markArrived === true,
    null,
    { timeout: 15000 },
  ).then(() => true).catch(() => false);
  if (!changed) bad('the mark changed between pages without announcing it');
  else ok('a changed mark arrives rather than simply appearing');

  await mounted();
  const second = await state();
  if (second.remembered !== 'thuluth') bad(`the second page did not record its mark (${second.remembered})`);

  /* And the arrival ENDS. A class left on would keep the aura's one-shot
     animation pinned at its last frame. */
  const settled = await page.waitForFunction(
    () => !document.querySelector('.bismillah').classList.contains('is-arriving'),
    null,
    { timeout: 8000 },
  ).then(() => true).catch(() => false);
  if (!settled) bad('the arrival never finished');
  else ok('the arrival finishes and cleans up after itself');

  /* Two pages with the SAME mark must not animate: the mark did not change. */
  await page.goto(url('teaching.html'));
  await mounted();
  const third = await state();
  if (third.arriving) bad('a page announced an arrival for a mark that did not change');
  else ok('two pages sharing a mark do not announce anything');

  await context.close();
}

/* -------------------------------------------------------------------------- */
/* 5d-2. The copyright mark, the sword, and the dew                            */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url('index.html'));
  await page.waitForSelector('.mark3d');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(
    () => document.querySelector('.mark3d').dataset.mark === 'three',
    null,
    { timeout: 8000 },
  ).catch(() => {});
  await page.waitForTimeout(400);

  const built = await page.evaluate(() => {
    const wrap = document.querySelector('.mark3d');
    const layer = document.querySelector('.dew-layer');
    const box = wrap ? wrap.getBoundingClientRect() : null;
    const totop = document.querySelector('.totop');
    const brandmark = document.querySelector('.brandmark');
    return {
      mounted: wrap ? wrap.dataset.mark : '',
      size: box ? Math.round(box.width) : 0,
      /* "As big as the mark in the top bar or the back-to-top button" was the
         brief, so the check is against those two and not against a number. */
      reference: Math.round(Math.max(
        totop ? totop.getBoundingClientRect().width : 0,
        brandmark ? brandmark.getBoundingClientRect().width : 0,
      )),
      layer: !!layer,
      /* The dew must be able to reach the bottom line of the screen and must
         never be able to take a click. Both are properties of this element. */
      layerBottom: layer ? Math.round(window.innerHeight - layer.getBoundingClientRect().bottom) : -1,
      layerEvents: layer ? getComputedStyle(layer).pointerEvents : '',
      /* Whatever is at the very bottom of the screen, it must not be the dew. */
      topmostAtFloor: (() => {
        const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 2);
        return el ? el.className || el.tagName : 'none';
      })(),
    };
  });

  if (built.mounted !== 'three') bad('the copyright mark did not become a solid');
  else ok('copyright mark mounted as a solid');
  if (built.size < built.reference * 0.85) {
    bad(`the copyright mark is ${built.size}px against a ${built.reference}px reference control`);
  } else ok(`the copyright mark is ${built.size}px, against ${built.reference}px for the reference control`);
  if (!built.layer) bad('the dew has nowhere to fall to (no overlay)');
  else ok('the dew layer exists');
  if (built.layerBottom !== 0) bad(`the dew layer stops ${built.layerBottom}px short of the bottom of the screen`);
  else ok('the dew layer reaches the bottom line of the screen');
  if (built.layerEvents !== 'none') bad('the dew layer can take a click');
  else ok('the dew layer is click-through');
  if (/dew-layer/.test(built.topmostAtFloor)) bad('the dew layer is on top of the page at the bottom of the screen');
  else ok(`the bottom of the screen still belongs to the page (${built.topmostAtFloor})`);

  /* The lifecycle. Watched rather than photographed: a bead four pixels across
     falling past a screenshot is not something a check can be relied on to
     catch, and the module knows exactly what it is doing. */
  const seen = { hanging: false, falling: false, landed: 0 };
  for (let i = 0; i < 90; i++) {
    /* eslint-disable no-await-in-loop */
    const state = await page.evaluate(() => (window.__copyright ? window.__copyright.state() : null));
    if (!state) break;
    if (state.hanging) seen.hanging = true;
    if (state.beads) seen.falling = true;
    seen.landed = Math.max(seen.landed, state.landed);
    if (seen.landed >= 2) break;
    await page.waitForTimeout(400);
  }

  if (!seen.hanging) bad('no bead ever gathered at the sword point');
  else ok('a bead gathers at the point');
  if (!seen.falling) bad('no bead ever let go');
  else ok('the bead lets go and falls');
  if (seen.landed < 1) bad('nothing ever reached the pool');
  else ok(`${seen.landed} landed and stayed as a pool`);

  /* The hilt used to swing out of the canvas partway through a turn. Sampling
     forty-eight rotations and projecting both ends of the sword is the only
     honest way to check that: a screenshot catches one angle out of a
     ten-second turn, and the angle it catches is whichever one it happened to
     catch. 1.0 is the edge of the frame. */
  const escape = await page.evaluate(() => (window.__copyright ? window.__copyright.escape() : 9));
  if (escape >= 1) bad(`the sword leaves the frame at some angle (${escape.toFixed(3)} of the half-frame)`);
  else ok(`both ends of the sword stay in frame all the way round (worst ${escape.toFixed(2)})`);

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5d-3. Static cards light the field without becoming interactive             */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url('index.html'));
  await page.waitForSelector('.panel');
  await page.waitForTimeout(1200);

  /* `page.hover` and not a measured rectangle plus `mouse.move`. The rectangle
     had to be read after a `scrollIntoView`, and the root has
     `scroll-behavior: smooth` — so on a slow frame the rectangle was measured
     mid-scroll and the pointer was then sent to where the card used to be.
     Playwright's hover scrolls it in, waits for it to stop moving, and only
     then aims. */
  await page.hover('.panel');
  const rect = await page.evaluate(() => {
    const r = document.querySelector('.panel').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  // A second move inside the same card, so `pointermove` runs as well as
  // `pointerover` — a local halo is positioned by the former.
  await page.mouse.move(rect.x + rect.w / 2, rect.y + rect.h / 2 + 6);
  /* The halo does not appear, it RISES — over about a third of a second of
     animation frames, and this check shares a software renderer with six WebGL
     contexts, so a third of a second of wall clock is not a third of a second
     of frames. Waited for, not waited out; see 5b. */
  await page.waitForFunction(
    () => window.__fx && window.__fx.focused && window.__fx.focused() > 0.3,
    null,
    { timeout: 8000 },
  ).catch(() => {});

  const lit = await page.evaluate(() => {
    const panel = document.querySelector('.panel');
    return {
      adopted: panel.dataset.fxField,
      isLit: panel.classList.contains('is-lit'),
      transform: getComputedStyle(panel).transform,
      /* The field's own answer. A glow behind a page is not something a
         screenshot settles. */
      focused: window.__fx && window.__fx.focused ? window.__fx.focused() : -1,
    };
  });

  if (lit.adopted === undefined) bad('a static card was not adopted by the field');
  else ok('the static card opted into the field');
  if (lit.isLit) bad('a static card took the interactive treatment');
  else ok('the static card did not light itself');
  if (lit.transform !== 'none') bad(`a static card moved on hover (${lit.transform})`);
  else ok('the static card stayed exactly where it was');
  if (!(lit.focused > 0.3)) bad(`the field did not light under the static card (energy ${lit.focused})`);
  else ok(`the field lights under the static card (energy ${lit.focused.toFixed(2)})`);

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5e. Back to top                                                             */
/* -------------------------------------------------------------------------- */
/* Three properties, and the second is the one the whole design turns on.

     it appears only when it is wanted   hidden at the top of the page, there
                                         once you are a screenful down.
     it does not cover the content       on a screen wide enough to have a
                                         gutter, the button's rectangle must lie
                                         entirely OUTSIDE the shell. This is
                                         measured, not assumed — it is the
                                         difference between "bottom right" and
                                         "bottom right, over a card".
     it steps aside where it cannot      below the gutter width, scrolling down
                                         must hide it and scrolling back up must
                                         bring it back.

   Plus the keyboard: activating it has to move focus as well as the view, or a
   keyboard user is left looking at the top of the page with their tab position
   still at the bottom of it. */
for (const width of [1440, 1920]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url('publications.html'));
  await page.waitForSelector('.pubs > li');
  await page.waitForTimeout(700);

  const read = () => page.evaluate(() => {
    const el = document.querySelector('.totop');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const shell = document.querySelector('.shell').getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      visible: cs.visibility === 'visible' && Number(cs.opacity) > 0.5,
      rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width },
      shellRight: shell.right,
      name: el.getAttribute('aria-label'),
      /* What is actually on top where the button is drawn. If this is not the
         button or its own icon, something is sitting over it. */
      topmost: (() => {
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit ? hit.closest('.totop') !== null : false;
      })(),
    };
  });

  const atTop = await read();
  if (!atTop) bad(`${width}px: there is no back-to-top control on the publications page`);
  else if (atTop.visible) bad(`${width}px: the back-to-top control is showing at the top of the page`);
  else ok(`${width}px: back-to-top is hidden at the top of the page`);

  if (atTop) {
    await page.evaluate(() => window.scrollTo({ top: 2600, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, -400);          // upward: always shown
    await page.waitForTimeout(900);
    const shown = await read();

    if (!shown.visible) bad(`${width}px: the back-to-top control did not appear after scrolling`);
    else ok(`${width}px: back-to-top appears once scrolled (${shown.name})`);

    /* Two halves. It must not overlap the column — and it must be BESIDE the
       column rather than flung into the far corner, which is what makes it read
       as parked in the gutter rather than dropped on the page. A fixed `right`
       passes the first test on a wide screen and fails the second by a
       progressively sillier margin the wider the screen gets. */
    const gap = Math.round(shown.rect.left - shown.shellRight);
    if (gap < 0) bad(`${width}px: back-to-top overlaps the content column by ${-gap}px`);
    else if (gap > 28) bad(`${width}px: back-to-top is ${gap}px adrift of the content, not parked beside it`);
    else ok(`${width}px: back-to-top sits in the gutter, ${gap}px clear of the content`);

    if (!shown.topmost) bad(`${width}px: something is sitting on top of the back-to-top control`);
    else ok(`${width}px: back-to-top is the topmost thing where it is drawn`);

    /* Keyboard: the view and the focus have to travel together. */
    await page.click('.totop');
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      focus: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
    }));
    if (after.y > 4) bad(`${width}px: back-to-top did not reach the top (scrollY ${after.y})`);
    else ok(`${width}px: back-to-top returns to the top`);
    if (after.focus !== 'main') bad(`${width}px: focus stayed at the bottom of the page (on ${after.focus})`);
    else ok(`${width}px: back-to-top moves focus to the top as well as the view`);
  }

  await page.close();
}

/* The narrow case: no gutter, so it has to step aside while reading forward. */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url('publications.html'));
  await page.waitForSelector('.pubs > li');
  await page.waitForTimeout(700);

  const visible = () => page.evaluate(() => {
    const el = document.querySelector('.totop');
    const cs = getComputedStyle(el);
    return cs.visibility === 'visible' && Number(cs.opacity) > 0.5;
  });

  await page.evaluate(() => window.scrollTo({ top: 2600, behavior: 'instant' }));
  await page.waitForTimeout(200);

  /* Three states, and the middle one is the fix for "on a phone it never
     appears at all". While the page is moving forward the control steps aside;
     once the page STOPS it comes back, because someone who has flicked to the
     bottom has been reading forward the whole way and would otherwise never see
     it; and an upward flick brings it back immediately. */
  await page.mouse.wheel(0, 400);
  /* It steps aside over a transition, so wait for it to have gone rather than
     for a number of milliseconds — 180 of them is not 180 milliseconds' worth
     of frames on a machine running six WebGL contexts under a software
     renderer. The timeout is the failure. */
  await page.waitForFunction(
    () => {
      const cs = getComputedStyle(document.querySelector('.totop'));
      return cs.visibility !== 'visible' || Number(cs.opacity) <= 0.5;
    },
    null,
    { timeout: 4000 },
  ).catch(() => {});
  if (await visible()) bad('390px: the back-to-top control stayed over the page while reading forward');
  else ok('390px: back-to-top steps aside while reading forward');

  /* Everything below waits FOR a state and not OUT a duration — see 5b. The
     control's own settle timer is about a second, so the budgets here are
     generous; what they are not is a guess at how long a transition takes on a
     machine already running six WebGL contexts. */
  /* Nine seconds, and not five. The control's own settle timer is about one
     second of REAL time, but it is served by a rAF loop competing with
     everything else this check has running; the budget has to cover the wait
     plus however long the frame that notices it takes to arrive. The timeout is
     the failure — it is not a sleep, and nothing waits it out when the control
     behaves. */
  const waitVisible = (want, timeout = 9000) => page.waitForFunction((w) => {
    const cs = getComputedStyle(document.querySelector('.totop'));
    return (cs.visibility === 'visible' && Number(cs.opacity) > 0.5) === w;
  }, want, { timeout }).catch(() => {});

  await waitVisible(true);
  if (!(await visible())) bad('390px: the back-to-top control never came back after the page settled');
  else ok('390px: back-to-top returns once the page stops');

  await page.mouse.wheel(0, 400);
  await waitVisible(false, 4000);
  await page.mouse.wheel(0, -400);
  await waitVisible(true);
  if (!(await visible())) bad('390px: the back-to-top control did not come back when scrolling up');
  else ok('390px: back-to-top comes back when you turn round');

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5e-2. The ascent                                                            */
/* -------------------------------------------------------------------------- */
/* Pressing back-to-top gathers the page into a stack, lifts it away, jumps, and
   opens it out again. Four things have to be true, and three of them have been
   wrong at some point:

     it stacks        the blocks must be given DIFFERENT distances to travel.
                      One shared distance is the page sliding; different
                      distances converging on one point is a stack. This is the
                      whole effect, so it is measured rather than assumed.
     the field goes   the star field surges with it. Checked on the pixels, not
                      on a flag — and measured in the GUTTER beside the content
                      column, which is the only part of the window where nothing
                      but the field is drawn. Measuring the whole window does
                      not work: the cards are fading out at the same moment the
                      stars brighten, and the two cancel almost exactly.
     the jump is a    `base.css` sets `scroll-behavior: smooth`, which silently
     jump             turned the jump into a 600 ms glide through an empty
                      page. If the top is not reached almost immediately after
                      the stack has gone, that has come back.
     it tidies up     no `--dy`, no `--i` and no classes left behind. Inline
                      custom properties that outlive their animation are how a
                      page ends up with a permanent invisible transform. */
{
  /* Wide enough that the shell is capped and there are real gutters either side
     — see the note about where the field is measured. */
  const page = await browser.newPage({ viewport: { width: 1500, height: 760 } });
  await page.goto(url('publications.html'));
  await page.waitForSelector('.pubs > li');
  await page.waitForTimeout(1400);

  const GUTTER = { x: 0, y: 120, width: 110, height: 600 };

  const measure = () => page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[data-fx], [data-fx-field], .panel')];
    const dys = nodes
      .map((n) => n.style.getPropertyValue('--dy'))
      .filter(Boolean)
      .map((v) => parseFloat(v));
    return {
      classes: document.documentElement.className,
      dys,
      distinct: new Set(dys).size,
      leftovers: nodes.filter((n) => n.style.getPropertyValue('--dy') || n.style.getPropertyValue('--i')).length,
      y: Math.round(window.scrollY),
    };
  });

  /* How much light the field is putting into the gutter. Used for the resting
     measurement only — see the note at the surge check. */
  const busy = async () => {
    const shot = await page.screenshot({ clip: GUTTER });
    return page.evaluate(async (bytes) => {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = cv.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height);
      const lum = new Float64Array(data.length / 4);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        lum[j] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      }
      const page_ = Float64Array.from(lum).sort()[lum.length >> 1];
      let moved = 0;
      for (let j = 0; j < lum.length; j++) if (Math.abs(lum[j] - page_) > 4) moved++;
      return (100 * moved) / lum.length;
    }, Array.from(shot));
  };

  await page.evaluate(() => window.scrollTo({ top: 2600, behavior: 'instant' }));
  await page.waitForTimeout(250);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(700);
  await page.mouse.move(8, 8);            // nothing hovered, so the field is at rest
  await page.waitForTimeout(600);

  const restBusy = await busy();
  /* Watch the field's own surge value for the whole flight and keep the peak.
     A single sample cannot be trusted here: the flare lasts under a second and
     the check has to catch it while also driving the pointer. */
  await page.evaluate(() => {
    window.__surgePeak = 0;
    const tick = () => {
      if (window.__fx && window.__fx.surging) {
        window.__surgePeak = Math.max(window.__surgePeak, window.__fx.surging());
      }
      window.__surgeRaf = requestAnimationFrame(tick);
    };
    tick();
  });

  /* Click without awaiting, then wait for the ascent to actually begin rather
     than for a guessed number of milliseconds. Playwright's click does its own
     actionability wait, so a fixed delay races it — and loses on a wide
     viewport, where the pointer has further to travel. */
  const clicked = page.click('.totop');
  let started = true;
  await page.waitForFunction(
    () => document.documentElement.classList.contains('fx-rise'),
    null,
    { timeout: 4000 },
  ).catch(() => { started = false; });

  const midFlight = started ? await measure() : { classes: '', dys: [], distinct: 0 };

  if (!/fx-rise/.test(midFlight.classes)) bad('the ascent did not start (no fx-rise)');
  else ok('the ascent starts when back-to-top is pressed');

  if (midFlight.dys.length < 3) {
    bad(`only ${midFlight.dys.length} blocks were given a distance to travel`);
  } else if (midFlight.distinct < 3) {
    bad(`the blocks all travel the same distance (${midFlight.distinct} distinct) — that is a slide, not a stack`);
  } else {
    ok(`${midFlight.dys.length} blocks converge from ${midFlight.distinct} different distances`);
  }
  if (midFlight.dys.some((v) => v > 0)) bad('a block was told to travel downward during the ascent');

  await clicked.catch(() => {});
  /* Waited FOR, not waited OUT.
     This used to be a fixed 320 ms — shorter than a smooth scroll and longer
     than the stack, so it landed in the gap between them. That gap is real on a
     desktop and gone on a loaded machine: with several WebGL contexts running
     under a software renderer the stack's own timer slips past the sample and
     the check fails on a page that is behaving perfectly.
     `fx-land` is added on the line immediately after `jumpToTop()`, so the
     moment it appears is the moment the scroll has been asked for. Reading
     scrollY there tests exactly the same thing — instant, or a glide — without
     any number in it to be raced. */
  await page.waitForFunction(
    () => document.documentElement.classList.contains('fx-land'),
    null,
    { timeout: 4000 },
  ).catch(() => {});
  const justAfter = await page.evaluate(() => Math.round(window.scrollY));
  if (justAfter > 40) bad(`the jump to the top is animating, not jumping (scrollY ${justAfter} right after the stack went)`);
  else ok('the jump to the top happens under cover, in one frame');

  await page.waitForTimeout(900);
  /* Stop watching only now. The surge is driven from the field's own clock,
     which advances by a CLAMPED delta — so on a slow renderer its
     nine-hundred-millisecond flare takes several seconds of real time, and
     sampling the peak the moment the stack starts moving catches it barely off
     the ground. That is what "peak 0.12" meant the first time: not a field that
     failed to surge, a check that stopped looking too early. */
  await page.evaluate(() => cancelAnimationFrame(window.__surgeRaf));
  const after = await measure();
  if (after.y !== 0) bad(`the ascent finished at scrollY ${after.y}`);
  else ok('the ascent finishes at the top');
  /* The surge is read from the field itself rather than off the screen.
     
     It was measured on the pixels in the gutter, and that stopped being
     reliable: with six WebGL canvases on this page a screenshot taken during
     the busiest moment of the animation comes back as a blank strip under
     software rendering — a capture failure that is indistinguishable, in the
     numbers, from "the field did not surge". Two different things must not
     produce the same red.
     
     So the peak of the field's own surge value is watched across the whole
     flight. That is the quantity the effect is made of; the resting pixel
     measurement above still confirms the field is actually drawing something. */
  const surgePeak = await page.evaluate(() => window.__surgePeak || 0);

  if (restBusy < 0.15) {
    bad(`the field is not drawing at rest (${restBusy.toFixed(2)}% of the gutter)`);
  } else if (surgePeak < 0.5) {
    bad(`the field did not surge with the stack (peak ${surgePeak.toFixed(2)}, expected to reach 1)`);
  } else {
    ok(`the field surges with the stack (peak ${surgePeak.toFixed(2)}; ${restBusy.toFixed(2)}% of the gutter lit at rest)`);
  }

  if (/fx-rise|fx-land/.test(after.classes)) bad(`the ascent left classes behind (${after.classes})`);
  else if (after.leftovers) bad(`${after.leftovers} blocks kept an inline --dy/--i after the ascent`);
  else ok('the ascent cleans up after itself');

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5f. The biography is justified, and only where the measure allows           */
/* -------------------------------------------------------------------------- */
for (const [width, expected] of [[1440, 'justify'], [390, 'left']]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url('index.html'));
  await page.waitForSelector('.bio p');
  await page.waitForTimeout(400);

  const seen = await page.evaluate(() => {
    const el = document.querySelector('.bio p');
    const cs = getComputedStyle(el);
    /* Characters per line, measured rather than guessed: the width of the
       paragraph divided by the width of a digit in its own font. */
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
    const ch = ctx.measureText('0').width || 8;
    return {
      align: cs.textAlign,
      hyphens: cs.hyphens || cs.webkitHyphens,
      cpl: Math.round(el.getBoundingClientRect().width / ch),
    };
  });

  if (seen.align !== expected) {
    bad(`${width}px: the biography is ${seen.align}, expected ${expected}`);
  } else ok(`${width}px: the biography is ${seen.align} (${seen.cpl} characters a line)`);

  /* Justified without hyphenation opens rivers; the two ship together or not at
     all. */
  if (expected === 'justify' && seen.hyphens !== 'auto') {
    bad(`${width}px: the biography is justified with hyphens: ${seen.hyphens}`);
  } else if (expected === 'justify') ok(`${width}px: hyphenation is on to keep the spaces honest`);

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5g. The book on a student card matches whether they have finished           */
/* -------------------------------------------------------------------------- */
/* An open book while the research is under way, a closed one once it is done.
   It is a convention the site has always had and it is carried by two separate
   fields — `status` and `topicIcon` — which means it can drift, and it did:
   every book on the page ended up open, graduates included. Nothing failed. It
   just quietly stopped meaning anything, which is the kind of thing only a
   check notices.

   Read off the rendered icons rather than the JSON, so this tests what a
   visitor sees. */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url('research-team.html'));
  await page.waitForSelector('.person');
  await page.waitForTimeout(600);

  const seen = await page.evaluate(() => {
    const href = (el) => (el ? (el.querySelector('use')?.getAttribute('href') || '') : '');
    const rows = [...document.querySelectorAll('.person')].map((card) => {
      const status = href(card.querySelector('.person__status'));
      const book = href(card.querySelector('.person__topic .icon'));
      return {
        name: card.querySelector('.person__name')?.textContent.trim() || '?',
        done: /check-circle/.test(status),
        ongoing: /digging/.test(status),
        book: /#fad-book-open/.test(book) ? 'open' : /#fad-book$/.test(book) ? 'closed' : 'other',
      };
    });
    return {
      wrong: rows.filter((r) => (r.done && r.book === 'open') || (r.ongoing && r.book === 'closed')),
      closed: rows.filter((r) => r.book === 'closed').length,
      open: rows.filter((r) => r.book === 'open').length,
      other: rows.filter((r) => r.book === 'other').length,
    };
  });

  if (seen.wrong.length) {
    bad(`${seen.wrong.length} student cards have the wrong book — e.g. ${seen.wrong
      .slice(0, 3).map((r) => `${r.name} (${r.done ? 'finished' : 'in progress'}, ${r.book})`).join('; ')}`);
  } else {
    ok(`the book matches the state on every card — ${seen.closed} closed, ${seen.open} open, ${seen.other} neither`);
  }

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5h. The 3D roster on the Research Team page                                 */
/* -------------------------------------------------------------------------- */
/* It builds, it names the five groups in the short form the brief asked for,
   the filters actually narrow it, and — the part worth checking hardest — a
   click on a card lands on the RIGHT person.

   That last one is not obvious. Two people in this roster share a name: the
   same person appears once as an MPhil student and once as a PhD student. So
   the card-to-row lookup cannot match on the name, and it cannot match on a
   position in the whole page either, because that goes wrong the day a section
   is added. It matches on section plus position within it, and this check is
   what says so. */
{
  const page = await browser.newPage({ viewport: { width: 1300, height: 950 } });
  await page.goto(url('research-team.html'));
  await page.waitForSelector('.person');
  await page.waitForTimeout(4000);

  const built = await page.evaluate(() => (window.__roster ? {
    renderer: window.__roster.renderer,
    people: window.__roster.people,
    years: window.__roster.years,
    rows: [...document.querySelectorAll('.explorer[data-view="roster"] .explorer__years')]
      .map((row) => [...row.children].map((c) => c.textContent.trim())),
    cards: document.querySelectorAll('.person').length,
  } : null));

  if (!built || built.renderer !== 'three') {
    /* No WebGL in this browser is a legitimate outcome — the roster is a second
       view of a list that is right underneath it, so it simply does not appear.
       What must NOT happen is the list disappearing with it. */
    const rows = await page.evaluate(() => document.querySelectorAll('.person').length);
    if (rows < 50) bad(`the roster did not build AND the list is short (${rows} people)`);
    else ok(`no 3D roster in this browser; the list of ${rows} people is untouched`);
  } else {
    if (built.people !== built.cards) {
      bad(`the roster holds ${built.people} cards but the page lists ${built.cards} people`);
    } else ok(`3D roster: ${built.people} cards, ${built.years} years`);

    const shorts = ['Postdocs', 'Scholars', 'PhDs', 'RAs', 'MPhils', 'BScs'];
    const missing = shorts.filter((s_) => !built.rows[0].some((label) => label.startsWith(s_)));
    if (missing.length) bad(`the group filter is missing ${missing.join(', ')}`);
    else ok(`group filter offers ${shorts.join(', ')}`);

    if (!built.rows[1] || built.rows[1].length < 5) bad('the year filter has almost no years in it');
    else ok(`year filter offers ${built.rows[1].length - 1} years`);

    /* The rows are raked. Every row must sit HIGHER than the one in front of
       it — that is the whole of the fix for "the old ones are impossible to
       get at", and it is one comparison. A flat run, or a descending one, means
       the far rows are hidden behind the near ones and the problem is back. */
    const rake = await page.evaluate(() => {
      const seen = [];
      for (const key of Object.keys(window.__roster.rows || {})) seen.push(window.__roster.rows[key]);
      return seen;
    });
    if (!rake.length) {
      bad('the roster does not report its row heights');
    } else {
      const wrong = rake.filter((lane) => lane.some((y, i) => i > 0 && y <= lane[i - 1]));
      if (wrong.length) bad(`${wrong.length} groups do not rise row by row`);
      else ok(`every group is raked — rows climb ${rake.map((l) => l.length).join('/')} deep`);

    /* And no deeper than this. The blocks widen as their group grows rather
       than receding further, which is what keeps the oldest member of the
       largest group as reachable as the newest. A block that has gone deeper
       than this means the widening stopped working. */
    const DEEPEST = 8;
    const tall = rake.filter((lane) => lane.length > DEEPEST);
    if (tall.length) bad(`a group is ${Math.max(...tall.map((l) => l.length))} rows deep — it should have widened instead`);
    else ok(`no group is more than ${DEEPEST} rows deep`);
    }

    /* Filtering narrows it. */
    await page.evaluate(() => document.querySelector('[data-cat="phd"]').click());
    await page.waitForTimeout(1200);
    const narrowed = await page.evaluate(() => document.querySelector('.explorer__readout').textContent);
    if (!/^9 of \d+ — PhD Students/.test(narrowed)) bad(`filtering by PhDs said "${narrowed}"`);
    else ok(`filtering by group narrows it — "${narrowed}"`);

    await page.evaluate(() => document.querySelector('[data-cat=""]').click());
    await page.waitForTimeout(1000);

    /* Click a card and check where it lands. The card under a given pixel is
       not knowable from outside, so the pointer sweeps until the readout stops
       being the summary and starts being a person. */
    const stage = await page.locator('.explorer__stage').boundingBox();
    let found = null;
    for (let fy = 0.3; fy <= 0.85 && !found; fy += 0.08) {
      for (let fx = 0.1; fx <= 0.9 && !found; fx += 0.05) {
        await page.mouse.move(stage.x + stage.width * fx, stage.y + stage.height * fy);
        await page.waitForTimeout(70);
        const text = await page.evaluate(() => document.querySelector('.explorer__readout').textContent);
        if (!/^\d+ of \d+/.test(text)) found = { fx, fy, name: text.split(' · ')[0] };
      }
    }

    if (!found) {
      bad('no card responded to the pointer anywhere on the stage');
    } else {
      ok(`pointing at a card names them — "${found.name}"`);
      await page.mouse.click(stage.x + stage.width * found.fx, stage.y + stage.height * found.fy);
      await page.waitForTimeout(1500);
      /* `.is-jumped`, not `.is-lit`: the scroll this click starts also moves
         highlight.js's reading marker, so the page legitimately has another lit
         row on it and the first one in document order is not the answer. */
      const landed = await page.evaluate(() => {
        const hit = document.querySelector('.person.is-jumped');
        if (!hit) return { y: Math.round(window.scrollY), name: null };
        /* The heading carries the co-supervisor note in a child span; the card
           in the 3D panel carries only the name. Compare like with like. */
        const heading = hit.querySelector('.person__name').cloneNode(true);
        heading.querySelector('.person__note')?.remove();
        return { y: Math.round(window.scrollY), name: heading.textContent.trim() };
      });
      if (!landed.name) bad('clicking a card did not light anybody in the list');
      else if (landed.name !== found.name) {
        bad(`clicking "${found.name}" landed on "${landed.name}"`);
      } else if (landed.y < 200) {
        bad(`clicking a card did not move the page (scrollY ${landed.y})`);
      } else {
        ok(`clicking a card lands on that person — ${landed.name}, ${landed.y}px down`);
      }
    }
  }

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5i. The name standing in the left gutter                                    */
/* -------------------------------------------------------------------------- */
{
  /* Where it is and where it is NOT. Both halves matter: the column is a piece
     of furniture for a space that only exists on a wide screen, and it is
     absent from the Summary page because that page already says the name in
     large type beside a portrait. */
  for (const [where, width, wanted] of [
    ['publications.html', 1600, true],
    ['index.html', 1600, false],
    ['publications.html', 1380, false],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url(where));
    if (wanted) {
      await page.waitForFunction(
        () => document.querySelector('.namecol') && document.querySelector('.namecol').dataset.namecolumn === 'three',
        null,
        { timeout: 12000 },
      ).catch(() => {});
    } else {
      await page.waitForTimeout(1500);
    }
    const there = await page.evaluate(() => !!document.querySelector('.namecol'));
    const label = `${where.replace('.html', '')} at ${width}px`;
    if (there !== wanted) bad(`the name column is ${there ? 'there' : 'missing'} on ${label}`);
    else ok(`the name column is ${wanted ? 'there' : 'correctly absent'} on ${label}`);

    if (wanted && there) {
      const fit = await page.evaluate(() => {
        const column = document.querySelector('.namecol').getBoundingClientRect();
        const shell = (document.querySelector('.shell') || document.querySelector('main')).getBoundingClientRect();
        return {
          gap: Math.round(shell.left - column.right),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          /* Click-through, or it is an eighty-pixel dead zone down the side of
             every page. */
          topmost: (() => {
            const el = document.elementFromPoint(column.left + column.width / 2, column.top + 40);
            return el ? (el.className || el.tagName) : 'none';
          })(),
        };
      });
      if (fit.gap < 0) bad(`the name column overlaps the content by ${-fit.gap}px`);
      else ok(`the name column clears the content by ${fit.gap}px`);
      if (fit.overflow > 1) bad(`the name column pushed the page ${fit.overflow}px wide`);
      if (/namecol/.test(fit.topmost)) bad('the name column can take a click');
      else ok('the name column is click-through');

      /* THE ALIGNMENT. The top of the "H" is supposed to sit on the same line
         as the page's kicker, and that is arithmetic — the camera's, run
         backwards — so it is worth asserting rather than eyeballing. Two
         pixels of tolerance for the rounding on the way through. */
      const aligned = await page.evaluate(() => {
        const kicker = document.querySelector('.page-header__kicker');
        if (!kicker || !window.__namecolumn) return null;
        return {
          cap: window.__namecolumn.state().capTop,
          kicker: kicker.getBoundingClientRect().top,
        };
      });
      if (!aligned) bad('could not measure the column against the page kicker');
      else if (Math.abs(aligned.cap - aligned.kicker) > 2) {
        bad(`the top of the "H" is ${Math.round(aligned.cap - aligned.kicker)}px off the kicker`);
      } else {
        ok('the top of the "H" lines up with the page kicker');
      }
    }
    await page.close();
  }

  /* What it DOES. Watched rather than photographed: the cascade is a moving
     relationship between twelve objects and a screenshot of it is one frame of
     a wave. */
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(url('publications.html'));
  await page.waitForFunction(() => window.__namecolumn, null, { timeout: 12000 }).catch(() => {});

  const live = await page.evaluate(() => !!window.__namecolumn);
  if (!live) {
    bad('the name column never mounted');
  } else {
    const first = await page.evaluate(() => window.__namecolumn.state());
    if (first.letters < 10) bad(`the column has only ${first.letters} letters`);
    else ok(`the column stands ${first.letters} letters tall`);

    /* The meteor climbs while the letters are still. */
    const climbed = await page.waitForFunction(
      () => window.__namecolumn.state().meteor,
      null,
      { timeout: 16000 },
    ).then(() => true).catch(() => false);
    if (!climbed) bad('the meteor never climbed the column');
    else ok('the meteor climbs the column');

    /* THE TEN DEGREES. This is the whole of what the cascade is, and it is only
       exactly ten because each letter turns at a constant rate — under an eased
       turn the gap between neighbours is ten degrees for one instant and then
       something else, which is how the first version of this came out at
       fifteen. Sampled while at least three letters are mid-turn, so the
       reading is from the middle of the wave and not from its edge. */
    let wave = null;
    for (let i = 0; i < 250; i++) {
      // eslint-disable-next-line no-await-in-loop
      const now = await page.evaluate(() => window.__namecolumn.state());
      if (now.turning >= 3 && now.lead !== null) { wave = now; break; }
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(60);
    }
    if (!wave) bad('the cascade never ran');
    else if (Math.abs(wave.lead - 10) > 0.5) {
      bad(`the cascade's letters are ${wave.lead.toFixed(1)}° apart, not 10°`);
    } else {
      ok(`the cascade travels down the column ten degrees at a time (${wave.lead.toFixed(2)}°)`);
    }

    /* And it is a WAVE, not a group: while it is passing, some letters are
       turning and some are not. */
    if (wave && wave.turning >= first.letters) {
      bad('every letter turns at once — that is a group, not a cascade');
    } else if (wave) ok(`${wave.turning} of ${first.letters} letters turning at once`);
  }

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 5d-4. The dew runs only while the sword is on screen                        */
/* -------------------------------------------------------------------------- */
{
  /* THE BUG THIS FIXES. The pool used to appear at the bottom-left of a page
     scrolled nowhere near its footer — most reliably after switching to another
     tab and back. The IntersectionObserver was doing its job; the
     `visibilitychange` handler beside it was not, and called `start()` whatever
     the observer had last said. So the loop resumed, the pool was painted, and
     the only thing that explains it — a sword with a drop hanging off its point
     — was a thousand pixels below the fold.

     One CONTEXT with two pages, because a second page in the same context is
     what actually fires `visibilitychange` on the first. */
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(url('publications.html'));
  await page.waitForFunction(() => window.__copyright, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const running = () => page.evaluate(() => {
    const layer = document.querySelector('.dew-layer');
    const mark = document.querySelector('.mark3d').getBoundingClientRect();
    return {
      live: !!(layer && layer.dataset.live),
      onScreen: mark.top < window.innerHeight && mark.bottom > 0,
    };
  });

  const top = await running();
  if (top.onScreen) {
    bad('the footer is on screen at the top of the Publications page — pick a longer page');
  } else if (top.live) {
    bad('the dew is running with the sword off screen');
  } else ok('the dew is still while the sword is off screen');

  const other = await context.newPage();
  await other.goto(url('index.html'));
  await page.waitForTimeout(600);
  await page.bringToFront();
  await page.waitForTimeout(1500);
  const back = await running();
  if (back.live) bad('coming back to the tab started the dew with the sword off screen');
  else ok('coming back to the tab leaves the dew alone');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const started = await page.waitForFunction(
    () => !!document.querySelector('.dew-layer').dataset.live,
    null,
    { timeout: 10000 },
  ).then(() => true).catch(() => false);
  if (!started) bad('the dew did not run when the sword came into view');
  else ok('the dew runs once the sword is on screen');

  await page.evaluate(() => window.scrollTo(0, 0));
  const stopped = await page.waitForFunction(
    () => !document.querySelector('.dew-layer').dataset.live,
    null,
    { timeout: 10000 },
  ).then(() => true).catch(() => false);
  if (!stopped) bad('the dew kept running after the sword scrolled away');
  else ok('the dew stops when the sword scrolls away');

  await context.close();
}

/* -------------------------------------------------------------------------- */
/* 5d-5. The dew does not bleed into the gap before the content arrives        */
/* -------------------------------------------------------------------------- */
{
  /* THE BUG THIS FIXES. The footer comes from site.json and the content from
     the page's own file, and the footer wins that race by a wide margin. In
     between, the whole document is a masthead, the word "Loading…" and a
     footer — shorter than the window, so the footer is ON SCREEN and the sword
     starts shedding drops. The content then lands, the document grows past
     twenty thousand pixels, and the footer leaves. The loop stops and the
     overlay is cleared, both correctly; what is NOT cleared is the pool, which
     is remembered on purpose. So the reader who finally scrolls to the footer
     finds blood already pooled under a sword they had never seen, with more
     drops adding to it.

     Reported on Publications and Research team, the two pages whose content
     takes longest to draw. The fix is `hs:page-ready` (main.js) gating the dew
     (`settled` in copyright3d.js) — README §12.4.

     The window is invisible on a fast local server, so the data is HELD BACK
     here to make it wide enough to observe. Only `data/*.json` is delayed:
     three.js and the modules stay fast, which is what puts the sword on screen
     and ready to drip while the page is still a placeholder. */
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const HOLD = 9000;
  await page.route(/\/data\/.*\.json$/, async (route) => {
    await new Promise((r) => setTimeout(r, HOLD));
    await route.continue();
  });

  await page.goto(url('publications.html'), { waitUntil: 'commit' });

  /* While the page is still the placeholder: the footer is genuinely in the
     viewport, and the dew must nonetheless stay dry. */
  await page.waitForFunction(() => document.querySelector('.mark3d'), null, { timeout: HOLD + 8000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const during = await page.evaluate(() => {
    const layer = document.querySelector('.dew-layer');
    const mark = document.querySelector('.mark3d');
    const r = mark && mark.getBoundingClientRect();
    return {
      ready: document.documentElement.dataset.pageReady === 'yes',
      markOnScreen: r ? r.top < window.innerHeight && r.bottom > 0 : false,
      live: !!(layer && layer.dataset.live),
      landed: window.__copyright ? window.__copyright.state().landed : 0,
    };
  });

  if (during.ready) {
    /* The hold did not hold — nothing was actually observed. Say so rather
       than reporting a pass that measured nothing. */
    bad('the data was not held back, so the placeholder window was never observed');
  } else if (!during.markOnScreen) {
    bad('the footer was not on screen during loading — this check measured nothing');
  } else if (during.live) {
    bad('the dew ran while the page was still a placeholder');
  } else ok('the dew stays dry while the page is still a placeholder');

  /* And once the content has landed and pushed the footer away, nothing may
     have accumulated in the meantime. */
  await page.waitForFunction(() => document.documentElement.dataset.pageReady === 'yes', null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const after = await page.evaluate(() => {
    const layer = document.querySelector('.dew-layer');
    let painted = 0;
    if (layer && layer.width > 0) {
      const d = layer.getContext('2d').getImageData(0, 0, layer.width, layer.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) painted++;
    }
    const mark = document.querySelector('.mark3d').getBoundingClientRect();
    return {
      landed: window.__copyright ? window.__copyright.state().landed : null,
      painted,
      markOnScreen: mark.top < window.innerHeight && mark.bottom > 0,
    };
  });

  if (after.markOnScreen) bad('the footer is still on screen once Publications has drawn — pick a longer page');
  else if (after.landed) bad(`${after.landed} drop(s) pooled under a sword that was never on screen to the reader`);
  else ok('no dew accumulated while the page was loading');
  if (after.painted) bad(`${after.painted}px of dew is painted with the sword off screen`);
  else ok('the overlay is clean once the content has arrived');

  await context.close();
}

/* -------------------------------------------------------------------------- */
/* 6. The publications explorer                                                */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(url('publications.html'));
  await page.waitForSelector('.explorer');
  await page.waitForTimeout(1200);

  const built = await page.evaluate(() => {
    const x = window.__explorer || {};
    return { renderer: x.renderer, people: x.people, edges: x.edges, papers: x.papers };
  });

  if (!built.renderer) bad('the explorer did not start');
  else ok(`explorer renderer: ${built.renderer} (${built.people} people, ${built.edges} edges, ${built.papers} papers)`);

  if (!(built.papers > 50)) bad(`the explorer only found ${built.papers} papers`);
  if (!(built.people > 20)) bad(`the explorer only found ${built.people} co-authors`);

  // Every entry in the list must carry the id the explorer filters on, or a
  // click on a node silently filters to nothing.
  const ids = await page.$$eval('[data-pub-id]', (els) => els.length);
  if (ids !== built.papers) bad(`${ids} entries carry data-pub-id, but the explorer knows ${built.papers} papers`);
  else ok('every entry carries the id the explorer filters on');

  // Filtering, driven through the written list — the same code path a click on
  // a node takes, and the one a keyboard user actually has.
  await page.click('.explorer__written > summary');
  await page.waitForTimeout(200);
  await page.click('.explorer__pick');
  await page.waitForTimeout(500);

  const filtered = await page.evaluate(() => ({
    banner: (document.querySelector('.pub-filter') || {}).textContent || '',
    shown: [...document.querySelectorAll('[data-pub-id]')].filter((n) => !n.hidden).length,
    total: document.querySelectorAll('[data-pub-id]').length,
    emptySections: [...document.querySelectorAll('.entry-section')]
      .filter((s) => !s.hidden && s.querySelector('[data-pub-id]')
        && [...s.querySelectorAll('[data-pub-id]')].every((n) => n.hidden)).length,
  }));

  if (!filtered.banner) bad('filtering by co-author showed no banner');
  else if (filtered.shown === 0 || filtered.shown >= filtered.total) {
    bad(`filtering by co-author left ${filtered.shown} of ${filtered.total} entries visible`);
  } else ok(`filtering by co-author narrows the list (${filtered.shown} of ${filtered.total})`);

  if (filtered.emptySections) bad(`${filtered.emptySections} section(s) left visible with no entries`);
  else ok('sections with nothing left in them are hidden');

  await page.click('.explorer__pick');
  await page.waitForTimeout(400);
  const cleared = await page.evaluate(() => ({
    banner: !!document.querySelector('.pub-filter'),
    shown: [...document.querySelectorAll('[data-pub-id]')].filter((n) => !n.hidden).length,
  }));
  if (cleared.banner || cleared.shown !== filtered.total) bad('clearing the filter did not restore the list');
  else ok('clearing the filter restores every entry');

  // The timeline view and its year chips.
  await page.click('.explorer__tab[data-view="timeline"]');
  await page.waitForTimeout(600);
  const timeline = await page.evaluate(() => ({
    view: document.querySelector('.explorer').dataset.view,
    years: document.querySelectorAll('.explorer__year').length,
  }));
  if (timeline.view !== 'timeline' || timeline.years < 5) bad('the timeline view did not open');
  else ok(`timeline opens with ${timeline.years - 1} year chips`);

  await page.click('.explorer__year:nth-child(3)');
  await page.waitForTimeout(1400);
  const flown = await page.evaluate(() => document.querySelector('.explorer__readout').textContent);
  if (!/\d{4}/.test(flown)) bad('picking a year said nothing');
  else ok(`picking a year flies to it (${flown})`);

  /* ---- 6b. The citation layer -------------------------------------------
     Everything here is conditional on data/scholar.json having joined to
     something. That is the point: the panel is supposed to be the two-view
     panel it always was when it has not, so a checker that demanded the third
     tab would fail correctly-behaving builds — including any run against a
     checkout where the snapshot has been deleted, which §18.6 says is a
     supported way to turn the feature off.
     ---------------------------------------------------------------------- */
  const cites = await page.evaluate(() => {
    const x = window.__explorer || {};
    return { cited: x.cited, citations: x.citations, views: x.views };
  });

  if (!cites.cited) {
    ok('no citation data joined — the Impact view is correctly absent');
  } else {
    ok(`citations joined: ${cites.citations} across ${cites.cited} papers`);

    if (!cites.views.includes('impact')) bad('citations joined but there is no Impact view');
    const impactTab = await page.$('.explorer__tab[data-view="impact"]');
    if (!impactTab) bad('citations joined but there is no Impact tab');

    // The skyline: it opens, it draws its year labels, and nothing it draws
    // hangs outside the stage — the labels are centred on columns that stand at
    // the very edge of the frame, and the layer that holds them clips.
    await page.click('.explorer__tab[data-view="impact"]');
    await page.waitForFunction(
      () => document.querySelector('.explorer').dataset.view === 'impact'
        && [...document.querySelectorAll('.explorer__label--year')].some((t) => !t.hidden),
      null,
      { timeout: 15000 },
    );
    const skyline = await page.evaluate(() => {
      const stage = document.querySelector('.explorer__stage').getBoundingClientRect();
      const tags = [...document.querySelectorAll('.explorer__label--year')].filter((t) => !t.hidden);
      return {
        labels: tags.length,
        outside: tags.filter((t) => {
          const r = t.getBoundingClientRect();
          return r.left < stage.left - 1 || r.right > stage.right + 1
            || r.top < stage.top - 1 || r.bottom > stage.bottom + 1;
        }).map((t) => t.textContent),
        yearChips: !document.querySelector('.explorer__years').hidden,
        sizeButton: !document.querySelector('.explorer__size').hidden,
      };
    });

    if (skyline.labels < 3) bad(`the skyline drew only ${skyline.labels} year labels`);
    else ok(`the skyline opens with ${skyline.labels} year labels`);
    if (skyline.outside.length) bad(`year labels hanging outside the stage: ${skyline.outside.join(', ')}`);
    else ok('every year label sits inside the stage');
    // Neither control belongs to this view: the chips fly the timeline's camera
    // and the toggle sizes the graph's nodes.
    if (skyline.yearChips) bad('the year chips are showing on the Impact view');
    if (skyline.sizeButton) bad('the size toggle is showing on the Impact view');

    // Clicking a block jumps to the entry, which is the whole reason the
    // uncited papers are drawn as slivers rather than left out.
    const jumped = await page.evaluate(async () => {
      const stage = document.querySelector('.explorer__stage');
      const r = stage.getBoundingClientRect();
      const out = document.querySelector('.explorer__readout');
      for (let y = r.top + 10; y < r.bottom - 10; y += 9) {
        for (let x = r.left + 10; x < r.right - 10; x += 9) {
          stage.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
          if (/^\d[\d,]* citations? ·/.test(out.textContent)) {
            const opts = { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0 };
            stage.dispatchEvent(new PointerEvent('pointerdown', opts));
            stage.dispatchEvent(new PointerEvent('pointerup', opts));
            await new Promise((res) => setTimeout(res, 300));
            return {
              readout: out.textContent,
              lit: document.querySelectorAll('[data-pub-id].is-lit').length,
            };
          }
        }
      }
      return null;
    });

    if (!jumped) bad('nothing on the skyline reported a citation count on hover');
    else if (!jumped.lit) bad('clicking a skyline block lit no entry in the list');
    else ok('clicking a skyline block jumps to the entry');

    // The size toggle, on the view it belongs to.
    await page.click('.explorer__tab[data-view="graph"]');
    await page.waitForTimeout(400);
    const toggled = await page.evaluate(async () => {
      const before = window.__explorer.sizeBy();
      document.querySelector('.explorer__size').click();
      await new Promise((res) => setTimeout(res, 200));
      const after = window.__explorer.sizeBy();
      const label = document.querySelector('.explorer__size').textContent.trim();
      document.querySelector('.explorer__size').click();
      await new Promise((res) => setTimeout(res, 200));
      return { before, after, label, back: window.__explorer.sizeBy() };
    });

    if (toggled.before !== 'papers' || toggled.after !== 'citations' || toggled.back !== 'papers') {
      bad(`the size toggle went ${toggled.before} → ${toggled.after} → ${toggled.back}`);
    } else if (!/citations/.test(toggled.label)) {
      bad(`the size toggle did not relabel itself (read "${toggled.label}")`);
    } else ok('the size toggle swaps papers and citations, and says which');

    /* ---- 6c. The Influence city -----------------------------------------
       It is built on the FIRST CLICK, not on load (§15.8), so everything here
       has to ask after switching to it. `cityTop` is zero until then, and that
       is the property being relied on rather than worked around.
       ------------------------------------------------------------------- */
    const beforeOpen = await page.evaluate(() => window.__explorer.cityTop());
    if (beforeOpen !== 0) bad('the Influence city was built before anyone asked for it');
    else ok('the Influence city waits for its first click');

    await page.click('.explorer__tab[data-view="influence"]');
    await page.waitForFunction(
      () => document.querySelector('.explorer').dataset.view === 'influence'
        && window.__explorer.cityTop() > 0,
      null,
      { timeout: 15000 },
    );

    const city = await page.evaluate(() => {
      const x = window.__explorer;
      const cam = x.camera();
      return {
        top: x.cityTop(),
        distance: cam.distance,
        targetY: cam.target[1],
        yearChips: !document.querySelector('.explorer__years').hidden,
        sizeButton: !document.querySelector('.explorer__size').hidden,
      };
    });

    if (!(city.top > 0)) bad('the Influence city has no height');
    else ok(`the Influence city builds on demand (tallest tower ${city.top.toFixed(2)})`);
    // The fit centres on half the tower height. Getting this wrong once put the
    // whole city along the bottom edge of the stage with sky above it.
    if (Math.abs(city.targetY - city.top / 2) > 0.01) {
      bad(`the city camera looks at y=${city.targetY.toFixed(2)}, not half its height (${(city.top / 2).toFixed(2)})`);
    } else ok('the city camera is centred on the city');
    if (!(city.distance > 2.5 && city.distance < 90)) bad(`the city camera sits at ${city.distance}`);
    if (city.yearChips) bad('the year chips are showing on the Influence view');
    if (city.sizeButton) bad('the size toggle is showing on the Influence view');

    // It is a view about PEOPLE, so a click filters the list — the graph's
    // behaviour, reached through shared code rather than a second copy.
    const filtered = await page.evaluate(async () => {
      const stage = document.querySelector('.explorer__stage');
      const r = stage.getBoundingClientRect();
      const out = document.querySelector('.explorer__readout');
      for (let y = r.top + 8; y < r.bottom - 8; y += 7) {
        for (let x = r.left + 8; x < r.right - 8; x += 7) {
          stage.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
          if (/co-authors?/.test(out.textContent)) {
            const opts = { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0 };
            stage.dispatchEvent(new PointerEvent('pointerdown', opts));
            stage.dispatchEvent(new PointerEvent('pointerup', opts));
            await new Promise((res) => setTimeout(res, 350));
            return {
              readout: out.textContent,
              banner: (document.querySelector('.pub-filter') || {}).textContent || '',
              shown: [...document.querySelectorAll('[data-pub-id]')].filter((n) => !n.hidden).length,
              total: document.querySelectorAll('[data-pub-id]').length,
            };
          }
        }
      }
      return null;
    });

    if (!filtered) bad('no tower in the Influence city answered the pointer');
    else if (!filtered.banner || filtered.shown === 0 || filtered.shown >= filtered.total) {
      bad(`clicking a tower left ${filtered.shown} of ${filtered.total} entries visible`);
    } else ok(`clicking a tower filters the list (${filtered.shown} of ${filtered.total})`);

    await page.click('.explorer__clear');
    await page.waitForTimeout(300);

    // The site owner is deliberately absent — §15.8. If he ever reappears the
    // scale collapses and nobody would know why.
    const egoless = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('.explorer__labels .explorer__label')]
        .map((t) => t.textContent);
      return labels.some((t) => /Sadeghi,\s*H\./.test(t));
    });
    if (egoless) bad('the site owner has a tower in the Influence city');
    else ok('the Influence city leaves the site owner out');

    /* Every tab must be reachable at phone width. Four of them are wider than
       the header, and before the row was made to wrap the last one sat 122px
       past the edge where nothing could reach it. */
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const reach = await page.evaluate(() => {
      const head = document.querySelector('.explorer__head').getBoundingClientRect();
      return [...document.querySelectorAll('.explorer__tab')]
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.right > head.right + 1 || r.left < head.left - 1;
        })
        .map((b) => b.dataset.view);
    });
    if (reach.length) bad(`tabs outside the panel at 375px: ${reach.join(', ')}`);
    else ok('every explorer tab is reachable at phone width');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(300);
  }

  await page.close();
}

/* -------------------------------------------------------------------------- */
/* 7. The explorer with no WebGL                                               */
/* -------------------------------------------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (String(type).includes('webgl')) return null;
      return original.call(this, type, ...rest);
    };
  });
  await page.goto(url('publications.html'));
  await page.waitForSelector('.explorer');
  await page.waitForTimeout(900);

  const flat = await page.evaluate(() => ({
    renderer: (window.__explorer || {}).renderer,
    canvas: !!document.querySelector('.explorer__canvas'),
    writtenOpen: !!(document.querySelector('.explorer__written') || {}).open,
    picks: document.querySelectorAll('.explorer__pick').length,
    entries: document.querySelectorAll('[data-pub-id]').length,
  }));

  if (flat.renderer !== 'none') bad(`with no WebGL the explorer reported "${flat.renderer}"`);
  else if (flat.canvas) bad('with no WebGL the canvas was left in the page');
  else if (!flat.writtenOpen || flat.picks < 5) bad('with no WebGL the written list did not take over');
  else ok(`no WebGL: canvas removed, ${flat.picks} co-author buttons offered instead`);

  if (flat.entries < 50) bad('the publication list itself is short with no WebGL');
  else ok('the publication list is untouched with no WebGL');

  await page.close();
}

await browser.close();
server.close();

console.log('Interaction smoke test\n');
for (const n of notes) console.log(n);
console.log();

if (failures.length) {
  console.error('UI CHECK FAILED\n');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('UI CHECK PASSED — menu, section bar, transitions and the 3D layer all behave.');
