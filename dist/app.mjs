import {
  ACTIVITY_LABELS, ENERGY_TABLE, MEALS, formatEnergy, isCalendarDate, localDate,
  lookupReference, multiplyEnergy, gramEnergy, recordedDates, referenceForDate, removeFood, saveFood,
  saveProfile, shiftDate, summarizeDay, saveDictionaryFood, removeDictionaryFood,
} from './domain.mjs';
import { createRepository, STORAGE_KEY } from './storage.mjs';

const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const repository = createRepository({
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
});
async function writeState(operation) {
  if (!navigator.locks) throw new Error('浏览器不支持安全的跨窗口写入，请使用支持 Web Locks 的浏览器。');
  return navigator.locks.request('healthy-tracker-storage-write', () => repository.write(operation));
}
let state = repository.read();
let selectedDate = localDate();
let lastToday = selectedDate;
let followsToday = true;
let editingId = null;
let profileDirty = false;
let editingDictionaryId = null;
let toastTimer;

function dateLabel(value, includeYear = false) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date.toLocaleDateString('zh-CN', { ...(includeYear ? { year: 'numeric' } : {}), month: 'long', day: 'numeric', weekday: 'long' });
}

function setError(id, message = '') {
  $(id).textContent = message;
  $(id).hidden = !message;
}

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
}

function profileInput() {
  return Object.fromEntries(new FormData($('profile-form')));
}

function updateProfilePreview() {
  try {
    const reference = lookupReference(profileInput());
    $('profile-preview').innerHTML = reference.kcal === null
      ? '<small>该组合暂无参考值</small>'
      : `${formatEnergy(reference.kcal)} <small>千卡 / 天</small>`;
    $('preview-group').textContent = reference.ageGroup;
  } catch {
    $('profile-preview').innerHTML = '— <small>千卡 / 天</small>';
    $('preview-group').textContent = '';
  }
  $('profile-status').textContent = profileDirty ? '未保存' : referenceForDate(state, localDate()) ? '已设置' : '未设置';
}

function renderProfile() {
  const current = referenceForDate(state, localDate());
  if (!profileDirty && current) {
    $('profile-age').value = current.profile.age;
    $('profile-sex').value = current.profile.sex;
    $('profile-activity').value = current.profile.activity;
  }
  updateProfilePreview();
  $('profile-effective-note').textContent = current
    ? `当前信息自 ${current.effectiveDate} 生效；修改后从今天起更新。`
    : '保存后从今天起生效；年龄需手动更新。';
}

function renderMeals(summary) {
  $('meal-list').innerHTML = MEALS.map(meal => {
    const data = summary.meals[meal.id];
    const foods = data.entries.length
      ? `<ul class="food-list">${data.entries.map(food => `<li class="food-row"><span class="food-name">${escapeHTML(food.name)}${food.portion ? ` · ${escapeHTML(food.quantity)} × ${escapeHTML(food.portion)}` : ''}</span><span class="food-energy">${formatEnergy(food.kcal)}<small>千卡</small></span><div class="food-actions"><button class="icon-button" type="button" data-action="edit" data-id="${escapeHTML(food.id)}" data-write aria-label="修改${escapeHTML(food.name)}">${icon('edit')}</button><button class="icon-button" type="button" data-action="delete" data-id="${escapeHTML(food.id)}" data-write aria-label="删除${escapeHTML(food.name)}">${icon('trash')}</button></div></li>`).join('')}</ul>`
      : `<div class="meal-empty"><button type="button" data-action="add" data-meal="${meal.id}" data-write>${icon('plus')}这餐还没有记录，添加食物</button></div>`;
    return `<article class="meal-card" aria-labelledby="meal-${meal.id}"><header class="meal-header"><span class="meal-icon ${meal.tone}">${icon(meal.icon)}</span><div class="meal-title"><h3 id="meal-${meal.id}">${meal.name}</h3><p>${data.entries.length ? `${data.entries.length} 项食物` : '还没有记录'}</p></div><div class="meal-total">${formatEnergy(data.total)}<small>千卡</small></div><button class="icon-button add-food" type="button" data-action="add" data-meal="${meal.id}" data-write aria-label="为${meal.name}添加食物">${icon('plus')}</button></header>${foods}</article>`;
  }).join('');
}

