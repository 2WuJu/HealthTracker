export const SOURCE_VERSION = '中国 DRIs 2023 · 核对版 2026-10-23';
export const MEALS = Object.freeze([
  { id: 'breakfast', name: '早餐', icon: 'sunrise', tone: 'amber' },
  { id: 'lunch', name: '午餐', icon: 'sun', tone: 'sage' },
  { id: 'dinner', name: '晚餐', icon: 'moon', tone: 'blue' },
  { id: 'snack', name: '加餐', icon: 'cup', tone: 'rose' },
]);
export const ACTIVITY_LABELS = Object.freeze({ low: '低活动', moderate: '中活动', high: '高活动' });

// 18–49 岁：CNS 原表 MJ/d ÷ 4.184 × 1000，取最近 50 kcal。
// 50+：香港卫生署转引中国 DRIs 2023。详细证据见 docs/energy-basis.md。
export const ENERGY_TABLE = Object.freeze([
  { min: 18, max: 29, label: '18–29 岁', male: [2150, 2550, 3000], female: [1700, 2100, 2450], source: 'cns-2023-tables-9-10' },
  { min: 30, max: 49, label: '30–49 岁', male: [2050, 2500, 2950], female: [1700, 2050, 2400], source: 'cns-2023-tables-11-12' },
  { min: 50, max: 64, label: '50–64 岁', male: [1950, 2400, 2800], female: [1600, 1950, 2300], source: 'hk-dh-cn-dris-2023-page-2' },
  { min: 65, max: 74, label: '65–74 岁', male: [1900, 2300, null], female: [1550, 1850, null], source: 'hk-dh-cn-dris-2023-page-2' },
  { min: 75, max: Infinity, label: '75 岁及以上', male: [1800, 2200, null], female: [1500, 1750, null], source: 'hk-dh-cn-dris-2023-page-2' },
]);

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return year >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function shiftDate(value, days) {
  if (!isCalendarDate(value)) throw new Error('请选择有效日期。');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function normalizeEnergy(input) {
  const text = String(input ?? '').trim();
  if (!text || text.length > 30 || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
    throw new Error('请填写本次摄入的千卡数，可为 0 或小数，不能是负数。');
  }
  const [integer = '', fraction = ''] = text.split('.');
  const whole = integer.replace(/^0+(?=\d)/, '') || '0';
  const decimal = fraction.replace(/0+$/, '');
  return decimal ? `${whole}.${decimal}` : whole;
}

function decimalParts(value) {
  const text = String(value);
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error('热量数值无效。');
  const [whole, decimal = ''] = text.split('.');
  return { digits: BigInt(whole + decimal), scale: decimal.length };
}

function fromScaled(value, scale) {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0');
  const whole = scale ? digits.slice(0, -scale) : digits;
  const decimal = scale ? digits.slice(-scale).replace(/0+$/, '') : '';
  return `${negative ? '-' : ''}${whole}${decimal ? `.${decimal}` : ''}`;
}

export function sumEnergy(values) {
  const parts = values.map(decimalParts);
  const scale = parts.reduce((max, item) => Math.max(max, item.scale), 0);
  const total = parts.reduce((sum, item) => sum + item.digits * 10n ** BigInt(scale - item.scale), 0n);
  return fromScaled(total, scale);
}

export function subtractEnergy(left, right) {
  const a = decimalParts(left);
  const b = decimalParts(right);
  const scale = Math.max(a.scale, b.scale);
  return fromScaled(a.digits * 10n ** BigInt(scale - a.scale) - b.digits * 10n ** BigInt(scale - b.scale), scale);
}

export function formatEnergy(value) {
  if (value === null || value === undefined) return '—';
  const [whole, fraction] = String(value).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
}

export function validateProfile(input) {
  const ageText = String(input.age ?? '').trim();
  const age = Number(ageText);
  if (!/^\d+$/.test(ageText) || !Number.isSafeInteger(age) || age < 18) {
    throw new Error('请填写 18 岁及以上的周岁年龄。');
  }
  if (!['male', 'female'].includes(input.sex)) throw new Error('请选择参考表所用的性别分组。');
  if (!Object.hasOwn(ACTIVITY_LABELS, input.activity)) throw new Error('请选择日常活动水平。');
  return { age, sex: input.sex, activity: input.activity };
}

export function lookupReference(input) {
  const profile = validateProfile(input);
  const row = ENERGY_TABLE.find(item => profile.age >= item.min && profile.age <= item.max);
  const activityIndex = ['low', 'moderate', 'high'].indexOf(profile.activity);
  return { kcal: row[profile.sex][activityIndex], ageGroup: row.label, sourceId: row.source, sourceVersion: SOURCE_VERSION };
}

export function emptyState() {
  return { version: 2, entries: [], references: [], foods: [] };
}

export function saveProfile(state, input, effectiveDate) {
  if (!isCalendarDate(effectiveDate)) throw new Error('个人信息生效日期无效。');
  const profile = validateProfile(input);
  const snapshot = { effectiveDate, profile, ...lookupReference(profile) };
  return {
    ...state,
    references: [...state.references.filter(item => item.effectiveDate !== effectiveDate), snapshot]
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)),
  };
}

