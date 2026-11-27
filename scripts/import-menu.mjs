import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const menu = JSON.parse(await readFile(new URL("../lib/starter-menu.json", import.meta.url), "utf8"));
const categories = menu.categories.map((category, index) => ({
  ...category, _type: "category", rank: (index + 1) * 10,
}));
const categoryIds = new Set(categories.map(({ _id }) => _id));
const assetFiles = new Map();

for (const dish of menu.dishes) {
  if (!categoryIds.has(dish.categoryId) || !dish.name ||
      !dish.portions.length || dish.portions.some(({ price, unit }) => !(price > 0) || !unit)) {
    throw new Error("Проверьте данные блюда " + dish._id);
  }
  if (dish.photo) {
    assetFiles.set(dish._id, await readFile(new URL("../public" + dish.photo.url, import.meta.url)));
  }
}

if (process.argv.includes("--check")) {
  console.log(`${menu.dishes.length} блюд, ${categories.length} категорий, ${assetFiles.size} фото.`);
  process.exit(0);
}

const projectId = process.env.SANITY_PROJECT_ID?.trim();
const dataset = process.env.SANITY_DATASET?.trim();
const token = process.env.SANITY_IMPORT_TOKEN?.trim();
if (!projectId || !/^[a-z0-9]+$/.test(projectId) || !dataset || !token) {
  throw new Error("Укажите SANITY_PROJECT_ID, SANITY_DATASET и SANITY_IMPORT_TOKEN с правом записи.");
}

const base = "https://" + projectId + ".api.sanity.io/v2025-02-19";
const datasetPath = encodeURIComponent(dataset);

async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { Authorization: "Bearer " + token, ...options.headers },
  });
  if (!response.ok) throw new Error("Запрос к Sanity завершился с HTTP " + response.status);
  return response.json();
}

const ids = [...categories, ...menu.dishes].flatMap(({ _id }) => [_id, "drafts." + _id]);
const search = new URLSearchParams({
  query: "*[_id in $ids]._id", "$ids": JSON.stringify(ids), perspective: "raw",
});
const { result } = await request("/data/query/" + datasetPath + "?" + search);
const existing = new Set(result);
const missingCategories = categories.filter(({ _id }) => !existing.has(_id));
if (missingCategories.some(({ _id }) => existing.has("drafts." + _id))) {
  throw new Error("Опубликуйте существующие черновики начальных категорий перед импортом.");
}

const documents = [...missingCategories];
for (const [index, { categoryId, photo, ...dish }] of menu.dishes.entries()) {
  if (existing.has(dish._id) || existing.has("drafts." + dish._id)) continue;
  const document = {
    ...dish, _type: "dish", available: true, rank: (index + 1) * 10,
    category: { _type: "reference", _ref: categoryId },
    portions: dish.portions.map((portion) => ({ ...portion, _type: "portion" })),
  };
  if (photo) {
    const { url, ...meta } = photo;
    const filename = encodeURIComponent(basename(url));
    const { document: asset } = await request("/assets/images/" + datasetPath + "?filename=" + filename, {
      method: "POST", headers: { "Content-Type": "image/webp" }, body: assetFiles.get(dish._id),
    });
    document.photo = { ...meta, _type: "image", asset: { _type: "reference", _ref: asset._id } };
  }
  documents.push(document);
}

if (documents.length > 0) {
  await request("/data/mutate/" + datasetPath + "?visibility=sync", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: documents.map((document) => ({ createIfNotExists: document })) }),
  });
}
console.log("Импорт завершён. Новых документов к созданию: " + documents.length + ".");
