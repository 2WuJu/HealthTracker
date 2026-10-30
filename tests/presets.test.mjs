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

test('用户可以更改预置食物的每百克热量并用于记录', async () => {
  const { saveDictionaryFood, saveFood } = await import('../dist/domain.mjs');
  const repository = createRepository(memoryStorage());
  const original = repository.read().foods.find(f => f.id === 'usda-sr-169979');
  repository.write(s => saveDictionaryFood(s, { ...original, name: '我的白菜', kcalPer100g: '20.5' }, { foodId: original.id }));
  const state = repository.read();
  const next = saveFood(state, { date: '2026-10-23', meal: 'lunch', dictionaryFoodId: original.id, portionIndex: 'grams', quantity: '50' }, { today: '2026-10-23', id: 'meal' });
  assert.equal(next.entries[0].kcal, '10.25');
});

test('个人修改碰巧与后续预置相同时，仍不会被再下一次更新覆盖', async () => {
  const { saveDictionaryFood } = await import('../dist/domain.mjs');
  const storage = memoryStorage();
  const preset = name => ({ id: 'p', name, note: '', portions: [{ name: '份', kcal: '10' }] });
  const first = createRepository(storage, { foods: [preset('A')], version: 'v1' });
  first.write(s => saveDictionaryFood(s, preset('B'), { foodId: 'p' }));
  const second = createRepository(storage, { foods: [preset('B')], version: 'v2' });
  second.write(s => s);
  assert.equal(createRepository(storage, { foods: [preset('C')], version: 'v3' }).read().foods[0].name, 'B');
});

test('未做修改直接保存不会阻止未来预置更新', async () => {
  const { saveDictionaryFood } = await import('../dist/domain.mjs');
  const storage = memoryStorage();
  const preset = name => ({ id: 'p', name, note: '', portions: [{ name: '份', kcal: '10' }] });
  const first = createRepository(storage, { foods: [preset('A')], version: 'v1' });
  first.write(s => saveDictionaryFood(s, preset('A'), { foodId: 'p' }));
  assert.equal(createRepository(storage, { foods: [preset('B')], version: 'v2' }).read().foods[0].name, 'B');
});

test('现有用户获得常见菜肴，原有修改和删除保持不变', async () => {
  const { PRESET_FOODS } = await import('../dist/presets.mjs');
  const { saveDictionaryFood, removeDictionaryFood, saveFood } = await import('../dist/domain.mjs');
  const storage = memoryStorage();
  const oldFoods = PRESET_FOODS.filter(food => food.id.startsWith('usda-sr-'));
  const old = createRepository(storage, { foods: oldFoods, version: '旧版本' });
  const cabbage = old.read().foods.find(food => food.id === 'usda-sr-169979');
  old.write(s => saveDictionaryFood(s, { ...cabbage, name: '自家白菜' }, { foodId: cabbage.id }));
  old.write(s => removeDictionaryFood(s, 'usda-sr-170390'));
  const upgraded = createRepository(storage);
  const state = upgraded.read();
  assert.equal(state.foods.find(food => food.id === cabbage.id).name, '自家白菜');
  assert.equal(state.foods.some(food => food.id === 'usda-sr-170390'), false);
  const dish = state.foods.find(food => food.name === '宫保鸡丁');
  assert.equal(dish.kcalPer100g, '129');
  assert.equal(dish.source.version, 'FNDDS 2021-2023');
  assert.match(dish.source.url, /2706796/);
  const meal = saveFood(state, { date: '2026-10-23', meal: 'lunch', dictionaryFoodId: dish.id, portionIndex: 'grams', quantity: '150' }, { today: '2026-10-23', id: 'meal' });
  assert.equal(meal.entries[0].kcal, '193.5');
});

test('中文来源菜肴可按克记录且显示正确来源', async () => {
  const { saveFood } = await import('../dist/domain.mjs');
  const state = createRepository(memoryStorage()).read();
  const food = state.foods.find(item => item.id === 'tfda-R5101101');
  assert.equal(food.name, '卤猪脚（去骨）');
  assert.equal(food.kcalPer100g, '237');
  assert.match(food.source.name, /食品药物管理署/);
  assert.match(food.source.url, /data\.gov\.tw/);
  const next = saveFood(state, { date: '2026-10-23', meal: 'lunch', dictionaryFoodId: food.id, portionIndex: 'grams', quantity: '50' }, { today: '2026-10-23', id: 'dish' });
  assert.equal(next.entries[0].kcal, '118.5');
});
