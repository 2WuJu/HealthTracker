export const PRESET_VERSION = 'SR Legacy 2018-04 + FNDDS 2021-2023 + TFDA 2026-10 · 3';
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
    "猪腰肉（整块，生，瘦肉和脂肪）",
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

// FNDDS food codes persist across releases; FDC IDs identify the cited release.
const dishRows = [
  [
    "27120060",
    "2706401",
    "糖醋猪肉",
    "Sweet and sour pork",
    "260"
  ],
  [
    "27146100",
    "2706435",
    "糖醋鸡肉或火鸡肉",
    "Sweet and sour chicken or turkey",
    "250"
  ],
  [
    "27150170",
    "2706456",
    "糖醋虾",
    "Sweet and sour shrimp",
    "172"
  ],
  [
    "27320500",
    "2706655",
    "糖醋猪肉配米饭",
    "Sweet and sour pork with rice",
    "187"
  ],
  [
    "27415110",
    "2706738",
    "牛肉西兰花",
    "Beef and broccoli",
    "160"
  ],
  [
    "27415170",
    "2706743",
    "宫保牛肉",
    "Kung Pao beef",
    "216"
  ],
  [
    "27420150",
    "2706763",
    "宫保猪肉",
    "Kung Pao pork",
    "219"
  ],
  [
    "27420160",
    "2706764",
    "木须肉（不含饼）",
    "Moo Shu pork, without Chinese pancake",
    "153"
  ],
  [
    "27445220",
    "2706796",
    "宫保鸡丁",
    "Kung pao chicken",
    "129"
  ],
  [
    "27450470",
    "2706857",
    "宫保虾",
    "Kung Pao shrimp",
    "173"
  ],
  [
    "27415120",
    "2706739",
    "牛肉豆腐蔬菜（酱油汁）",
    "Beef, tofu, and vegetables including carrots, broccoli, and/or dark-green leafy; no potatoes, soy-based sauce",
    "115"
  ],
  [
    "27420100",
    "2706760",
    "猪肉豆腐蔬菜（酱油汁）",
    "Pork, tofu, and vegetables including carrots, broccoli, and/or dark-green leafy; no potatoes, soy-base sauce",
    "116"
  ],
  [
    "41812500",
    "2707476",
    "豆腐蔬菜（酱油汁）",
    "Tofu and vegetables including carrots, broccoli, and/or dark-green leafy; no potatoes, with soy-based sauce",
    "92"
  ],
  [
    "32130400",
    "2707229",
    "番茄炒蛋或煎蛋（加油）",
    "Egg omelet or scrambled egg, with tomatoes, fat added",
    "165"
  ],
  [
    "32130410",
    "2707230",
    "番茄炒蛋或煎蛋（不加油）",
    "Egg omelet or scrambled egg, with tomatoes, no added fat",
    "127"
  ],
  [
    "32130010",
    "2707200",
    "炒蛋或煎蛋（加油）",
    "Egg omelet or scrambled egg, made with oil",
    "192"
  ],
  [
    "28340750",
    "2707136",
    "酸辣汤",
    "Soup, hot and sour",
    "39"
  ],
  [
    "32300100",
    "2707282",
    "蛋花汤",
    "Soup, egg drop",
    "27"
  ],
  [
    "58408010",
    "2709160",
    "馄饨汤",
    "Soup, wonton",
    "33"
  ],
  [
    "56205101",
    "2708418",
    "白粥",
    "Congee",
    "39"
  ],
  [
    "58157300",
    "2708981",
    "肉类或海鲜粥",
    "Congee, with meat, poultry, and/or seafood",
    "58"
  ],
  [
    "58157310",
    "2708982",
    "肉类或海鲜蔬菜粥",
    "Congee, with meat, poultry, and/or seafood, and vegetables",
    "48"
  ],
  [
    "58157320",
    "2708983",
    "蔬菜粥",
    "Congee, with vegetables",
    "38"
  ],
  [
    "58157330",
    "2708984",
    "鸡蛋粥",
    "Congee, with egg",
    "60"
  ],
  [
    "58150110",
    "2708951",
    "素炒饭",
    "Rice, fried, meatless",
    "174"
  ],
  [
    "58150320",
    "2708953",
    "鸡肉炒饭",
    "Rice, fried, with chicken",
    "173"
  ],
  [
    "58150330",
    "2708954",
    "猪肉炒饭",
    "Rice, fried, with pork",
    "179"
  ],
  [
    "58150340",
    "2708955",
    "牛肉炒饭",
    "Rice, fried, with beef",
    "178"
  ],
  [
    "58150510",
    "2708956",
    "虾炒饭",
    "Rice, fried, with shrimp",
    "166"
  ],
  [
    "27313110",
    "2706607",
    "牛肉炒面（含蔬菜）",
    "Beef chow mein or chop suey with noodles",
    "129"
  ],
  [
    "27320310",
    "2706648",
    "猪肉炒面（含蔬菜）",
    "Pork chow mein or chop suey with noodles",
    "143"
  ],
  [
    "27343910",
    "2706687",
    "鸡肉或火鸡炒面（含蔬菜）",
    "Chicken or turkey chow mein or chop suey with noodles",
    "131"
  ],
  [
    "27350050",
    "2706712",
    "虾炒面（含蔬菜）",
    "Shrimp chow mein or chop suey with noodles",
    "117"
  ],
  [
    "75460900",
    "2710069",
    "素炒面（含蔬菜）",
    "Chow mein or chop suey, meatless, with noodles",
    "117"
  ],
  [
    "58136110",
    "2708798",
    "捞面（配料未注明）",
    "Lo mein, NFS",
    "121"
  ],
  [
    "58136120",
    "2708799",
    "素捞面",
    "Lo mein, meatless",
    "121"
  ],
  [
    "58136130",
    "2708800",
    "虾捞面",
    "Lo mein, with shrimp",
    "121"
  ],
  [
    "58136140",
    "2708801",
    "猪肉捞面",
    "Lo mein, with pork",
    "138"
  ],
  [
    "58136150",
    "2708802",
    "牛肉捞面",
    "Lo mein, with beef",
    "129"
  ],
  [
    "58136160",
    "2708803",
    "鸡肉捞面",
    "Lo mein, with chicken",
    "130"
  ],
  [
    "58135110",
    "2708796",
    "肉和蔬菜炒河粉",
    "Chow fun noodles with meat and vegetables",
    "102"
  ],
  [
    "58135120",
    "2708797",
    "蔬菜炒河粉（无肉）",
    "Chow fun noodles with vegetables, meatless",
    "74"
  ],
  [
    "56117090",
    "2708356",
    "米粉（熟）",
    "Rice noodles, cooked",
    "107"
  ],
  [
    "56116990",
    "2708355",
    "绿豆粉丝（熟）",
    "Long rice noodles, made from mung beans, cooked",
    "84"
  ],
  [
    "58112510",
    "2708708",
    "蒸馄饨或饺子（馅料未注明）",
    "Wonton, dumpling or pot sticker, steamed",
    "113"
  ],
  [
    "58111110",
    "2708705",
    "煎炸馄饨或饺子（馅料未注明）",
    "Wonton, dumpling or pot sticker, fried",
    "192"
  ],
  [
    "58110110",
    "2708700",
    "素春卷（炸）",
    "Egg roll, meatless",
    "270"
  ],
  [
    "58110130",
    "2708702",
    "牛肉或猪肉春卷（炸）",
    "Egg roll, with beef and/or pork",
    "272"
  ],
  [
    "58110170",
    "2708703",
    "鸡肉或火鸡春卷（炸）",
    "Egg roll, with chicken or turkey",
    "266"
  ],
  [
    "55501000",
    "2708343",
    "中式薄饼",
    "Chinese pancake",
    "207"
  ],
  [
    "75403200",
    "2710041",
    "川味四季豆（熟）",
    "Green beans, cooked, Szechuan-style",
    "106"
  ],
  [
    "75340020",
    "2710036",
    "亚洲风味炒蔬菜（加油）",
    "Asian stir fry vegetables, cooked, fat added",
    "71"
  ],
  [
    "75210020",
    "2709888",
    "大白菜（熟，加油）",
    "Cabbage, Chinese, cooked, fat added",
    "37"
  ],
  [
    "72203070",
    "2709658",
    "芥兰（熟）",
    "Broccoli, Chinese, cooked",
    "50"
  ],
  [
    "26319130",
    "2706363",
    "虾（蒸或煮）",
    "Shrimp, steamed or boiled",
    "90"
  ],
  [
    "41420020",
    "2707436",
    "毛豆（熟）",
    "Edamame, cooked",
    "140"
  ],
  [
    "73405010",
    "2709702",
    "红薯（煮，不加油）",
    "Sweet potato, boiled, no added fat",
    "82"
  ],
  [
    "56205018",
    "2708414",
    "糙米饭（熟，不加油）",
    "Rice, brown, cooked, no added fat",
    "123"
  ],
  [
    "11320100",
    "2705405",
    "豆奶（无糖）",
    "Soy milk, unsweetened",
    "38"
  ],
  [
    "11320000",
    "2705404",
    "豆奶（加糖）",
    "Soy milk, sweetened",
    "53"
  ]
];
PRESET_FOODS.push(...dishRows.map(([code, id, name, note, kcalPer100g]) => ({
  id: `usda-fndds-${code}`, name, note, kcalPer100g, portions: [],
  source: { version: 'FNDDS 2021-2023', url: `https://fdc.nal.usda.gov/food-details/${id}/nutrients` },
})));