function renderDay() {
  const today = localDate();
  const summary = summarizeDay(state, selectedDate);
  $('selected-date').value = selectedDate;
  $('selected-date').max = today;
  $('food-date').max = today;
  $('date-title').textContent = dateLabel(selectedDate);
  $('day-badge').textContent = selectedDate === today ? '今天' : '历史';
  $('next-day').disabled = selectedDate >= today;
  $('previous-day').disabled = selectedDate === '0001-01-01';
  $('back-today').hidden = selectedDate === today;
  $('intake-value').textContent = formatEnergy(summary.total);
  $('intake-note').textContent = summary.entries.length ? `已记录 ${summary.entries.length} 项食物` : '还没有食物记录';
  $('reference-value').textContent = formatEnergy(summary.reference?.kcal);
  $('reference-source').textContent = summary.reference?.sourceVersion ?? '中国 DRIs 2023 · 人群参考';
  $('reference-note').textContent = !summary.reference
    ? (state.references.length ? '这个日期尚无参考值' : '填写个人信息后匹配')
    : summary.reference.kcal === null ? '该组合暂无参考值'
    : `${summary.reference.ageGroup} · ${summary.reference.profile.sex === 'male' ? '男性' : '女性'} · ${ACTIVITY_LABELS[summary.reference.profile.activity]}`;
  $('difference-value').textContent = summary.difference === null ? '—' : `${summary.difference.startsWith('-') ? '−' : summary.difference === '0' ? '' : '+'}${formatEnergy(summary.difference.replace(/^-/, ''))}`;
  $('difference-note').textContent = summary.total === null ? '记录后显示数值比较'
    : !summary.reference ? '这个日期尚无参考值，仅汇总摄入量'
    : summary.reference.kcal === null ? '参考表未提供此组合，暂不比较'
    : summary.difference === '0' ? '已记录量与参考值相同'
    : summary.difference.startsWith('-') ? '已记录量低于参考值' : '已记录量高于参考值';
  const progress = $('intake-progress');
  progress.hidden = summary.total === null || summary.reference?.kcal == null;
  if (!progress.hidden) {
    progress.max = summary.reference.kcal;
    progress.value = Math.min(Number(summary.total), summary.reference.kcal);
  }
  $('food-count').textContent = `${summary.entries.length} 条食物记录`;
  renderMeals(summary);
}

function renderWeek() {
  $('week-title').textContent = selectedDate === localDate() ? '近 7 天' : '所选日期及之前 6 天';
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(selectedDate, index - 6)).filter(isCalendarDate);
  $('week-strip').innerHTML = days.map(date => {
    const summary = summarizeDay(state, date);
    const weekdayDate = new Date(`${date}T12:00:00`);
    const weekday = weekdayDate.toLocaleDateString('zh-CN', { weekday: 'short' });
    return `<button class="week-day" type="button" data-action="select-date" data-date="${date}" aria-pressed="${date === selectedDate}" aria-label="查看${date}，${summary.total === null ? '暂无记录' : `已记录${summary.total}千卡`}"><span class="weekday">${date === localDate() ? '今天' : weekday}</span><span class="day-number">${Number(date.slice(-2))}</span><span class="day-energy">${formatEnergy(summary.total)}</span></button>`;
  }).join('');
}

function renderHistory() {
  const dates = recordedDates(state);
  $('history-list').innerHTML = dates.length
    ? dates.map(date => {
      const summary = summarizeDay(state, date);
      return `<button type="button" class="history-row" data-action="select-date" data-date="${date}"><span class="history-date">${dateLabel(date, true)}<small>${summary.entries.length} 项食物 · 点击查看明细</small></span><strong class="history-energy">${formatEnergy(summary.total)}<small>已记录千卡</small></strong></button>`;
    }).join('')
    : '<p class="history-empty">日记还没有开始。<br>记下第一餐，这里就会留下记录。</p>';
}

