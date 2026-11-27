export type Photo = {
  url: string;
  alt: string;
  illustrative?: boolean;
  generated?: boolean;
  sourceUrl?: string;
  license?: string;
};

export type Portion = {
  _key: string;
  label?: string;
  price: number;
  unit: string;
  weight?: string;
};

export type Dish = {
  _id: string;
  name: string;
  categoryId: string;
  available: boolean;
  description?: string;
  ingredients?: string;
  allergens?: string;
  photo?: Photo;
  portions: Portion[];
};

export type SiteData = {
  home: {
    name: string;
    title: string;
    subtitle: string;
    emptyMenu: string;
    photo?: Photo;
  };
  delivery: {
    phone: string;
    address: string;
    hours?: string;
    zone?: string;
    cost?: string;
    minimum?: string;
    pickup?: boolean;
    pickupDetails?: string;
  };
  seo: { title?: string; description?: string; noIndex?: boolean };
  categories: { _id: string; name: string }[];
  dishes: Dish[];
};

export const defaults: SiteData = {
  home: {
    name: "Домашняя еда в Парк-Бутово",
    title: "Домашняя еда с доставкой",
    subtitle: "Выберите блюдо из меню и позвоните, чтобы оформить заказ",
    emptyMenu: "Актуальное меню и цены можно уточнить по телефону",
  },
  delivery: { phone: "+7 (977) 169-89-97", address: "ЖК «Парк-Бутова», дом 20" },
  seo: {},
  categories: [],
  dishes: [],
};

export function telephone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8") && !phone.trim().startsWith("+")) {
    return "tel:+7" + digits.slice(1);
  }
  return "tel:+" + (digits.length === 10 ? "7" : "") + digits;
}
