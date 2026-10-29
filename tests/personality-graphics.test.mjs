import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

for (const route of ['my-work', 'resume']) {
  test(`${route}: résumé cards have varied shapes, never repeating the giant arch`, () => {
    const html = readFileSync(new URL(`../public/${route}/index.html`, import.meta.url), 'utf8');
    const shapes = [...html.matchAll(/<svg class="career-tile-mark" data-watermark="personal"[^>]*>(.*?)<\/svg>/g)].map(x=>x[1]);
    assert.equal(shapes.length, 35, 'all 35 original role marks should be replaced');
    assert.ok(new Set(shapes).size >= 10, 'expect a diverse set of scribbles, bursts and blobs');
    assert.ok(!shapes.some(s => s.includes('M8 72V30C8 15')), 'previous repeated arch is gone');
    assert.ok(html.includes('/assets/site.css?v=20261029-personality32'));
  });
}

test('project gallery uses personality graphics rather than the repeated portal arch', () => {
  const js = readFileSync(new URL('../public/assets/site.js', import.meta.url), 'utf8');
  assert.ok(js.includes('data-watermark="personal"'));
  assert.ok(!js.includes('M266 342V154C266 86')); // The old arch motif.
  assert.ok(js.includes('wm-blob'));
});
