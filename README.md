# Домашняя еда в Парк-Бутово

Русскоязычный сайт на Next.js App Router. Покупатель выбирает блюда, сохраняет список в браузере и подтверждает заказ звонком. Владелец редактирует сайт через встроенную Sanity Studio. Локальная версия сразу показывает начальное меню из подтверждённого прайса. После подключения Sanity меню берётся из опубликованного контента.

## Локальный запуск

Понадобится Node.js 22.14 или новее и npm.

```sh
npm ci
npm run dev
```

Откройте http://localhost:3000. До подключения Sanity видны стартовые тексты, контакты и 17 блюд из прайса. Для проверки рабочего режима выполните `npm run build`. Docker сам копирует standalone-сборку, её статику и каталог `public` в итоговый образ.

## Sanity Content Lake и доступ редактора

1. Создайте проект и датасет в [Sanity Manage](https://www.sanity.io/manage). Скопируйте Project ID и имя датасета в `SANITY_PROJECT_ID` и `SANITY_DATASET`.
2. Для публичного датасета оставьте `SANITY_READ_TOKEN` пустым. Для приватного создайте токен с правами Viewer и сохраните его в серверном окружении. У проекта может быть публичным только тот контент, который можно раскрывать напрямую через API.
3. В **API → CORS origins** добавьте точный origin сайта, например `https://food.example.com`, и включите **Allow credentials**. Для локального редактирования добавьте `http://localhost:3000` с той же настройкой. Origin указывается без `/studio`.
4. В **Members** пригласите владельца или сотрудника с ролью, которой разрешено публиковать контент, например Editor. Редактор входит по своей учётной записи Sanity на `https://food.example.com/studio`. Токен сайта в Studio не используется.
5. Для локальной разработки скопируйте `.env.example` в `.env.local` и внесите настройки. При изменении окружения перезапустите Next.js.

## Развёртывание на Linux VPS

1. Установите Docker Engine и Compose v2. Направьте DNS-запись A домена на IPv4 VPS. Если публикуете AAAA, она должна вести на рабочий IPv6 этого VPS. Откройте входящие TCP 80 и 443. Для HTTP/3 откройте UDP 443. Сайт внутри Compose слушает порт 3000 и доступен снаружи через Caddy.
2. Скопируйте папку проекта на VPS. Создайте `.env` и заполните параметры. Для `SITE_DOMAIN` укажите только имя хоста. Создайте секрет вебхука, например командой `openssl rand -hex 32`. Храните `.env` в доступе только у пользователя, который запускает Compose.
3. Запустите сервисы и проверьте состояние.

```sh
cp .env.example .env
chmod 600 .env
# Заполните .env перед запуском
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 caddy site
```

Caddy получает и обновляет HTTPS-сертификат автоматически. Его данные сохраняются в томе `caddy_data`. Значения Sanity читаются при запуске приложения. Для изменения уже заполненного `.env` пересоздайте нужные контейнеры через `docker compose up -d`. Публикация меню пересборки не требует.

## Развёртывание на Vercel

Импортируйте репозиторий через **Add New → Project**, оставьте корневой каталог проекта и шаблон **Next.js**. Без настроек Sanity сайт показывает начальное меню. Для редактирования через Studio задайте переменные Sanity в **Settings → Environment Variables**, добавьте адрес Vercel в CORS проекта Sanity и импортируйте меню. [Документация Vercel](https://vercel.com/docs/git/vercel-for-github).

## Вебхук публикации

В Sanity Manage откройте **API → Webhooks** и создайте **Document webhook** для нужного датасета.

| Поле | Значение |
| --- | --- |
| URL | `https://food.example.com/api/revalidate` |
| HTTP method | `POST` |
| Trigger on | Create, Update, Delete |
| Drafts и versions | Выключены |
| Secret | Значение `SANITY_WEBHOOK_SECRET` из серверного `.env` |

Фильтр.

```groq
coalesce(after()._type, before()._type) in ["dish", "category", "home", "delivery", "seo"]
```

Проекция.

```groq
{ "_id": coalesce(after()._id, before()._id), "_type": coalesce(after()._type, before()._type) }
```

Next.js проверяет подпись исходного тела запроса и сбрасывает кеш опубликованного контента. При задержке вебхука кеш имеет резервное обновление через 120 секунд. Список заказа при следующей загрузке использует текущие опубликованные цены.

## Импорт начального меню

Импорт загружает фотографии и создаёт начальные категории и блюда в Sanity. Он пропускает позиции с теми же идентификаторами, в том числе черновики. Если в датасете уже есть копии этих блюд с другими идентификаторами, проверьте каталог на дубликаты перед запуском импорта.

Проверьте файлы локально командой `node scripts/import-menu.mjs --check`. Для импорта укажите серверные `SANITY_PROJECT_ID` и `SANITY_DATASET` и временно задайте в окружении `SANITY_IMPORT_TOKEN` с правом записи в датасет. Запустите `node scripts/import-menu.mjs` из папки проекта. Если идентификатор и датасет уже внесены в `.env`, выполните `node --env-file=.env scripts/import-menu.mjs`. Токен импорта используется только этой командой.

В начальном меню три фотографии Wikimedia Commons со статусом общественного достояния или с лицензией CC0. Остальные изображения созданы в ImageGen по визуальным референсам заказчика. Сведения об источниках и способе создания хранятся в данных каталога.

- Долма в виноградных листьях, Jon Sullivan. [Public Domain](https://commons.wikimedia.org/wiki/File:Stuffed_grape_leaves.jpg).
- Лаваш, Combrian. [CC0 1.0](https://commons.wikimedia.org/wiki/File:Lavash_arm%C3%A9nien.jpg).
- Пахлава, Arams. [Public Domain](https://commons.wikimedia.org/wiki/File:Pakhlava.jpg).

## Как редактировать меню

1. В разделе **Категории** создайте категории из вашего прайса и нажмите **Publish**. Поле «Порядок» задаёт место в списке. Маленькое число выводится раньше.
2. В **Блюдах** добавьте название, выберите опубликованную категорию и внесите как минимум один вариант продажи с ценой и единицей. Вес, описание, состав и аллергены заполните по подтверждённым данным. Для разных вариантов добавьте отдельные строки с их ценами, весом и единицами.
3. Для своих фотографий заполните описание изображения. Если используете сток, проверьте коммерческую лицензию и укажите ссылку и лицензию. Для стоковых и сгенерированных изображений можно указать их происхождение в Studio. Карточка также работает без фотографии.
4. Опубликуйте блюдо. Если оно временно недоступно, выключите «Доступно для заказа» и снова опубликуйте. Для удаления блюда с сайта снимите публикацию через меню действий.
5. Разделы **Главная**, **Доставка и контакты** и **SEO** управляют названием, первым экраном, телефоном, адресом, условиями и метаданными. Включите самовывоз после подтверждения владельцем. Первый экран по умолчанию использует изображение, сгенерированное для проекта, с подписью «Фото для иллюстрации».

## Проверка после подключения

Откройте сайт на компьютере и в узком окне. Проверьте, что «Смотреть меню» ведёт к каталогу, а «Позвонить» открывает `tel:+79771698997` с исходным номером. На опубликованном меню проверьте фильтр, несколько вариантов продажи, количество, сумму, копирование и восстановление списка после перезагрузки.

Для проверки обновления откройте сайт, затем измените цену в Studio и оставьте её в черновике. После перезагрузки публичного сайта должна остаться старая цена. Нажмите **Publish** и проверьте успешную попытку доставки в журнале вебхука. Перезагрузите сайт и проверьте новую цену в карточке и сумму в сохранённом заказе. Повторите со снятием публикации. Вебхук обрабатывает оба события без пересборки контейнера.

Документация для настройки. [Sanity Studio в Next.js](https://www.sanity.io/docs/nextjs/embedding-sanity-studio-in-nextjs) · [Вебхуки Sanity](https://www.sanity.io/docs/content-lake/webhooks) · [Развёртывание Next.js](https://nextjs.org/docs/app/guides/self-hosting).


## Иллюстрация первого экрана

Файл `public/hero.webp` создан встроенным ImageGen для этого проекта. Промпт генерации приведён ниже.

> Editorial food photography for a Russian home cooking delivery website hero, landscape 4:3 composition. A generous simple speckled ivory ceramic plate of homemade roasted chicken pieces, golden potatoes, carrots and dill, centered on a dark warm wooden table by a real kitchen window. White linen napkin, a plain fork and a soft blurred window in background. Side daylight, long gentle shadows, appetizing natural textures, warm ochre tones, candid cookbook photography, eye level 45-degree angle. No text, branding, people or graphics. This is an illustrative image rather than a specific menu listing.

<details><summary>Задания для иллюстраций блюд</summary>

ImageGen получил номерной визуальный образец каждого блюда. Общая композиция: горизонтальное фото 3:2, обычная домашняя посуда, естественный свет у окна, простая подача на нейтральной кухонной поверхности. Ниже приведены задания для отдельных блюд.

- Паштет. Sliced homemade savory brown liver pâté roulade, with a thin ivory butter spiral in cross-section, three thick slices arranged casually on a pale plate. This is a savory meat pâté, no chocolate, no cake texture.
- Левенги. One whole Azerbaijani chicken lavangi, roasted intact with shiny deep golden brown skin, home-cooked in a plain baking pan, subtle walnut-onion stuffing only visible at the natural opening. Show a whole single bird, not chicken pieces, no plastic.
- Шекербура. A plate of pale golden Azerbaijani shekerbura, oval pointed half-moon turnovers with delicate dense hand-pinched zigzag herringbone lines on each top, arranged on plain paper liners as in reference, not crimped empanadas.
- Гогал. Several round compact Azerbaijani gogal buns, glossy golden flaky concentric spiral pastry with sesame seeds sprinkled in the centers, on a plain home baking tray with parchment. Not croissants.
- Шах-плов. A single tall cylindrical Azerbaijani shah pilaf in a smooth browned baked lavash shell, one large wedge opened to show loose long-grain saffron rice with chestnuts and dried fruit, set on a simple ceramic plate. Follow cut-open tall dome in reference, not loose plov or pie dough.
- Блинчик. Three thin golden blinchiki folded into flat neat rectangular envelopes, fried with mottled golden surfaces, stacked casually on a simple light plate. Keep filling unexposed; no syrup, fruits, American pancakes or spring rolls.
- Бадамбура. A simple plate of pale golden Azerbaijani badambura pastries, sculpted oval with pointed tips and fine spiral laminated scalloped contour layers, a very light powdered sugar dusting; see reference. No filling revealed.
- Мутакки. Slender slightly curved Azerbaijani mutakki pastry rolls, tightly rolled from triangles, slim tapered shapes, dusted with powdered sugar, casually overlapping on a plain plate. Similar delicate thin rolls to the reference, not large croissants.
- Сладкий хлеб. A whole round Azerbaijani sweet milk bread loaf, glossy golden domed top hand-scored with a simple radial flower and short leaflike lines, a little sesame decoration. On a plain board, simple homemade loaf as in reference, no watermark, no sliced brioche.
- Кете. Small individual irregular rectangular and trapezoid Azerbaijani kete pastry pieces with glossy golden baked tops and pale slightly crumbly cut edges, assorted on a plain tray as in the reference. Do not show a whole round pastry.
- Кете гарабаг. Azerbaijani Karabakh kete, hand-sized round flat golden pastries, distinct glossy tops marked with a tight diagonal crosshatch pattern and crimped rim, on a plain plate; recreate shapes and simple household presentation in reference. Not small chopped kete cubes.
- Довга. A bowl of Azerbaijani dovga, white loose yogurt soup with very finely chopped green herbs throughout, three fresh green herb leaves resting simply in the center. No red ingredients or elaborate garnishes. Follow the humble bowl in reference.
- Долма из овощей. Azerbaijani three-sisters vegetable dolma cooked in a simple dark baking dish, clearly show all three together: several whole small slit purple eggplants where savory stuffing is visible, mild pale green stuffed peppers, and stuffed cooked red tomatoes. Arrange casually around each other, without garnish or table setting, per reference.
- Долма из капусты. Recreate the shape of Azerbaijani kələm dolması in the reference: six very slim elongated finger-width rolls in pale golden translucent cooked cabbage leaves, hand rolled tightly, arranged in a small irregular stack across a plain white plate, reminiscent of cigar-shaped dolma with cabbage instead of vine leaves. Tiny pinch of chopped parsley on top. No big stuffed cabbage parcels, no tomato sauce, no mashed potatoes, no elaborate garnish.

</details>
