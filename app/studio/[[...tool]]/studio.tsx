"use client";

import { useMemo } from "react";
import { NextStudio } from "next-sanity/studio";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "../../../sanity/schema";

const singletons = [
  { id: "home", title: "Главная" },
  { id: "delivery", title: "Доставка и контакты" },
  { id: "seo", title: "SEO" },
];
const singletonIds = new Set(singletons.map(({ id }) => id));

export function Studio({ projectId, dataset }: { projectId: string; dataset: string }) {
  const config = useMemo(() => defineConfig({
    name: "park-butovo",
    title: "Парк-Бутово · Управление сайтом",
    basePath: "/studio",
    projectId, dataset,
    plugins: [structureTool({ name: "content", title: "Контент", structure: (S) => S.list()
      .title("Сайт")
      .items([
        S.documentTypeListItem("dish").title("Блюда"),
        S.documentTypeListItem("category").title("Категории"),
        S.divider(),
        ...singletons.map(({ id, title }) =>
          S.listItem().id(id).title(title).child(S.document().schemaType(id).documentId(id).title(title))),
      ]) })],
    schema: { types: schemaTypes, templates: (previous) =>
      previous.filter(({ schemaType }) => !singletonIds.has(schemaType)) },
    document: { actions: (previous, { schemaType }) => singletonIds.has(schemaType)
      ? previous.filter(({ action }) => !action || !["delete", "duplicate", "unpublish"].includes(action))
      : previous },
  }), [projectId, dataset]);
  return <NextStudio config={config} />;
}