export function referenceForDate(state, date) {
  return state.references.filter(item => item.effectiveDate <= date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null;
}

export function saveFood(state, input, { today = localDate(), entryId = null, id = globalThis.crypto.randomUUID() } = {}) {
  if (!isCalendarDate(input.date) || input.date > today) throw new Error('饮食日期只能选择今天或过去的有效日期。');
  if (!MEALS.some(meal => meal.id === input.meal)) throw new Error('请选择餐次。');
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('请填写食物名称，也可以在名称中写明份量。');
  if (name.length > 200) throw new Error('食物名称请控制在 200 字以内。');
  const kcal = normalizeEnergy(input.kcal);
  const record = { id: entryId ?? id, date: input.date, meal: input.meal, name, kcal };
  if (entryId && !state.entries.some(item => item.id === entryId)) throw new Error('这条记录已不存在，请刷新后重试。');
  return { ...state, entries: entryId ? state.entries.map(item => item.id === entryId ? record : item) : [...state.entries, record] };
}

export function removeFood(state, id) {
  if (!state.entries.some(item => item.id === id)) throw new Error('这条记录已不存在，请刷新后重试。');
  return { ...state, entries: state.entries.filter(item => item.id !== id) };
}

export function summarizeDay(state, date) {
  const entries = state.entries.filter(item => item.date === date);
  const total = entries.length ? sumEnergy(entries.map(item => item.kcal)) : null;
  const reference = referenceForDate(state, date);
  return {
    date, entries, total, reference,
    difference: total !== null && reference?.kcal != null ? subtractEnergy(total, reference.kcal) : null,
    meals: Object.fromEntries(MEALS.map(meal => {
      const foods = entries.filter(item => item.meal === meal.id);
      return [meal.id, { entries: foods, total: foods.length ? sumEnergy(foods.map(item => item.kcal)) : null }];
    })),
  };
}

export function recordedDates(state) {
  return [...new Set(state.entries.map(item => item.date))].sort().reverse();
}

export function saveDictionaryFood(state, input, { foodId = null, id = globalThis.crypto.randomUUID() } = {}) {
  const name = String(input.name ?? '').trim();
  const note = String(input.note ?? '').trim();
  if (!name || name.length > 200) throw new Error('请填写 200 字以内的食物名称。');
  if (note.length > 500) throw new Error('备注请控制在 500 字以内。');
  if (!Array.isArray(input.portions) || !input.portions.length) throw new Error('请至少填写一个份量。');
  const portions = input.portions.map(portion => {
    const name = String(portion.name ?? '').trim();
    if (!name || name.length > 100) throw new Error('请填写 100 字以内的份量名称。');
    return { name, kcal: normalizeEnergy(portion.kcal) };
  });
  if (foodId && !state.foods.some(food => food.id === foodId)) throw new Error('这种食物已不存在，请刷新后重试。');
  const food = { id: foodId ?? id, name, note, portions };
  return { ...state, foods: foodId ? state.foods.map(item => item.id === foodId ? food : item) : [...state.foods, food] };
}

export function removeDictionaryFood(state, id) {
  if (!state.foods.some(food => food.id === id)) throw new Error('这种食物已不存在，请刷新后重试。');
  return { ...state, foods: state.foods.filter(food => food.id !== id) };
}
