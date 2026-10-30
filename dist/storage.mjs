import { emptyState, isCalendarDate, MEALS, normalizeEnergy, validateProfile } from './domain.mjs';

export const STORAGE_KEY = 'healthy-tracker.v1';
const clone = value => structuredClone(value);

function assert(condition) {
  if (!condition) throw new Error('保存的数据格式不完整。');
}

export function validateState(state) {
  assert(state && [1, 2].includes(state.version) && Array.isArray(state.entries) && Array.isArray(state.references));
  if (state.version === 2) {
    assert(Array.isArray(state.foods));
    const foodIds = new Set();
    for (const food of state.foods) {
      assert(food && typeof food.id === 'string' && food.id.length > 0 && !foodIds.has(food.id));
      foodIds.add(food.id);
      assert(typeof food.name === 'string' && food.name.trim().length > 0 && food.name.length <= 200);
      assert(typeof food.note === 'string' && food.note.length <= 500);
      assert(Array.isArray(food.portions) && food.portions.length > 0);
      for (const portion of food.portions) {
        assert(portion && typeof portion.name === 'string' && portion.name.trim().length > 0 && portion.name.length <= 100);
        assert(typeof portion.kcal === 'string' && normalizeEnergy(portion.kcal) === portion.kcal);
      }
    }
  }
  const ids = new Set();
  for (const entry of state.entries) {
    assert(typeof entry.id === 'string' && entry.id.length > 0 && !ids.has(entry.id));
    ids.add(entry.id);
    assert(isCalendarDate(entry.date) && MEALS.some(meal => meal.id === entry.meal));
    assert(typeof entry.name === 'string' && entry.name.trim().length > 0 && entry.name.length <= 200);
    assert(typeof entry.kcal === 'string' && normalizeEnergy(entry.kcal) === entry.kcal);
  }
  const dates = new Set();
  for (const reference of state.references) {
    assert(isCalendarDate(reference.effectiveDate) && !dates.has(reference.effectiveDate));
    dates.add(reference.effectiveDate);
    validateProfile(reference.profile);
    assert(reference.kcal === null || (Number.isSafeInteger(reference.kcal) && reference.kcal > 0));
    for (const key of ['ageGroup', 'sourceId', 'sourceVersion']) assert(typeof reference[key] === 'string' && reference[key].length > 0);
  }
  return state;
}

export function createRepository(storage) {
  let state = emptyState();
  let raw = null;
  let error = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const stored = validateState(JSON.parse(raw));
      state = stored.version === 1 ? { ...stored, version: 2, foods: [] } : stored;
    }
  } catch {
    error = '暂时无法读取本机记录。已有数据未被覆盖；请检查浏览器存储设置，或在原来的浏览器中重新打开。';
  }
  return {
    read: () => clone(state),
    get error() { return error; },
    write(operation) {
      if (error) throw new Error(error);
      let currentRaw;
      try { currentRaw = storage.getItem(STORAGE_KEY); }
      catch { throw new Error('无法访问浏览器存储，本次更改未保存。请保留当前输入并检查浏览器设置。'); }
      if (currentRaw !== raw) throw new Error('另一窗口已更改本机记录。为避免覆盖，请先刷新页面再操作。');
      const candidate = validateState(operation(clone(state)));
      const nextRaw = JSON.stringify(candidate);
      try { storage.setItem(STORAGE_KEY, nextRaw); }
      catch { throw new Error('本次更改未保存，已有记录保持不变。请检查浏览器存储空间或隐私设置后重试。'); }
      state = candidate;
      raw = nextRaw;
      return clone(state);
    },
  };
}
