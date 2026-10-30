export const PRESET_VERSION = 'SR Legacy 2018-04 · 1';
const rows = [
  [
    "169757",
    "白米饭（熟，无盐）",
    "Rice, white, long-grain, regular, unenriched, cooked without salt",
    "130"
  ],
  [
    "169712",
    "白米饭（中餐馆蒸制）",
    "Rice, white, steamed, Chinese restaurant",
    "151"
  ],
  [
    "172475",
    "豆腐（生，硬质，硫酸钙凝固）",
    "Tofu, raw, firm, prepared with calcium sulfate",
    "144"
  ],
  [
    "171287",
    "鸡蛋（生）",
    "Egg, whole, raw, fresh",
    "143"
  ],
  [
    "169979",
    "大白菜（生）",
    "Cabbage, chinese (pe-tsai), raw",
    "16"
  ],
  [
    "170390",
    "小白菜（生）",
    "Cabbage, chinese (pak-choi), raw",
    "13"
  ],
  [
    "167818",
    "猪里脊（生，瘦肉和脂肪）",
    "Pork, fresh, loin, whole, separable lean and fat, raw",
    "198"
  ],
  [
    "171477",
    "鸡胸肉（熟，烤，无皮）",
    "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
    "165"
  ],
  [
    "169284",
    "黄豆芽（生）",
    "Soybeans, mature seeds, sprouted, raw",
    "122"
  ],
  [
    "168462",
    "菠菜（生）",
    "Spinach, raw",
    "23"
  ],
  [
    "169242",
    "香菇（生）",
    "Mushrooms, shiitake, raw",
    "34"
  ],
  [
    "168409",
    "黄瓜（生，带皮）",
    "Cucumber, with peel, raw",
    "15"
  ],
  [
    "170393",
    "胡萝卜（生）",
    "Carrots, raw",
    "41"
  ],
  [
    "170457",
    "番茄（生）",
    "Tomatoes, red, ripe, raw, year round average",
    "18"
  ],
  [
    "171265",
    "全脂牛奶（添加维生素D）",
    "Milk, whole, 3.25% milkfat, with added vitamin D",
    "61"
  ],
  [
    "171411",
    "大豆油",
    "Oil, soybean, salad or cooking",
    "884"
  ],
  [
    "168894",
    "小麦面粉（漂白，强化）",
    "Wheat flour, white, all-purpose, enriched, bleached",
    "364"
  ],
  [
    "173944",
    "香蕉（生）",
    "Bananas, raw",
    "89"
  ],
  [
    "171688",
    "苹果（生，带皮）",
    "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)",
    "52"
  ]
];
export const PRESET_FOODS = rows.map(([id, name, note, kcalPer100g]) => ({
  id: `usda-sr-${id}`, name, note, kcalPer100g, portions: [],
  source: { version: 'SR Legacy 2018-04', url: `https://fdc.nal.usda.gov/food-details/${id}/nutrients` },
}));
