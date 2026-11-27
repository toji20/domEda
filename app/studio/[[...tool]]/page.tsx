import { connection } from "next/server";
import { sanityConfig } from "../../../lib/sanity";
import { Studio } from "./studio";

export const metadata = { title: "Управление сайтом", robots: { index: false, follow: false } };

export default async function StudioPage() {
  await connection();
  const config = sanityConfig();
  return config
    ? <Studio {...config} />
    : <main className="layout studio-setup"><h1>Подключите Sanity Studio</h1>
        <p>Укажите SANITY_PROJECT_ID и SANITY_DATASET в окружении сайта, затем перезапустите приложение.</p>
        <a className="button button-primary" href="/">На главную</a>
      </main>;
}