function render() {
  renderDay();
  renderWeek();
  renderProfile();
  renderHistory();
  document.querySelectorAll('[data-write]').forEach(button => { button.disabled = Boolean(repository.error); });
}

function selectDate(date) {
  if (!isCalendarDate(date) || date > localDate()) {
    setError('page-error', '请选择今天或过去的有效日期。');
    $('selected-date').value = selectedDate;
    return;
  }
  selectedDate = date;
  followsToday = date === localDate();
  setError('page-error', repository.error ?? '');
  render();
}

function openFood(meal = 'breakfast', entryId = null) {
  if (repository.error) return;
  const entry = entryId ? state.entries.find(food => food.id === entryId) : null;
  if (entryId && !entry) return;
  editingId = entryId;
  $('food-form').reset();
  $('food-source-fields').hidden = Boolean(entry);
  $('food-source').value = 'manual';
  $('food-search').value = '';
  $('food-quantity').value = '1';
  updateFoodSource();
  $('food-date').value = entry?.date ?? selectedDate;
  $('food-date').max = localDate();
  $('food-meal').value = entry?.meal ?? meal;
  $('food-name').value = entry?.name ?? '';
  $('food-kcal').value = entry?.kcal ?? '';
  $('food-dialog-title').textContent = entry ? '修改这条记录' : '添加一条食物';
  $('food-submit').textContent = entry ? '保存修改' : '保存记录';
  setError('food-error');
  $('food-dialog').showModal();
  $('food-name').focus();
}


function updateFoodSource() {
  const dictionary = $('food-source').value === 'dictionary' && !editingId;
  $('food-dictionary-fields').hidden = !dictionary;
  $('food-name-row').hidden = dictionary;
  $('food-choice').disabled = !dictionary;
  $('food-portion').disabled = !dictionary;
  $('food-quantity').disabled = !dictionary;
  if (dictionary) updateFoodChoices();
}

function updateFoodChoices() {
  const query = $('food-search').value.trim().toLocaleLowerCase();
  const foods = state.foods.filter(food => `${food.name} ${food.note}`.toLocaleLowerCase().includes(query));
  const previous = $('food-choice').value;
  $('food-choice').innerHTML = '<option value="">请选择食物</option>' + foods.map(food => `<option value="${escapeHTML(food.id)}">${escapeHTML(food.name)}${food.note ? ` · ${escapeHTML(food.note)}` : ''}</option>`).join('');
  if (foods.some(food => food.id === previous)) $('food-choice').value = previous;
  updateFoodPortions();
}

function updateFoodPortions() {
  const food = state.foods.find(item => item.id === $('food-choice').value);
  $('food-portion').innerHTML = food ? (food.kcalPer100g !== undefined ? `<option value="grams">克 · 每 100 克 ${formatEnergy(food.kcalPer100g)} 千卡</option>` : '') + food.portions.map((portion, index) => `<option value="${index}">${escapeHTML(portion.name)} · ${formatEnergy(portion.kcal)} 千卡</option>`).join('') : '<option value="">请选择份量</option>';
  updateFoodEstimate();
}

function updateFoodEstimate() {
  const food = state.foods.find(item => item.id === $('food-choice').value);
  const grams = $('food-portion').value === 'grams';
  const portion = food?.portions[Number($('food-portion').value)];
  try {
    if ((!portion && !grams) || !$('food-quantity').value.trim()) throw new Error();
    const estimate = grams ? gramEnergy(food.kcalPer100g, $('food-quantity').value) : multiplyEnergy(portion.kcal, $('food-quantity').value);
    $('food-estimate').textContent = `估算热量：${formatEnergy(estimate)} 千卡；可在下方调整本次热量。`;
    $('food-kcal').value = estimate;
  } catch {
    $('food-estimate').textContent = '选择食物和份量并输入数量后显示估算热量。';
    $('food-kcal').value = '';
  }
}

