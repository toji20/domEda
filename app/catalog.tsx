"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Clipboard, Minus, Phone, Plus, ShoppingBag, Soup, X } from "lucide-react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import type { Dish, Portion, SiteData } from "../lib/model";

const storageKey = "park-butovo-order-v1";
const currency = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2, minimumFractionDigits: 0 });
const rubles = (kopecks: number) => currency.format(kopecks / 100);
const priceInKopecks = (price: number) => Math.round(price * 100);
const itemKey = (dish: Dish, portion: Portion) => dish._id + ":" + portion._key;
const portionDetails = (portion: Portion) => [portion.label, portion.weight].filter(Boolean).join(" · ");
const maxQuantity = 99;
type Quantities = Record<string, number>;

function readOrder(): Quantities {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, quantity]) =>
      Number.isInteger(quantity) && quantity > 0 && quantity <= maxQuantity));
  } catch {
    return {};
  }
}

export function Catalog({ dishes, categories, tel, emptyMenu }: Pick<SiteData, "dishes" | "categories"> & {
  tel: string;
  emptyMenu: string;
}) {
  const [category, setCategory] = useState("");
  const [stored, setStored] = useState<Quantities | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [clipboardStatus, setClipboardStatus] = useState("");
  const [manualCopy, setManualCopy] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => { setStored(readOrder()); }, []);
  useEffect(() => {
    if (stored === null) return;
    try { localStorage.setItem(storageKey, JSON.stringify(stored)); } catch { /* Order stays in memory. */ }
  }, [stored]);

  const items = dishes.flatMap((dish) => dish.portions.map((portion) => {
    const key = itemKey(dish, portion);
    return { dish, portion, key, quantity: stored?.[key] ?? 0 };
  })).filter(({ quantity }) => quantity > 0);
  const count = items.reduce((sum, { quantity }) => sum + quantity, 0);
  const availableItems = items.filter(({ dish }) => dish.available);
  const total = availableItems.reduce((sum, { portion, quantity }) => sum + priceInKopecks(portion.price) * quantity, 0);

  function change(dish: Dish, portion: Portion, delta: number) {
    const key = itemKey(dish, portion);
    if (delta > 0 && !dish.available) return;
    setStored((previous) => {
      const current = { ...(previous ?? readOrder()) };
      const next = Math.min(maxQuantity, (current[key] ?? 0) + delta);
      if (next > 0) current[key] = next;
      else delete current[key];
      return current;
    });
    setClipboardStatus("");
    setManualCopy("");
    setAnnouncement(delta > 0 ? "Добавлено в заказ: " + dish.name : "Количество обновлено: " + dish.name);
  }

  function openOrder() {
    setClipboardStatus("");
    setManualCopy("");
    dialog.current?.showModal();
  }

  async function copyOrder() {
    const lines = availableItems.map(({ dish, portion, quantity }) => {
      const details = [portionDetails(portion), portion.unit].filter(Boolean).join(", ");
      return dish.name + " (" + details + ") × " + quantity + " — " + rubles(priceInKopecks(portion.price) * quantity);
    });
    const list = ["Список заказа", ...lines, "Сумма за блюда: " + rubles(total)].join("\n");
    try {
      await navigator.clipboard.writeText(list);
      setClipboardStatus("Список скопирован");
      setManualCopy("");
    } catch {
      setManualCopy(list);
      setClipboardStatus("Выделите и скопируйте текст списка");
    }
  }

  const orderButton = <button className="button button-primary order-button" onClick={openOrder}>
    <ShoppingBag size={18} /> Список заказа
    <motion.span className="count" key={count} initial={reducedMotion ? false : { scale: .72 }}
      animate={{ scale: 1 }} transition={{ duration: .22 }}>{count}</motion.span>
  </button>;
  const visibleDishes = category ? dishes.filter((dish) => dish.categoryId === category) : dishes;
  return <MotionConfig reducedMotion="user">
    <section className="menu-section" id="menu" aria-labelledby="menu-title">
      <div className="layout menu-inner">
        <div className="section-heading">
          <h2 id="menu-title">Меню</h2>
          {dishes.length > 0 && <div className="desktop-order">{orderButton}</div>}
        </div>
        {dishes.length === 0 ? <div className="empty-menu">
          <span className="empty-icon"><Soup size={35} strokeWidth={1.35} /></span>
          <p>{emptyMenu}</p>
          <a className="button button-outline" href={tel}><Phone size={17} /> Позвонить <ArrowUpRight size={16} /></a>
        </div> : <>
          <div className="filters" role="group" aria-label="Категории меню">
            <button type="button" aria-pressed={!category} onClick={() => setCategory("")}>Все блюда</button>
            {categories.map(({ _id, name }) => <button type="button" key={_id} aria-pressed={category === _id}
              onClick={() => setCategory(_id)}>{name}</button>)}
          </div>
          {visibleDishes.length === 0 && <p className="no-dishes">В этой категории пока нет блюд.</p>}
          <div className="dish-grid" key={category || "all"}>
            {visibleDishes.map((dish, index) => <motion.article className="dish" key={dish._id}
              initial={reducedMotion ? false : { y: 12, opacity: .72 }}
              whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: 0.08 }}
              transition={{ duration: .28, delay: reducedMotion ? 0 : index % 3 * .06 }}>
              {dish.photo?.url && <figure className="dish-photo">
                <Image src={dish.photo.url} alt={dish.photo.alt || dish.name} fill sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 390px" />
                {(dish.photo.illustrative || dish.photo.generated) && <figcaption>
                  {dish.photo.generated ? "Иллюстрация ИИ" : dish.photo.sourceUrl
                    ? <a href={dish.photo.sourceUrl} target="_blank" rel="noreferrer" title={dish.photo.license}>Фото для иллюстрации</a>
                    : "Фото для иллюстрации"}
                </figcaption>}
              </figure>}
              <div className="dish-body">
                <h3>{dish.name}</h3>
                {!dish.available && <p className="unavailable">Временно недоступно</p>}
                {dish.description && <p>{dish.description}</p>}
                <div className="portions">{dish.portions.map((portion) => {
                  const quantity = stored?.[itemKey(dish, portion)] ?? 0;
                  return <div className="portion" key={portion._key}>
                    <div>
                      <strong>{rubles(priceInKopecks(portion.price))}</strong> <span>{portion.unit}</span>
                      {portionDetails(portion) && <small>{portionDetails(portion)}</small>}
                    </div>
                    <button type="button" className="add" disabled={!dish.available || quantity >= maxQuantity}
                      aria-label={["Добавить", dish.name, portion.label, portion.weight, portion.unit].filter(Boolean).join(" ")}
                      onClick={() => change(dish, portion, 1)}>{quantity > 0 && <motion.span className="add-count" key={quantity}
                        initial={reducedMotion ? false : { scale: .78 }}
                        animate={{ scale: 1 }} transition={{ duration: .22 }}>{quantity}</motion.span>}<Plus size={18} /></button>
                  </div>;
                })}</div>
                {(dish.ingredients || dish.allergens) && <details className="dish-details">
                  <summary>{dish.ingredients && dish.allergens ? "Состав и аллергены" : dish.ingredients ? "Состав" : "Аллергены"}</summary>
                  {dish.ingredients && <p><strong>Состав.</strong> {dish.ingredients}</p>}
                  {dish.allergens && <p><strong>Аллергены.</strong> {dish.allergens}</p>}
                </details>}
              </div>
            </motion.article>)}
          </div>
        </>}
      </div>
    </section>
    <div className="mobile-order">
      {count ? orderButton : <a className="button button-primary" href={tel}><Phone size={17} /> Позвонить</a>}
    </div>
    <span className="sr-only" role="status">{announcement}{announcement && count > 0 ? ". Позиций в списке: " + count : ""}</span>
    <dialog ref={dialog} className="order-dialog" aria-labelledby="order-title"
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="order-inner">
        <div className="order-heading"><h2 id="order-title">Список заказа</h2>
          <button className="icon-button" type="button" aria-label="Закрыть список" onClick={() => dialog.current?.close()}><X size={23} /></button></div>
        {items.length === 0 ? <p>Добавьте блюда из меню.</p> : <ul className="order-items">
          {items.map(({ dish, portion, key, quantity }) => <li key={key}>
            <div><strong>{dish.name}</strong><small>{[portionDetails(portion), portion.unit].filter(Boolean).join(" · ")}</small>
              {dish.available ? <span>{rubles(priceInKopecks(portion.price) * quantity)}</span> : <span className="unavailable">Временно недоступно</span>}</div>
            <div className="stepper">
              <button type="button" aria-label={"Уменьшить количество: " + dish.name} onClick={() => change(dish, portion, -1)}><Minus size={17} /></button>
              <span>{quantity}</span>
              <button type="button" aria-label={"Увеличить количество: " + dish.name} disabled={!dish.available || quantity >= maxQuantity}
                onClick={() => change(dish, portion, 1)}><Plus size={17} /></button>
            </div>
          </li>)}
        </ul>}
        <p className="order-total"><span>Сумма за блюда</span><strong>{rubles(total)}</strong></p>
        <p className="order-note">Подтвердите заказ и условия доставки по телефону</p>
        <div className="order-actions">
          <button className="button button-outline" type="button" disabled={!availableItems.length} onClick={copyOrder}><Clipboard size={17} /> Скопировать список</button>
          <a className="button button-primary" href={tel}><Phone size={17} /> Позвонить для заказа</a>
        </div>
        <p className="copy-status" role="status">{clipboardStatus}</p>
        {manualCopy && <textarea className="copy-text" aria-label="Текст списка заказа" value={manualCopy} readOnly onFocus={(event) => event.target.select()} />}
      </div>
    </dialog>
  </MotionConfig>;
}
