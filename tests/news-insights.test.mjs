import test from 'node:test';
import assert from 'node:assert/strict';
import {importance, topStories, weightedNet, sentimentSeries, priceReaction, marketReading, oilUsdSeries, sparkline, shiftDay} from '../docs/terminal/news-insights.mjs';

const item = (id, date, impact, intensity = 2, status = 'confirmed', group = 'palm') => ({id, date, impact, intensity, status, group});

test('importance favours strong, confirmed and recent news', () => {
  const today = '2026-11-18';
  assert.ok(importance(item('a', '2026-11-17', 'positive', 3), today) > importance(item('b', '2026-11-17', 'positive', 1), today));
  assert.ok(importance(item('a', '2026-11-17', 'positive', 2), today) > importance(item('b', '2026-11-11', 'positive', 2), today));
  assert.ok(importance(item('a', '2026-11-17', 'positive', 2), today) > importance(item('b', '2026-11-17', 'positive', 2, 'rumor'), today));
  const top = topStories([item('old', '2026-11-01', 'negative', 3), item('x', '2026-11-17', 'negative', 3), item('y', '2026-11-16', 'mixed', 1)], today, {limit: 2});
  assert.deepEqual(top.map(r => r.id), ['x', 'y']);
});

test('weighted net and rolling sentiment', () => {
  assert.equal(weightedNet([item('a', '2026-11-17', 'positive', 3), item('b', '2026-11-17', 'negative', 1), item('c', '2026-11-17', 'mixed', 3)]), 2);
  const series = sentimentSeries([item('a', '2026-11-10', 'positive', 3), item('b', '2026-11-16', 'negative', 1)], r => r.group, ['palm', 'soy'],
    {from: '2026-11-10', to: '2026-11-17', window: 7});
  assert.equal(series.palm.length, 8);
  assert.equal(series.palm[0].value, 3);
  assert.equal(series.palm.find(p => p.date === '2026-11-16').value, 2);
  assert.equal(series.palm.at(-1).value, -1);
  assert.ok(series.soy.every(p => p.value === 0));
});

test('price reaction and the news-versus-price reading', () => {
  const points = [['2026-10-15', 100], ['2026-10-19', 102], ['2026-11-12', 105], ['2026-11-16', 99]].map(([date, value]) => ({date, value}));
  const r = priceReaction(points, {today: '2026-11-18', days: 30});
  assert.equal(r.base.date, '2026-10-19');
  assert.equal(r.last.value, 99);
  assert.ok(Math.abs(r.change - (99 / 102 - 1) * 100) < 1e-9);
  assert.equal(r.stale, false);
  assert.equal(marketReading('negative', -3).tone, 'negative');
  assert.match(marketReading('positive', -3).text, /Divergence/);
  assert.match(marketReading('negative', 0.4).text, /stables/);
  assert.match(marketReading('mixed', 2.5).text, /hausse/);
  assert.equal(priceReaction(points.slice(0, 1), {today: '2026-11-18', days: 30}), null);
});

test('oil prices are converted to USD per tonne', () => {
  const s = oilUsdSeries({zl: [['2026-11-16', 62.13]], fcpo: [['2026-11-16', 4436]], eurUsd: [['2026-11-13', 1.1]], eurMyr: [['2026-11-13', 4.62]], arSunOil: [['2026-11-11', 1316]]});
  assert.equal(s.zl[0].value, 1370);
  assert.equal(s.fcpo[0].value, 1056);
  assert.equal(s.arSunOil[0].value, 1316);
  assert.equal(shiftDay('2026-11-30', 1), '2026-12-01');
  assert.match(sparkline([{value: 1}, {value: 3}, {value: 2}]), /<svg class="sparkline up"/);
  assert.equal(sparkline([{value: 1}]), '');
});