$('food-source').addEventListener('change', updateFoodSource);
$('food-search').addEventListener('input', updateFoodChoices);
$('food-choice').addEventListener('change', updateFoodPortions);
$('food-portion').addEventListener('change', updateFoodEstimate);
$('food-quantity').addEventListener('input', updateFoodEstimate);


function renderDictionary() {
  $('dictionary-list').innerHTML = state.foods.length ? state.foods.map(food => `<article class="dictionary-item"><div><strong>${escapeHTML(food.name)}</strong>${food.note ? `<p>${escapeHTML(food.note)}</p>` : ''}<p>${food.kcalPer100g !== undefined ? `每 100 克 ${formatEnergy(food.kcalPer100g)} 千卡 / ` : ''}${food.portions.map(portion => `${escapeHTML(portion.name)} · ${formatEnergy(portion.kcal)} 千卡`).join(' / ')}</p>${food.source ? `<p>来源：<a href="${escapeHTML(food.source.url)}" target="_blank" rel="noopener noreferrer">USDA FoodData Central · ${escapeHTML(food.source.version)}</a></p>` : ''}</div><div class="food-actions"><button class="icon-button" type="button" data-action="dictionary-edit" data-id="${escapeHTML(food.id)}" data-write aria-label="修改${escapeHTML(food.name)}">${icon('edit')}</button><button class="icon-button" type="button" data-action="dictionary-delete" data-id="${escapeHTML(food.id)}" data-write aria-label="删除${escapeHTML(food.name)}">${icon('trash')}</button></div></article>`).join('') : '<p class="history-empty">字典还是空的，添加常吃的食物吧。</p>';
  document.querySelectorAll('#dictionary-list [data-write]').forEach(button => { button.disabled = Boolean(repository.error); });
}

function addPortion(portion = { name: '', kcal: '' }) {
  const row = document.createElement('div');
  row.className = 'portion-row';
  row.innerHTML = `<label>份量名称<input name="portion-name" list="portion-options" maxlength="100" placeholder="例如：小碗" required></label><label>估算热量（千卡）<input name="portion-kcal" inputmode="decimal" maxlength="30" placeholder="例如：200" required></label><button class="text-button" type="button" data-action="portion-remove" aria-label="删除此份量">删除</button>`;
  row.querySelector('[name="portion-name"]').value = portion.name;
  row.querySelector('[name="portion-kcal"]').value = portion.kcal;
  $('portion-list').append(row);
}

function openDictionaryEditor(id = null) {
  const food = id ? state.foods.find(item => item.id === id) : null;
  if (id && !food) return;
  editingDictionaryId = id;
  $('dictionary-form').reset();
  $('dictionary-name').value = food?.name ?? '';
  $('dictionary-note').value = food?.note ?? '';
  $('dictionary-edit-title').textContent = food ? '修改食物' : '添加食物';
  $('portion-list').replaceChildren();
  (food?.portions ?? [undefined]).forEach(addPortion);
  setError('dictionary-form-error');
  $('dictionary-edit-dialog').showModal();
  $('dictionary-name').focus();
}

$('dictionary-form').addEventListener('submit', async event => {
  event.preventDefault();
  const portions = [...$('portion-list').querySelectorAll('.portion-row')].map(row => ({ name: row.querySelector('[name="portion-name"]').value, kcal: row.querySelector('[name="portion-kcal"]').value }));
  try {
    state = await writeState(current => saveDictionaryFood(current, { name: $('dictionary-name').value, note: $('dictionary-note').value, portions }, { foodId: editingDictionaryId }));
    $('dictionary-edit-dialog').close();
    setError('dictionary-error');
    renderDictionary();
    toast('食物已保存在本机');
  } catch (error) { setError('dictionary-form-error', error.message); }
});

