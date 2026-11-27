import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { ArrowDown, ArrowUpRight, Clock3, MapPin, Phone, Soup, Truck } from "lucide-react";
import { loadSite } from "../lib/sanity";
import { telephone } from "../lib/model";
import { Catalog } from "./catalog";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { home, seo } = await loadSite();
  return {
    title: seo.title || home.name,
    description: seo.description || home.subtitle,
    robots: seo.noIndex ? { index: false, follow: false } : undefined,
  };
}

export default async function HomePage() {
  await connection();
  const { home, delivery, dishes, categories } = await loadSite();
  const tel = telephone(delivery.phone);
  const conditions = [
    ["График", delivery.hours], ["Зона доставки", delivery.zone],
    ["Стоимость доставки", delivery.cost], ["Минимальная сумма", delivery.minimum],
    ["Самовывоз", delivery.pickup ? delivery.pickupDetails?.trim() || "Доступен" : ""],
  ].filter(([, value]) => value?.trim());

  return <>
    <a className="skip" href="#content">Перейти к содержимому</a>
    <header className="site-header" id="top">
      <div className="layout header-inner">
        <a className="brand" href="#top"><span className="brand-icon"><Soup size={24} strokeWidth={1.5} /></span><span>{home.name}</span></a>
        <nav className="navigation" aria-label="Разделы сайта">
          <a href="#menu">Меню</a><a href="#delivery">Доставка</a><a href="#contacts">Контакты</a>
        </nav>
        <a className="header-phone" href={tel} aria-label={"Позвонить по номеру " + delivery.phone}><Phone size={16} /><span>{delivery.phone}</span></a>
      </div>
    </header>
    <main id="content">
      <section className="layout hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><MapPin size={16} strokeWidth={1.8} /> {delivery.address}</p>
          <h1 id="hero-title">{home.title}</h1>
          <p className="hero-subtitle">{home.subtitle}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#menu">Смотреть меню <ArrowDown size={18} /></a>
            <a className="button button-outline" href={tel}><Phone size={17} /> Позвонить</a>
          </div>
        </div>
        <figure className="hero-figure">
          <div className="hero-image">
            <Image
              src={home.photo?.url || "/hero.webp"}
              alt={home.photo?.alt || "Домашнее жаркое с картофелем на керамической тарелке у окна"}
              fill preload sizes="(max-width: 760px) 100vw, (max-width: 1240px) 52vw, 635px"
            />
          </div>
          {(!home.photo || home.photo.illustrative || home.photo.generated) && <figcaption>{home.photo?.generated ? "Иллюстрация ИИ" : "Фото для иллюстрации"}</figcaption>}
        </figure>
      </section>

      <Catalog dishes={dishes} categories={categories} emptyMenu={home.emptyMenu} tel={tel} />

      <div className="layout info">
        <section className="info-section" id="delivery" aria-labelledby="delivery-title">
          <div className="info-icon"><Truck size={23} strokeWidth={1.5} /></div>
          <h2 id="delivery-title">Доставка</h2>
          {!(delivery.zone?.trim() && delivery.cost?.trim() && delivery.hours?.trim()) &&
            <p>Зону, стоимость и время доставки уточняйте по телефону</p>}
          {conditions.length > 0 && <dl className="conditions">
            {conditions.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>}
        </section>
        <section className="info-section" id="contacts" aria-labelledby="contacts-title">
          <div className="info-icon"><MapPin size={23} strokeWidth={1.5} /></div>
          <h2 id="contacts-title">Контакты</h2>
          <address>
            <span>{delivery.address}</span>
            <a className="contact-phone" href={tel}>{delivery.phone} <ArrowUpRight size={19} /></a>
          </address>
          {delivery.hours?.trim() && <p className="contact-hours"><Clock3 size={16} /> {delivery.hours}</p>}
        </section>
      </div>
    </main>
    <footer className="site-footer"><div className="layout footer-inner">
      <a className="brand" href="#top"><span className="brand-icon"><Soup size={21} strokeWidth={1.5} /></span><span>{home.name}</span></a>
      <a href="#top">Наверх <ArrowUpRight size={16} /></a>
    </div></footer>
  </>;
}
