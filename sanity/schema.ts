import { defineArrayMember, defineField, defineType } from "sanity";

const text = (name: string, title: string, required = false) =>
  defineField({ name, title, type: "string", validation: (rule) => required
    ? rule.required().regex(/\S/, { name: "непустое значение" })
    : rule });
const note = (name: string, title: string, rows = 2) =>
  defineField({ name, title, type: "text", rows });
const rank = () => defineField({
  name: "rank", title: "Порядок", type: "number", initialValue: 100,
  description: "Чем меньше число, тем выше позиция в меню.",
  validation: (rule) => rule.integer().min(0),
});
const orderings = [{ name: "rank", title: "Порядок в меню",
  by: [{ field: "rank", direction: "asc" as const }, { field: "name", direction: "asc" as const }] }];

const photo = () => defineField({
  name: "photo", title: "Фотография", type: "image", options: { hotspot: false },
  fields: [
    defineField({ name: "alt", title: "Описание изображения для экранного диктора", type: "string",
      validation: (rule) => rule.custom((value, ctx) => {
        return (ctx.parent as { asset?: unknown })?.asset && !value?.trim()
          ? "Опишите, что изображено на фотографии."
          : true;
      }) }),
    defineField({ name: "illustrative", title: "Фото для иллюстрации", type: "boolean" }),
    defineField({ name: "generated", title: "Иллюстрация создана ИИ", type: "boolean" }),
    defineField({ name: "sourceUrl", title: "Ссылка на оригинал стокового фото", type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }) }),
    text("license", "Лицензия стокового фото"),
  ],
  validation: (rule) => rule.custom((value) => {
    const image = value as { asset?: unknown; illustrative?: boolean; generated?: boolean; sourceUrl?: string; license?: string } | undefined;
    return image?.asset && image.illustrative && !image.generated && !(image.sourceUrl && image.license?.trim())
      ? "Для иллюстрации укажите источник и лицензию."
      : true;
  }),
});

const portion = defineArrayMember({
  type: "object", name: "portion", title: "Вариант продажи",
  fields: [
    text("label", "Название варианта, например «Семейная порция»"),
    defineField({
      name: "price", title: "Цена в рублях", type: "number",
      validation: (rule) => rule.required().positive().precision(2).max(1000000),
    }),
    defineField({
      name: "unit", title: "Единица продажи", type: "string",
      description: "Как в прайсе, например «за порцию», «за штуку» или «за 1 кг».",
      validation: (rule) => rule.required().regex(/\S/, { name: "непустое значение" }),
    }),
    text("weight", "Вес, например «350 г»"),
  ],
  preview: { select: { title: "label", price: "price", unit: "unit", weight: "weight" },
    prepare: ({ title, price, unit, weight }) => ({
      title: title || weight || unit || "Вариант продажи", subtitle: [price != null && price + " ₽", unit].filter(Boolean).join(" "),
    }) },
});

export const schemaTypes = [
  defineType({ name: "dish", title: "Блюдо", type: "document", orderings,
    fields: [
      text("name", "Название", true),
      defineField({ name: "category", title: "Категория", type: "reference", to: [{ type: "category" }],
        options: { disableNew: true }, validation: (rule) => rule.required() }),
      defineField({ name: "available", title: "Доступно для заказа", type: "boolean", initialValue: true }),
      rank(), photo(),
      defineField({ name: "portions", title: "Цены и размеры порций", type: "array", of: [portion],
        validation: (rule) => rule.required().min(1) }),
      note("description", "Описание"), note("ingredients", "Состав"), note("allergens", "Аллергены"),
    ],
    preview: { select: { title: "name", media: "photo", available: "available" },
      prepare: ({ title, media, available }) => ({ title, media, subtitle: available === false ? "Временно недоступно" : "" }) },
  }),
  defineType({ name: "category", title: "Категория", type: "document", orderings,
    fields: [text("name", "Название", true), rank()] }),
  defineType({ name: "home", title: "Главная", type: "document",
    initialValue: {
      name: "Домашняя еда в Парк-Бутово", title: "Домашняя еда с доставкой",
      subtitle: "Выберите блюдо из меню и позвоните, чтобы оформить заказ",
      emptyMenu: "Актуальное меню и цены можно уточнить по телефону",
    },
    fields: [text("name", "Название сайта", true), text("title", "Главный заголовок", true),
      text("subtitle", "Подзаголовок", true), text("emptyMenu", "Сообщение при пустом меню", true), photo()] }),
  defineType({ name: "delivery", title: "Доставка и контакты", type: "document",
    initialValue: { phone: "+7 (977) 169-89-97", address: "ЖК «Парк-Бутова», дом 20", pickup: false },
    fields: [
      defineField({ name: "phone", title: "Телефон", type: "string", validation: (rule) =>
        rule.required().custom((value) => !value || (/^[+\d\s().-]+$/.test(value) && /^\d{10,15}$/.test(value.replace(/\D/g, "")))
          ? true : "Введите телефон с кодом города или страны.") }),
      text("address", "Адрес", true), text("hours", "График"), text("zone", "Зона доставки"),
      text("cost", "Стоимость доставки"), text("minimum", "Минимальная сумма"),
      defineField({ name: "pickup", title: "Показывать самовывоз", type: "boolean" }),
      defineField({ name: "pickupDetails", title: "Условия самовывоза", type: "string",
        hidden: ({ document }) => document?.pickup !== true }),
    ],
  }),
  defineType({ name: "seo", title: "SEO", type: "document",
    fields: [
      defineField({ name: "title", title: "Заголовок для поисковых систем", type: "string",
        validation: (rule) => rule.max(65).warning("Рекомендуем до 65 символов.") }),
      defineField({ name: "description", title: "Описание для поисковых систем", type: "text", rows: 3,
        validation: (rule) => rule.max(160).warning("Рекомендуем до 160 символов.") }),
      defineField({ name: "noIndex", title: "Запретить индексацию", type: "boolean", initialValue: false }),
    ],
  }),
];