$('food-form').addEventListener('submit', async event => {
  event.preventDefault();
  const fields = Object.fromEntries(new FormData(event.currentTarget));
  try {
    if ($('food-source').value === 'dictionary' && !editingId && !fields.dictionaryFoodId) throw new Error('请选择食物。');
    state = await writeState(current => saveFood(current, fields, { today: localDate(), entryId: editingId }));
    const edited = editingId !== null;
    $('food-dialog').close();
    selectDate(fields.date);
    toast(edited ? '修改已保存在本机' : '这笔饮食已记下');
  } catch (error) {
    setError('food-error', error.message);
  }
});

$('profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    state = await writeState(current => saveProfile(current, profileInput(), localDate()));
    profileDirty = false;
    setError('profile-error');
    setError('page-error');
    render();
    toast('个人信息已保存，从今天起生效');
  } catch (error) {
    setError('profile-error', error.message);
  }
});

function profileChanged() {
  profileDirty = true;
  setError('profile-error');
  updateProfilePreview();
}
$('profile-form').addEventListener('input', profileChanged);
$('profile-form').addEventListener('change', profileChanged);
$('selected-date').addEventListener('change', event => selectDate(event.target.value));
$('previous-day').addEventListener('click', () => selectDate(shiftDate(selectedDate, -1)));
$('next-day').addEventListener('click', () => selectDate(shiftDate(selectedDate, 1)));
$('back-today').addEventListener('click', () => selectDate(localDate()));

document.addEventListener('click', async event => {
  const close = event.target.closest('[data-close]');
  if (close) { $(close.dataset.close).close(); return; }
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case 'dictionary': renderDictionary(); setError('dictionary-error', repository.error ?? ''); $('dictionary-dialog').showModal(); break;
    case 'dictionary-add': openDictionaryEditor(); break;
    case 'dictionary-edit': openDictionaryEditor(button.dataset.id); break;
    case 'portion-add': addPortion(); break;
    case 'portion-remove': button.closest('.portion-row').remove(); break;
    case 'dictionary-delete': {
      const food = state.foods.find(item => item.id === button.dataset.id);
      if (!food || !window.confirm(`删除字典中的“${food.name}”？`)) break;
      try { state = await writeState(current => removeDictionaryFood(current, food.id)); setError('dictionary-error'); renderDictionary(); toast('食物已删除'); }
      catch (error) { setError('dictionary-error', error.message); }
      break;
    }
    case 'add': openFood(button.dataset.meal); break;
    case 'edit': openFood(undefined, button.dataset.id); break;
    case 'delete': {
      const entry = state.entries.find(food => food.id === button.dataset.id);
      if (!entry || !window.confirm(`删除“${entry.name}”这条饮食记录？`)) break;
      try {
        state = await writeState(current => removeFood(current, entry.id));
        render();
        setError('page-error');
        toast('这条记录已删除');
      } catch (error) { setError('page-error', error.message); }
      break;
    }
    case 'history': renderHistory(); $('history-dialog').showModal(); break;
    case 'profile': $('profile-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('profile-age').focus({ preventScroll: true }); break;
    case 'journal': $('journal').scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'select-date':
      selectDate(button.dataset.date);
      if ($('history-dialog').open) $('history-dialog').close();
      $('date-title').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      break;
  }
});

function checkDayRollover() {
  const today = localDate();
  if (today === lastToday) return;
  lastToday = today;
  if (followsToday) selectedDate = today;
  render();
}
setInterval(checkDayRollover, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDayRollover(); });
window.addEventListener('focus', checkDayRollover);
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    setError('page-error', '另一窗口的本机记录发生了变化，请刷新页面后继续，避免覆盖其他修改。');
  }
});

$('reference-table-body').innerHTML = ENERGY_TABLE.map(row => `<tr><th scope="row">${row.label}</th><td>${row.male.map(value => value ?? '—').join(' / ')}</td><td>${row.female.map(value => value ?? '—').join(' / ')}</td></tr>`).join('');
setError('page-error', repository.error ?? '');
render();
