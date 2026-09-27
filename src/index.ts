import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { readConfig } from './config.js'
import { getNewsUrls } from './crawler/getNewsUrls.js'
import { delay } from './crawler/http.js'
import { parseNews } from './crawler/parseNews.js'
import { crawlResultSchema, type CrawlResult } from './types.js'

async function saveResult(path: string, result: CrawlResult): Promise<void> {
  crawlResultSchema.parse(result)
  await mkdir(dirname(path), { recursive: true })
  const temporaryPath = `${path}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, path)
}

async function loadResult(path: string, source: string): Promise<CrawlResult | undefined> {
  try {
    const result = crawlResultSchema.parse(JSON.parse(await readFile(path, 'utf8')))
    return result.source === source ? result : undefined
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    console.warn(`Existing output cannot be resumed: ${error instanceof Error ? error.message : error}`)
    return undefined
  }
}

async function main(): Promise<void> {
  const config = readConfig(process.argv)
  const discoveredUrls = await getNewsUrls(config)
  const urls = config.maxItems > 0 ? discoveredUrls.slice(0, config.maxItems) : discoveredUrls
  console.log(`Found ${urls.length} unique news URLs`)

  const existing = config.resume ? await loadResult(config.outputPath, config.startUrl.href) : undefined
  const result: CrawlResult = existing ?? {
    generatedAt: new Date().toISOString(),
    source: config.startUrl.href,
    items: [],
    failures: [],
  }
  const completed = new Set(result.items.map((item) => new URL(item.sourceUrl, config.baseUrl).href))
  const pendingUrls = urls.filter((url) => !completed.has(url.href))
  if (existing) console.log(`Resuming with ${result.items.length} already collected items`)

  for (const [index, url] of pendingUrls.entries()) {
    console.log(`[news ${index + 1}/${pendingUrls.length}] ${url.href}`)
    result.failures = result.failures.filter((failure) => failure.sourceUrl !== url.href)
    try {
      result.items.push(await parseNews(url, config))
    } catch (error) {
      result.failures.push({
        sourceUrl: url.href,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`  Failed: ${result.failures.at(-1)!.error}`)
    }
    result.generatedAt = new Date().toISOString()
    await saveResult(config.outputPath, result)
    if (index < pendingUrls.length - 1) await delay(config.delayMs)
  }

  if (pendingUrls.length === 0) await saveResult(config.outputPath, result)

  console.log(`Saved ${result.items.length} items to ${config.outputPath}; failures: ${result.failures.length}`)
  if (result.failures.length > 0) process.exitCode = 2
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
