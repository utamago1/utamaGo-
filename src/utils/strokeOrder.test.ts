import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCachedStrokeData,
  getKanjiVgHexCode,
  parseKanjiVgSvg,
  parsePathStartAndDirection,
} from './strokeOrder';
import {
  HIRAGANA_PRACTICE_ITEMS,
  KATAKANA_PRACTICE_ITEMS,
} from './writingPractice';

test('getKanjiVgHexCode converts Hiragana, Katakana, and Kanji to 5-digit padded hex', () => {
  assert.equal(getKanjiVgHexCode('あ'), '03042');
  assert.equal(getKanjiVgHexCode('ア'), '030a2');
  assert.equal(getKanjiVgHexCode('日'), '065e5');
  assert.equal(getKanjiVgHexCode('儀'), '05100');
});

test('all 46 Hiragana and 46 Katakana have instant bundled offline stroke-order data', () => {
  for (const item of [...HIRAGANA_PRACTICE_ITEMS, ...KATAKANA_PRACTICE_ITEMS]) {
    const data = getCachedStrokeData(item.character);
    assert.ok(data, `Missing bundled stroke data for ${item.character}`);
    assert.equal(data.source, 'bundled');
    assert.ok(data.strokeCount >= 1);
    assert.equal(data.strokes.length, data.strokeCount);
  }
});

test('parsePathStartAndDirection extracts accurate start point and angle for horizontal and vertical strokes', () => {
  const horiz = parsePathStartAndDirection('M31.01,33c10,0,20,0,30,0');
  assert.equal(horiz.startX, 31.01);
  assert.equal(horiz.startY, 33);
  assert.equal(horiz.angleDeg, 0);

  const vert = parsePathStartAndDirection('M50,15c0,12,0,24,0,40');
  assert.equal(vert.startX, 50);
  assert.equal(vert.startY, 15);
  assert.equal(vert.angleDeg, 90);
});

test('parseKanjiVgSvg parses ordered strokes and label coordinates from raw KanjiVG SVG', () => {
  const sampleSvg = `
    <svg viewBox="0 0 109 109">
      <g id="kvg:StrokePaths_065e5">
        <path id="kvg:065e5-s1" d="M31.5,24.5c0.5,1,1,2.5,1,4v52"/>
        <path id="kvg:065e5-s2" d="M33.5,26.5c12-1,38-3,42-3"/>
      </g>
      <g id="kvg:StrokeNumbers_065e5">
        <text transform="matrix(1 0 0 1 24.5 32.5)">1</text>
        <text transform="matrix(1 0 0 1 36.5 22.0)">2</text>
      </g>
    </svg>
  `;
  const parsed = parseKanjiVgSvg('日', sampleSvg);
  assert.ok(parsed);
  assert.equal(parsed.strokeCount, 2);
  assert.equal(parsed.strokes[0].number, 1);
  assert.equal(parsed.strokes[0].startX, 31.5);
  assert.equal(parsed.strokes[1].number, 2);
  assert.equal(parsed.strokes[1].startX, 33.5);
});
