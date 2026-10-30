# 预置食物的来源和范围

预置食物来自美国农业部农业研究局 [FoodData Central](https://fdc.nal.usda.gov/)，选用 [SR Legacy 2018 年 4 月发布版](https://fdc.nal.usda.gov/download-datasets/) 的 food.csv 描述和 food_nutrient.csv 中营养素 1008（Energy，千卡／100 克）。数据由 USDA 以 [CC0 1.0](https://fdc.nal.usda.gov/api-guide/) 发布，可复制和修改；应用中每个条目均链接到其 FDC 编号。建议引用：U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019, fdc.nal.usda.gov。

本应用随附的子集为 19 种条目：米饭、豆腐、鸡蛋、猪里脊、鸡胸肉、黄豆芽、大小白菜、菠菜、香菇、黄瓜、胡萝卜、番茄、牛奶、豆油、面粉、香蕉和苹果。具体形态（生熟、部位及加工方式）见应用中的名称和英文原始描述；这不是完整的中餐数据库，也不代表中国当地食材或烹调菜肴的统一热量。用户应匹配食材的实际形态；烹饪过程中添加的油和其他配料需另行记录。数值为估算，每 100 克以原始数据为准，不推算日常份量。用户可以自行添加独立份量及其热量。

预置身份使用 FDC 编号，而不是名称。每次发布须保留已有身份，更新 `PRESET_VERSION`，并在本文件记录所用来源版本与覆盖；已有用户的修改、删除和新增保留，未修改的预置条目可随版本更新。历史饮食记录保留当时的快照。
