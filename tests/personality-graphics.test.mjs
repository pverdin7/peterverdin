import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for (const route of ['my-work', 'resume']) {
  test(`${route}: one organic gesture per career role, never a pattern in every tile`, () => {
    const html = readFileSync(new URL(`../public/${route}/index.html`, import.meta.url), 'utf8');
    const marks = [...html.matchAll(/<svg class="career-tile-mark" data-watermark="editorial" data-mark="(squiggle|blob)"[^>]*>.*?<\/svg>/g)];
    assert.equal(marks.length, 11, 'one graphic per role');
    assert.ok(marks.some(m => m[1] === 'squiggle'));
    assert.ok(marks.some(m => m[1] === 'blob'));
    assert.ok(!html.includes('data-watermark="personal"'));
    assert.ok(!html.includes('M31 3V61M4 32H60'), 'old radial burst gone');
    assert.ok(html.includes('/assets/site.css?v=20261029-editorial33'));
  });
}
test('gallery uses only a single squiggle or a single blob', () => {
  const js = readFileSync(new URL('../public/assets/site.js', import.meta.url), 'utf8');
  assert.ok(js.includes('data-watermark="editorial"'));
  assert.ok(js.includes('work-gesture'));
  assert.ok(js.includes('work-blob'));
  assert.ok(!js.includes('wm-fan'));
  assert.ok(!js.includes('wm-portal'));
});
test('story-stage decorative elements use restrained single shapes', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/class="story-stage-sculpture" data-watermark="editorial"/g)||[]).length,3);
  assert.ok(!html.includes('class="story-hero-geometry"'));
});
