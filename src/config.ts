import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { Command } from 'commander'
import type { CrawlerConfig } from './types.js'

try {
  loadEnvFile()
} catch (error) {
  if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
}

function env(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback
}

export function readConfig(argv: string[]): CrawlerConfig {
  const command = new Command()
    .name('bitrix-news-crawler')
    .description('Collect Bitrix news pages into an intermediate JSON file')
    .requiredOption('--base-url <url>', 'Site origin', env('BITRIX_BASE_URL'))
    .option('--news-path <path>', 'News listing path or absolute URL', env('BITRIX_NEWS_PATH', '/news/'))
    .option('--item-selector <css>', 'Links to news pages', env('BITRIX_LIST_ITEM_SELECTOR', 'a.news-item'))
    .option('--next-selector <css>', 'Next-page link', env('BITRIX_NEXT_PAGE_SELECTOR', 'a.next'))
    .option('--title-selector <css>', 'News title', env('BITRIX_TITLE_SELECTOR', 'h1'))
    .option('--date-selector <css>', 'Publication date', env('BITRIX_DATE_SELECTOR', 'time'))
    .option('--content-selector <css>', 'News content container', env('BITRIX_CONTENT_SELECTOR', '.news-detail'))
    .option('--image-selector <css>', 'Article images on the detail page', env('BITRIX_IMAGE_SELECTOR', '.news-detail img'))
    .option('--max-pages <number>', 'Maximum listing pages', env('BITRIX_MAX_PAGES', '1000'))
    .option('--max-items <number>', 'Maximum news items; 0 means unlimited', env('BITRIX_MAX_ITEMS', '0'))
    .option('--delay-ms <number>', 'Delay between requests', env('BITRIX_DELAY_MS', '200'))
    .option('--output <path>', 'Output JSON path', env('BITRIX_OUTPUT', 'output/news.json'))
    .option('--fresh', 'Ignore an existing output file and crawl every news page again')
    .parse(argv)

  const options = command.opts()
  const baseUrl = new URL(options.baseUrl)
  const maxPages = Number.parseInt(options.maxPages, 10)
  const maxItems = Number.parseInt(options.maxItems, 10)
  const delayMs = Number.parseInt(options.delayMs, 10)

  if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error('--max-pages must be a positive integer')
  if (!Number.isInteger(maxItems) || maxItems < 0) throw new Error('--max-items must be a non-negative integer')
  if (!Number.isInteger(delayMs) || delayMs < 0) throw new Error('--delay-ms must be a non-negative integer')

  return {
    baseUrl,
    startUrl: new URL(options.newsPath, baseUrl),
    outputPath: resolve(options.output),
    maxPages,
    maxItems,
    delayMs,
    resume: !options.fresh,
    selectors: {
      listItem: options.itemSelector,
      nextPage: options.nextSelector,
      title: options.titleSelector,
      date: options.dateSelector,
      content: options.contentSelector,
      images: options.imageSelector,
    },
  }
}
