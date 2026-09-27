# Bitrix news → intermediate JSON

На этом этапе скрипт только собирает новости в проверяемый JSON. Он не загружает файлы в Payload и не строит Lexical state.

## Запуск

```bash
pnpm install
cp .env.example .env
```

Скрипт автоматически читает `.env`. Любой параметр также можно переопределить в командной строке:

```bash
pnpm crawl -- \
  --base-url https://example.com \
  --news-path /news/ \
  --item-selector "a.news-item" \
  --next-selector "a.next" \
  --title-selector "h1" \
  --date-selector "time" \
  --content-selector ".news-detail" \
  --max-items 2
```

PowerShell:

```powershell
pnpm crawl -- --base-url https://example.com --news-path /news/ --item-selector "a.news-item" --next-selector "a.next" --title-selector "h1" --date-selector "time" --content-selector ".news-detail" --max-items 2
```

Результат по умолчанию записывается в `output/news.json`. Файл атомарно обновляется после каждой новости, поэтому уже собранные данные сохранятся при аварийной остановке. При повторном запуске успешно сохранённые URL пропускаются; `--fresh` принудительно начинает полный сбор заново.

```json
{
  "generatedAt": "2026-09-27T12:00:00.000Z",
  "source": "https://example.com/news/",
  "items": [
    {
      "sourceUrl": "/news/some-news/",
      "slug": "some-news",
      "title": "Название новости",
      "publishedAt": "2024-06-12",
      "html": "<p>...</p>",
      "images": [
        {
          "src": "https://example.com/upload/image.jpg",
          "alt": "Описание"
        }
      ]
    }
  ],
  "failures": []
}
```

Внутри `html` относительные ссылки и адреса картинок становятся абсолютными. `images` содержит уникальные изображения из контента. Неудачные страницы попадают в `failures` и не останавливают весь обход.
