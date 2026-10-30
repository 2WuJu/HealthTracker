import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  emptyState, formatEnergy, isCalendarDate, localDate, lookupReference,
  multiplyEnergy, normalizeEnergy, recordedDates, referenceForDate, removeFood,
  saveFood, saveProfile, shiftDate, subtractEnergy, sumEnergy, summarizeDay, saveDictionaryFood, removeDictionaryFood,
} from '../dist/domain.mjs';
import { createRepository, STORAGE_KEY } from '../dist/storage.mjs';
import { createServer } from '../server.mjs';

const today = '2026-10-23';
const yesterday = '2026-10-22';
const male = { age: 35, sex: 'male', activity: 'low' };
const food = (state, fields, id) => saveFood(state, { date: today, meal: 'lunch', name: '食物', kcal: '100', ...fields }, { today, id });

function memoryStorage() {
  const values = new Map();
  return {
    failWrites: false,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      if (this.failWrites) throw new Error('Quota exceeded');
      values.set(key, value);
    },
  };
}

test('中国参考表匹配成年分组与30岁边界，而不把18岁行套给所有成年人', () => {
  for (const [age, sex, activity, expected] of [
    [18, 'male', 'low', 2150], [29, 'male', 'moderate', 2550],
    [30, 'male', 'moderate', 2500], [49, 'male', 'high', 2950],
    [35, 'male', 'low', 2050], [35, 'female', 'moderate', 2050],
    [49, 'female', 'high', 2400], [50, 'male', 'low', 1950],
    [64, 'female', 'high', 2300], [65, 'female', 'low', 1550],
    [74, 'male', 'moderate', 2300], [75, 'male', 'low', 1800],
    [80, 'female', 'moderate', 1750],
  ]) assert.equal(lookupReference({ age, sex, activity }).kcal, expected, `${age}/${sex}/${activity}`);
  assert.equal(lookupReference({ age: 80, sex: 'male', activity: 'low' }).ageGroup, '75 岁及以上');
});

test('65岁以后缺失的高活动值保持缺失，个人信息需完整且年龄必须为成年周岁', () => {
  assert.equal(lookupReference({ age: 65, sex: 'male', activity: 'high' }).kcal, null);
  assert.equal(lookupReference({ age: 80, sex: 'female', activity: 'high' }).kcal, null);
  for (const profile of [{ ...male, age: 17 }, { ...male, age: '' }, { ...male, age: 35.5 }, { ...male, sex: '' }, { ...male, activity: '' }]) {
    assert.throws(() => lookupReference(profile));
  }
});

test('手填千卡支持明确的零与小数，拒绝空白、负数和非有限表示', () => {
  assert.equal(normalizeEnergy(' 000.3000 '), '0.3');
  assert.equal(normalizeEnergy('.5'), '0.5');
  assert.equal(normalizeEnergy('0'), '0');
  for (const value of ['', ' ', '-1', 'NaN', 'Infinity', '1e3', '12千卡', '1,000']) assert.throws(() => normalizeEnergy(value));
});

test('十进制热量精确相加、相减与格式化，不暴露浮点尾数或大数舍入', () => {
  assert.equal(sumEnergy(['0.1', '0.2']), '0.3');
  assert.equal(sumEnergy(['0.001', '0.009']), '0.01');
  assert.equal(subtractEnergy('710', '2050'), '-1340');
  assert.equal(subtractEnergy('2050', '2050'), '0');
  assert.equal(sumEnergy(['999999999999999999999999999999', '999999999999999999999999999999']), '1999999999999999999999999999998');
  assert.equal(subtractEnergy('1999999999999999999999999999998', '2050'), '1999999999999999999999999997948');
  assert.equal(formatEnergy('12345.3'), '12,345.3');
  assert.equal(formatEnergy(null), '—');
});

test('餐次与全天汇总、编辑、删除按已确认的710→730→530场景更新', () => {
  let state = saveProfile(emptyState(), male, today);
  state = food(state, { meal: 'breakfast', name: '早餐', kcal: '300' }, 'breakfast');
  state = food(state, { name: '米饭一碗', kcal: '230' }, 'rice');
  state = food(state, { name: '鸡胸肉一份', kcal: '180' }, 'chicken');
  let summary = summarizeDay(state, today);
  assert.equal(summary.meals.lunch.total, '410');
  assert.equal(summary.total, '710');
  assert.equal(summary.difference, '-1340');
  state = saveFood(state, { date: today, meal: 'lunch', name: '鸡胸肉一份', kcal: '200' }, { today, entryId: 'chicken' });
  assert.equal(summarizeDay(state, today).total, '730');
  state = removeFood(state, 'chicken');
  assert.equal(summarizeDay(state, today).total, '530');
});

