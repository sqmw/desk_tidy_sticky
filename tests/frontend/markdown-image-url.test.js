// @ts-nocheck -- Node harness uses the project's existing test convention.
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderInline } from '../../src/lib/markdown/renderer.js';

test('image query delimiters are escaped exactly once', () => {
  const html=renderInline('![photo](https://example.org/a.png?x=1&y=2)');
  assert.match(html,/src="https:\/\/example.org\/a.png\?x=1&amp;y=2"/);
  assert.ok(!html.includes('&amp;amp;'));
});

test('literal entity text and quotes cannot become image attributes',()=>{
  assert.ok(renderInline('![a&b](https://example.org/a?x=&amp;y)').includes('x=&amp;amp;y'));
  const html=renderInline('![photo](https://example.org/a?x="onerror="boom)');
  assert.ok(html.includes('&quot;onerror=&quot;'));
  assert.ok(!html.includes(' onerror='));
  assert.ok(!renderInline('![photo](javascript:alert)').includes('<img'));
});

test('generated image markup is not parsed again as links or emphasis',()=>{
  const html=renderInline('![photo](https://example.org/a?next=https://other.org/*a*)');
  assert.ok(html.includes('next=https://other.org/*a*'));
  assert.ok(!html.includes('<em>')); assert.ok(!html.includes('<a '));
});
