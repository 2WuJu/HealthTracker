import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../dist/storage.mjs';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('首次使用即可看到带来源的预置食物', () => {
  const foods = createRepository(memoryStorage()).read().foods;
  const cabbage = foods.find(food => food.id === 'usda-sr-169979');
  assert.equal(cabbage.name, '大白菜（生）');
  assert.equal(cabbage.kcalPer100g, '16');
  assert.match(cabbage.source.url, /169979/);
  assert.equal(cabbage.source.version, 'SR Legacy 2018-04');
});

test('按小数克数记录预置食物的估算热量', async () => {
  const { saveFood } = await import('../dist/domain.mjs');
  const state = createRepository(memoryStorage()).read();
  const next = saveFood(state, { date: '2026-10-23', meal: 'lunch', dictionaryFoodId: 'usda-sr-169979', portionIndex: 'grams', quantity: '12.5' }, { today: '2026-10-23', id: 'meal' });
  assert.equal(next.entries[0].kcal, '2');
  assert.equal(next.entries[0].portion, '克');
});

test('预置更新保留个人修改、删除和新增，并更新未修改项', async () => {
  const { saveDictionaryFood, removeDictionaryFood } = await import('../dist/domain.mjs');
  const storage = memoryStorage();
  const preset = (id, name, kcal) => ({ id, name, note: '', portions: [], kcalPer100g: kcal, source: { version: 'v1', url: 'https://example.org/' + id } });
  const original = [preset('p1', '同名', '10'), preset('p2', '同名', '20'), preset('p3', '原名', '30')];
  const first = createRepository(storage, { foods: original, version: 'v1' });
  first.write(s => saveDictionaryFood(s, { name: '修改', note: '', portions: [{ name: '份', kcal: '9' }] }, { foodId: 'p1' }));
  first.write(s => removeDictionaryFood(s, 'p2'));
  first.write(s => saveDictionaryFood(s, { name: '同名', note: '', portions: [{ name: '份', kcal: '7' }] }, { id: 'mine' }));
  const updated = [preset('p1', '新预置', '11'), preset('p2', '新预置', '21'), preset('p3', '更新', '31'), preset('p4', '新增', '40')];
  const second = createRepository(storage, { foods: updated, version: 'v2' });
  const foods = second.read().foods;
  assert.equal(foods.find(f => f.id === 'p1').name, '修改');
  assert.equal(foods.some(f => f.id === 'p2'), false);
  assert.equal(foods.find(f => f.id === 'p3').name, '更新');
  assert.equal(foods.find(f => f.id === 'p4').name, '新增');
  assert.equal(foods.find(f => f.id === 'mine').name, '同名');
  second.write(s => s);
  assert.equal(createRepository(storage, { foods: updated, version: 'v2' }).read().foods.some(f => f.id === 'p2'), false);
});