test('移动记录同时更新原日期/餐次与新日期/餐次，历史日期去重且降序', () => {
  let state = food(emptyState(), { kcal: '150' }, 'moving');
  state = saveFood(state, { date: yesterday, meal: 'dinner', name: '移到昨天晚餐', kcal: '150' }, { today, entryId: 'moving' });
  assert.equal(summarizeDay(state, today).total, null);
  assert.equal(summarizeDay(state, yesterday).meals.dinner.total, '150');
  assert.equal(summarizeDay(state, yesterday).meals.lunch.total, null);
  state = food(state, { kcal: '0.2' }, 'new');
  state = food(state, { kcal: '0.1' }, 'another');
  assert.deepEqual(recordedDates(state), [today, yesterday]);
  assert.equal(summarizeDay(state, today).total, '0.3');
});

test('空白日期与明确录入零千卡是不同状态', () => {
  const state = saveProfile(emptyState(), male, today);
  assert.equal(summarizeDay(state, today).total, null);
  assert.equal(summarizeDay(state, today).difference, null);
  const loggedZero = food(state, { name: '白水', kcal: '0' }, 'water');
  assert.equal(summarizeDay(loggedZero, today).total, '0');
  assert.equal(summarizeDay(loggedZero, today).difference, '-2050');
});

test('先记饮食和补记首个参考值之前的饮食，都不虚构历史参考值', () => {
  let state = food(emptyState(), { date: yesterday, kcal: '500' }, 'before-profile');
  assert.equal(summarizeDay(state, yesterday).reference, null);
  state = saveProfile(state, male, today);
  assert.equal(summarizeDay(state, yesterday).reference, null);
  assert.equal(summarizeDay(state, yesterday).difference, null);
  assert.equal(summarizeDay(state, yesterday).total, '500');
  assert.equal(referenceForDate(state, today).kcal, 2050);
});

test('新参考值当天生效，过去保留原值，同日再修改只替换当天版本', () => {
  let state = saveProfile(emptyState(), male, yesterday);
  state = saveProfile(state, { ...male, activity: 'moderate' }, today);
  assert.equal(referenceForDate(state, yesterday).kcal, 2050);
  assert.equal(referenceForDate(state, today).kcal, 2500);
  assert.equal(referenceForDate(state, '2026-10-24').kcal, 2500);
  state = saveProfile(state, { ...male, activity: 'high' }, today);
  assert.equal(state.references.length, 2);
  assert.equal(referenceForDate(state, yesterday).kcal, 2050);
  assert.equal(referenceForDate(state, today).kcal, 2950);
});

test('新的缺失参考组合不会错误沿用旧参考值，也不影响过去', () => {
  let state = saveProfile(emptyState(), male, yesterday);
  state = saveProfile(state, { age: 65, sex: 'male', activity: 'high' }, today);
  state = food(state, { kcal: '300' }, 'food');
  assert.equal(referenceForDate(state, yesterday).kcal, 2050);
  assert.equal(summarizeDay(state, today).reference.kcal, null);
  assert.equal(summarizeDay(state, today).total, '300');
  assert.equal(summarizeDay(state, today).difference, null);
});

test('日期按日历校验，跨闰日和夏令时日期仍按整日移动', () => {
  assert.equal(isCalendarDate('2024-02-29'), true);
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2026-13-01'), false);
  assert.equal(shiftDate('2024-03-01', -1), '2024-02-29');
  assert.equal(shiftDate('2026-03-08', 1), '2026-03-09');
  assert.equal(shiftDate('2026-01-01', -1), '2025-12-31');
  assert.throws(() => food(emptyState(), { date: '2026-10-24' }, 'future'));
  assert.throws(() => food(emptyState(), { date: '2026-02-29' }, 'invalid'));
  assert.throws(() => food(emptyState(), { name: '  ' }, 'empty-name'));
});

