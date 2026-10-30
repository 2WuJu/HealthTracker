import { PRESET_FOODS, PRESET_VERSION } from './presets.mjs';
import { emptyState, isCalendarDate, MEALS, normalizeEnergy, validateProfile } from './domain.mjs';

export const STORAGE_KEY = 'healthy-tracker.v1';
const clone = value => structuredClone(value);

function assert(condition) {
  if (!condition) throw new Error('保存的数据格式不完整。');
}

export function validateState(state) {
  assert(state && [1, 2].includes(state.version) && Array.isArray(state.entries) && Array.isArray(state.references));
  if (state.recentFoodIds !== undefined) {
    assert(Array.isArray(state.recentFoodIds) && state.recentFoodIds.length <= 10 && state.recentFoodIds.every(id => typeof id === 'string' && id.length > 0));
    assert(new Set(state.recentFoodIds).size === state.recentFoodIds.length);
  }
  if (state.version === 2) {
    assert(Array.isArray(state.foods));
    const foodIds = new Set();
    for (const food of state.foods) {
      assert(food && typeof food.id === 'string' && food.id.length > 0 && !foodIds.has(food.id));
      foodIds.add(food.id);
      assert(typeof food.name === 'string' && food.name.trim().length > 0 && food.name.length <= 200);
      assert(typeof food.note === 'string' && food.note.length <= 500);
      assert(Array.isArray(food.portions) && (food.portions.length > 0 || food.kcalPer100g !== undefined));
      if (food.kcalPer100g !== undefined) assert(typeof food.kcalPer100g === 'string' && normalizeEnergy(food.kcalPer100g) === food.kcalPer100g);
      if (food.source !== undefined) assert(food.source && typeof food.source.version === 'string' && typeof food.source.url === 'string');
      for (const portion of food.portions) {
        assert(portion && typeof portion.name === 'string' && portion.name.trim().length > 0 && portion.name.length <= 100);
        assert(typeof portion.kcal === 'string' && normalizeEnergy(portion.kcal) === portion.kcal);
      }
    }
  }
  if (state.presetCatalog !== undefined) {
    const catalog = state.presetCatalog;
    assert(catalog && typeof catalog.version === 'string' && Array.isArray(catalog.foods));
    if (catalog.overridden !== undefined) assert(Array.isArray(catalog.overridden) && catalog.overridden.every(id => typeof id === 'string'));
    assert(catalog.foods.every(food => food && typeof food.id === 'string' && food.id.length > 0));
    assert(new Set(catalog.foods.map(food => food.id)).size === catalog.foods.length);
  }
  const ids = new Set();
  for (const entry of state.entries) {
    assert(typeof entry.id === 'string' && entry.id.length > 0 && !ids.has(entry.id));
    ids.add(entry.id);
    assert(isCalendarDate(entry.date) && MEALS.some(meal => meal.id === entry.meal));
    assert(typeof entry.name === 'string' && entry.name.trim().length > 0 && entry.name.length <= 200);
    assert(typeof entry.kcal === 'string' && normalizeEnergy(entry.kcal, 61) === entry.kcal);
    if (entry.portion !== undefined || entry.quantity !== undefined) {
      assert(typeof entry.portion === 'string' && entry.portion.trim().length > 0 && entry.portion.length <= 100);
      assert(typeof entry.quantity === 'string' && normalizeEnergy(entry.quantity) === entry.quantity && entry.quantity !== '0');
    }
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

function reconcilePresets(state, catalog) {
  const old = state.presetCatalog?.foods ?? [];
  const overridden = new Set(state.presetCatalog?.overridden ?? []);
  const oldById = new Map(old.map(food => [food.id, food]));
  const newById = new Map(catalog.foods.map(food => [food.id, food]));
  const foods = state.foods.flatMap(food => {
    const previous = oldById.get(food.id);
    if (!previous || overridden.has(food.id)) return [food];
    if (JSON.stringify(food) !== JSON.stringify(previous)) { overridden.add(food.id); return [food]; }
    return newById.has(food.id) ? [clone(newById.get(food.id))] : [];
  });
  for (const food of catalog.foods) {
    if (!oldById.has(food.id) && !foods.some(item => item.id === food.id)) foods.push(clone(food));
  }
  const baseline = [...catalog.foods, ...old.filter(food => !newById.has(food.id))];
  return { ...state, foods, presetCatalog: { version: catalog.version, foods: clone(baseline), overridden: [...overridden] } };
}

export function createRepository(storage, catalog = { foods: PRESET_FOODS, version: PRESET_VERSION }) {
  let state = reconcilePresets(emptyState(), catalog);
  let raw = null;
  let error = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const stored = validateState(JSON.parse(raw));
      state = reconcilePresets(stored.version === 1 ? { ...stored, version: 2, foods: [] } : stored, catalog);
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