// Taiwan FDA samples, using their integrated IDs and kcal per 100 g.
const taiwanRows = [
  [
    "K0120102",
    "卤鸡蛋（现煮）",
    "雞滷蛋(現煮)",
    "178",
    "前處理描述:將水煮蛋加醬油與一次水各2L,以小火煮約2小時,撈出瀝乾均質"
  ],
  [
    "K0150101",
    "煎蛋（不加油）",
    "煎蛋(不加油)",
    "161",
    "前處理描述:雞蛋去殼打勻,小火加熱不沾鍋2~3分鐘,分五次倒入蛋液,兩面煎熟後,取出放冷均質"
  ],
  [
    "K0150201",
    "炒蛋（加油）",
    "炒蛋(加油3大匙)",
    "215",
    "前處理描述:雞蛋去殼打勻,於不沾鍋中加入3大匙油,熱鍋2分鐘,倒入蛋液以小火快炒3分鐘,取出放冷均質"
  ],
  [
    "R5101101",
    "卤猪脚（去骨）",
    "滷豬腳",
    "237",
    "前處理描述:去骨,混合均勻打碎"
  ],
  [
    "R5101001",
    "卤牛筋",
    "滷牛筋",
    "119",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R5100101",
    "叉烧肉（真空包装）",
    "叉燒肉",
    "253",
    "樣品狀態:真空包裝(豬肉,鹽,糖,醬油,紅麴醬,調味料等); 前處理描述:混合均勻打碎"
  ],
  [
    "R7300101",
    "烤鸡（去骨）",
    "烤雞",
    "233",
    "樣品狀態:全雞肉; 前處理描述:去頭尾,去骨,混合均勻打碎"
  ],
  [
    "R2100101",
    "炒粄条",
    "炒板條",
    "149",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R0100101",
    "广东粥",
    "廣東粥",
    "81",
    "前處理描述:混合均勻打碎(花枝,豬肝,油條,蛋等)"
  ],
  [
    "R2201301",
    "温州馄饨（去汤）",
    "溫州餛飩",
    "145",
    "樣品狀態:去湯; 前處理描述:混合均勻打碎"
  ],
  [
    "R2201401",
    "猪肉锅贴",
    "豬肉鍋貼",
    "238",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2201501",
    "高丽菜水饺（熟）",
    "熟水餃(高麗菜水餃)",
    "199",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2301101",
    "小笼包",
    "小籠包",
    "242",
    "前處理描述:混合均勻打碎(豬肉,麵粉等)"
  ],
  [
    "R2800301",
    "水煎包",
    "水煎包",
    "166",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2800401",
    "牛肉馅饼",
    "牛肉餡餅",
    "225",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2800501",
    "猪肉馅饼",
    "豬肉餡餅",
    "327",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2800101",
    "韭菜盒子",
    "韭菜盒子",
    "217",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2400201",
    "白馒头",
    "白饅頭",
    "248",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2400401",
    "花卷",
    "花捲",
    "227",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2700101",
    "葱油饼",
    "蔥油餅",
    "305",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R2700401",
    "烧饼",
    "燒餅",
    "323",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R3000101",
    "油条",
    "油條",
    "551",
    "前處理描述:混合均勻打碎"
  ],
  [
    "R0400101",
    "肉粽",
    "肉粽",
    "235",
    "前處理描述:混合均勻打碎(豬肉,香菇,鴨蛋黃,花生等)"
  ],
  [
    "R3000301",
    "蚵仔煎（不含酱料）",
    "蚵仔煎",
    "192",
    "樣品狀態:不含醬料; 前處理描述:混合均勻打碎"
  ],
  [
    "R2100401",
    "担仔面（含肉燥，去汤）",
    "擔仔麵",
    "124",
    "樣品狀態:含肉燥,去湯; 前處理描述:混合均勻打碎"
  ],
  [
    "R5000301",
    "咸豆浆（含油条菜脯）",
    "鹹豆漿",
    "37",
    "樣品狀態:散裝(含油條,菜脯等); 前處理描述:混合均勻打碎"
  ]
];
PRESET_FOODS.push(...taiwanRows.map(([id, name, original, kcalPer100g, description]) => ({
  id: `tfda-${id}`, name, note: `样品编号 ${id}；原样品：${original}；${description}`, kcalPer100g, portions: [],
  source: { name: '台湾卫生福利部食品药物管理署 · 食品营养成分资料集', version: '2026-10-05', url: 'https://data.gov.tw/dataset/8543' },
})));