test('本地今天不会被UTC日期截断，上海午夜后的记录归入新日', () => {
  const url = new URL('../dist/domain.mjs', import.meta.url).href;
  const script = `import {localDate} from ${JSON.stringify(url)}; console.log(localDate(new Date('2026-10-22T16:30:00Z')));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, TZ: 'Asia/Shanghai' } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '2026-10-23');
  assert.match(localDate(), /^\d{4}-\d{2}-\d{2}$/);
});

test('本机仓库重新加载后保留食物与历史参考快照，不按当前表重算过去', () => {
  const storage = memoryStorage();
  const first = createRepository(storage);
  first.write(state => saveProfile(state, male, yesterday));
  first.write(state => food(state, { kcal: '0.3' }, 'persisted'));
  // 模拟来自旧数据版本的历史快照；读取时应保留该快照而非套当前表。
  const raw = JSON.parse(storage.getItem(STORAGE_KEY));
  raw.references[0].kcal = 2000;
  raw.references[0].sourceVersion = '历史核对版本';
  storage.setItem(STORAGE_KEY, JSON.stringify(raw));
  const restored = createRepository(storage);
  assert.equal(restored.error, null);
  assert.equal(summarizeDay(restored.read(), today).total, '0.3');
  assert.equal(referenceForDate(restored.read(), yesterday).kcal, 2000);
  assert.equal(referenceForDate(restored.read(), yesterday).sourceVersion, '历史核对版本');
  const detached = restored.read();
  detached.entries.length = 0;
  assert.equal(restored.read().entries.length, 1);
});

test('存储写入失败不修改内存中的成功状态，也不覆盖已保存数据', () => {
  const storage = memoryStorage();
  const repository = createRepository(storage);
  repository.write(state => food(state, { kcal: '200' }, 'original'));
  const before = storage.getItem(STORAGE_KEY);
  storage.failWrites = true;
  assert.throws(() => repository.write(state => removeFood(state, 'original')), /未保存/);
  assert.equal(storage.getItem(STORAGE_KEY), before);
  assert.equal(repository.read().entries.length, 1);
  storage.failWrites = false;
  repository.write(state => removeFood(state, 'original'));
  assert.equal(repository.read().entries.length, 0);
});

test('损坏数据、未知版本和禁止读取存储时停止写入，不静默清空原数据', () => {
  for (const raw of ['{broken', JSON.stringify({ version: 3, entries: [], references: [] }), JSON.stringify({ version: 1, entries: [{ id: 'bad' }], references: [] })]) {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, raw);
    const repository = createRepository(storage);
    assert.ok(repository.error);
    assert.throws(() => repository.write(state => food(state, {}, 'do-not-overwrite')));
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
  const blocked = createRepository({ getItem() { throw new Error('Blocked'); } });
  assert.ok(blocked.error);
  assert.throws(() => blocked.write(state => state));
});

test('另一窗口已写入时，旧窗口不会静默覆盖新数据', () => {
  const storage = memoryStorage();
  const first = createRepository(storage);
  const stale = createRepository(storage);
  first.write(state => food(state, { kcal: '150' }, 'other-window'));
  assert.throws(() => stale.write(state => food(state, { kcal: '400' }, 'stale-window')), /另一窗口/);
  assert.equal(createRepository(storage).read().entries[0].id, 'other-window');
});

test('页面静态控件ID唯一且覆盖控制器使用的全部静态挂载点', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const controller = await readFile(new URL('../dist/app.mjs', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, '不能出现重复控件ID');
  for (const [, id] of controller.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(id), `缺少控件 ${id}`);
  const syntax = spawnSync(process.execPath, ['--check', fileURLToPath(new URL('../dist/app.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test('本机服务可提供应用和模块，拒绝健康数据写入及应用目录外的文件访问', async t => {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /知食/);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  for (const path of ['/app.mjs', '/domain.mjs', '/storage.mjs', '/styles.css', '/icon.svg']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    await response.arrayBuffer();
  }
  const module = await fetch(base + '/domain.mjs', { method: 'HEAD' });
  assert.match(module.headers.get('content-type'), /javascript/);
  assert.equal(await module.text(), '');
  for (const path of ['/package.json', '/.scratch/initial-version/energy-source.pdf', '/../README.md', '/%2e%2e%2fpackage.json']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    await response.text();
  }
  const post = await fetch(base, { method: 'POST', body: 'not accepted' });
  assert.equal(post.status, 405);
  await post.text();
});


test('字典支持同名食物、备注及独立份量，修改删除不影响另一条', () => {
  const storage = memoryStorage();
  const repository = createRepository(storage);
  const rice = { name: '米饭', note: '白米', portions: [{ name: '小碗', kcal: '120' }, { name: '大碗', kcal: '230.5' }] };
  repository.write(state => saveDictionaryFood(state, rice, { id: 'one' }));
  repository.write(state => saveDictionaryFood(state, { ...rice, note: '糙米' }, { id: 'two' }));
  repository.write(state => saveDictionaryFood(state, { ...rice, name: '米饭', portions: [{ name: '一拳头', kcal: '0' }] }, { foodId: 'one' }));
  let foods = createRepository(storage).read().foods;
  assert.equal(foods.length, 2);
  assert.deepEqual(foods[0].portions, [{ name: '一拳头', kcal: '0' }]);
  assert.equal(foods[1].note, '糙米');
  assert.equal(foods[1].portions[1].kcal, '230.5');
  repository.write(state => removeDictionaryFood(state, 'one'));
  foods = createRepository(storage).read().foods;
  assert.deepEqual(foods.map(item => item.id), ['two']);
  assert.throws(() => repository.write(state => saveDictionaryFood(state, { name: 'x', portions: [] }, { id: 'invalid' })));
});

test('旧版本升级保留记录和参考值，字典写入失败或并发修改不覆盖数据', () => {
  const storage = memoryStorage();
  const old = saveProfile(food(emptyState(), {}, 'entry'), male, yesterday);
  delete old.foods; old.version = 1;
  const raw = JSON.stringify(old);
  storage.setItem(STORAGE_KEY, raw);
  const repository = createRepository(storage);
  const stale = createRepository(storage);
  assert.deepEqual(repository.read().entries, old.entries);
  assert.deepEqual(repository.read().references, old.references);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  const item = { name: '鸡蛋', note: '', portions: [{ name: '个', kcal: '80' }] };
  storage.failWrites = true;
  assert.throws(() => repository.write(state => saveDictionaryFood(state, item, { id: 'egg' })), /未保存/);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
  storage.failWrites = false;
  repository.write(state => saveDictionaryFood(state, item, { id: 'egg' }));
  assert.throws(() => stale.write(state => saveDictionaryFood(state, item, { id: 'stale' })), /另一窗口/);
  assert.deepEqual(createRepository(storage).read().entries, old.entries);
});

test('损坏的字典数据无法被覆盖', () => {
  const storage = memoryStorage();
  const raw = JSON.stringify({ version: 2, entries: [], references: [], foods: [{ id: 'x', name: '鸡蛋', note: '', portions: [] }] });
  storage.setItem(STORAGE_KEY, raw);
  const repository = createRepository(storage);
  assert.ok(repository.error);
  assert.throws(() => repository.write(state => state));
  assert.equal(storage.getItem(STORAGE_KEY), raw);
});

test('字典食物按小数数量保存独立快照，修改字典和记录后汇总仍可信', () => {
  const storage = memoryStorage();
  const repository = createRepository(storage);
  repository.write(state => saveDictionaryFood(state, { name: '米饭', note: '白米', portions: [{ name: '碗', kcal: '0.1' }] }, { id: 'rice' }));
  repository.write(state => saveFood(state, { date: today, meal: 'lunch', dictionaryFoodId: 'rice', portionIndex: '0', quantity: '0.2', kcal: '0.02' }, { today, id: 'meal' }));
  repository.write(state => saveDictionaryFood(state, { name: '新米饭', note: '', portions: [{ name: '大碗', kcal: '300' }] }, { foodId: 'rice' }));
  repository.write(state => removeDictionaryFood(state, 'rice'));
  let state = createRepository(storage).read();
  assert.deepEqual(state.entries[0], { id: 'meal', date: today, meal: 'lunch', name: '米饭', portion: '碗', quantity: '0.2', kcal: '0.02' });
  assert.equal(summarizeDay(state, today).meals.lunch.total, '0.02');
  state = saveFood(state, { date: yesterday, meal: 'dinner', name: '米饭', kcal: '0.03' }, { today, entryId: 'meal' });
  assert.equal(state.entries[0].portion, '碗');
  assert.equal(state.entries[0].quantity, '0.2');
  assert.equal(summarizeDay(state, yesterday).total, '0.03');
});


test('字典计算精确，允许调整本次热量并拒绝无效选择和数量', () => {
  assert.equal(multiplyEnergy('0.1', '0.2'), '0.02');
  assert.equal(multiplyEnergy('12.5', '1.2'), '15');
  const large = multiplyEnergy('9999999999999999', '9999999999999999');
  assert.equal(food(emptyState(), { kcal: large }, 'large').entries[0].kcal, large);
  let state = saveDictionaryFood(emptyState(), { name: '鸡蛋', note: '熟', portions: [{ name: '个', kcal: '80' }] }, { id: 'egg' });
  const input = { date: today, meal: 'breakfast', dictionaryFoodId: 'egg', portionIndex: '0', quantity: '1.5', kcal: '125' };
  for (const invalid of [{ quantity: '0' }, { quantity: '-1' }, { portionIndex: '1' }, { dictionaryFoodId: 'missing' }]) {
    assert.throws(() => saveFood(state, { ...input, ...invalid }, { today, id: 'invalid' }));
  }
  state = saveFood(state, input, { today, id: 'egg-entry' });
  assert.equal(summarizeDay(state, today).total, '125');
  assert.equal(state.foods[0].portions[0].kcal, '80');
});
