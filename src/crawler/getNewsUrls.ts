import * as cheerio from 'cheerio'
import type { CrawlerConfig } from '../types.js'
import { delay, fetchHtml } from './http.js'

function sameOriginHttpUrl(href: string, currentUrl: URL, baseUrl: URL): URL | undefined {
  try {
    const url = new URL(href, currentUrl)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== baseUrl.origin) return undefined
    url.hash = ''
    return url
  } catch {
    return undefined
  }
}

export async function getNewsUrls(config: CrawlerConfig): Promise<URL[]> {
  const newsUrls = new Map<string, URL>()
  const visitedPages = new Set<string>()
  let pageUrl: URL | undefined = config.startUrl

  for (let page = 1; pageUrl && page <= config.maxPages; page += 1) {
    if (visitedPages.has(pageUrl.href)) break
    visitedPages.add(pageUrl.href)

    console.log(`[list ${page}] ${pageUrl.href}`)
    const html = await fetchHtml(pageUrl)
    const $ = cheerio.load(html)

    $(config.selectors.listItem).each((_index, element) => {
      const href = $(element).attr('href')
      if (!href) return
      const url = sameOriginHttpUrl(href, pageUrl!, config.baseUrl)
      if (url) newsUrls.set(url.href, url)
    })

    const nextHref = $(config.selectors.nextPage).first().attr('href')
    const nextUrl: URL | undefined = nextHref
      ? sameOriginHttpUrl(nextHref, pageUrl, config.baseUrl)
      : undefined
    pageUrl = nextUrl && !visitedPages.has(nextUrl.href) ? nextUrl : undefined
    if (pageUrl) await delay(config.delayMs)
  }

  return [...newsUrls.values()]
}
