import * as cheerio from 'cheerio'
import type { CrawlerConfig, NewsItem } from '../types.js'
import { newsItemSchema } from '../types.js'
import { fetchHtml } from './http.js'

const MONTHS: Record<string, number> = {
  января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
  июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11,
}

function isoDate(value: string): string {
  const input = value.trim().toLowerCase()
  const russian = input.match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/u)
  if (russian) {
    const month = MONTHS[russian[2]!]
    if (month !== undefined) {
      return new Date(Date.UTC(Number(russian[3]), month, Number(russian[1]))).toISOString().slice(0, 10)
    }
  }

  const numeric = input.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/)
  if (numeric) {
    return new Date(Date.UTC(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]))).toISOString().slice(0, 10)
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10)
  throw new Error(`Unrecognized publication date: ${JSON.stringify(value)}`)
}

function slugFromUrl(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean)
  return decodeURIComponent(segments.at(-1) ?? '').trim()
}

function sourceUrl(url: URL, baseUrl: URL): string {
  return url.origin === baseUrl.origin ? `${url.pathname}${url.search}` : url.href
}

export async function parseNews(url: URL, config: CrawlerConfig): Promise<NewsItem> {
  const $ = cheerio.load(await fetchHtml(url), { xml: false })
  const content = $(config.selectors.content).first()
  if (!content.length) throw new Error(`Content not found: ${config.selectors.content}`)

  content.find('script, style, noscript').remove()
  const images: NewsItem['images'] = []
  const seenImages = new Set<string>()

  $(config.selectors.images).each((_index, element) => {
    const image = $(element)
    const rawSrc = image.attr('data-src') ?? image.attr('data-lazy-src') ?? image.attr('src')
    if (!rawSrc) return
    const src = new URL(rawSrc, url).href
    image.attr('src', src)
    image.removeAttr('data-src data-lazy-src')
    if (!seenImages.has(src)) {
      seenImages.add(src)
      images.push({
        src,
        alt: image.attr('alt')?.trim() ?? '',
        ...(image.attr('title')?.trim() ? { title: image.attr('title')!.trim() } : {}),
      })
    }
  })

  content.find('img').each((_index, element) => {
    const image = $(element)
    const rawSrc = image.attr('data-src') ?? image.attr('data-lazy-src') ?? image.attr('src')
    if (!rawSrc) return
    image.attr('src', new URL(rawSrc, url).href)
    image.removeAttr('data-src data-lazy-src')
  })

  content.find('a[href]').each((_index, element) => {
    const link = $(element)
    link.attr('href', new URL(link.attr('href')!, url).href)
  })

  const dateElement = $(config.selectors.date).first()
  const dateValue = dateElement.attr('datetime') ?? dateElement.text()
  const item = {
    sourceUrl: sourceUrl(url, config.baseUrl),
    slug: slugFromUrl(url),
    title: $(config.selectors.title).first().text().replace(/\s+/g, ' ').trim(),
    publishedAt: isoDate(dateValue),
    html: (content.html() ?? '').trim(),
    images,
  }

  return newsItemSchema.parse(item)
}
