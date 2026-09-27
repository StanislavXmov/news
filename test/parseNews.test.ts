import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer, type Server } from 'node:http'
import type { CrawlerConfig } from '../src/types.js'
import { parseNews } from '../src/crawler/parseNews.js'

let server: Server
let origin: string

before(async () => {
  server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end(`<!doctype html><html><body>
      <h1> Тестовая   новость </h1>
      <time datetime="2024-06-12">12 июня 2024</time>
      <article class="news-detail">
        <p>Текст <a href="/docs/file.pdf">новости</a></p>
        <img src="/upload/image.jpg" alt="Фото">
        <script>bad()</script>
      </article>
    </body></html>`)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server failed to start')
  origin = `http://127.0.0.1:${address.port}`
})

after(async () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))

test('parses and normalizes a news page', async () => {
  const baseUrl = new URL(origin)
  const config: CrawlerConfig = {
    baseUrl,
    startUrl: new URL('/news/', baseUrl),
    outputPath: 'unused.json',
    maxPages: 1,
    maxItems: 0,
    delayMs: 0,
    resume: true,
    selectors: {
      listItem: 'a.news-item', nextPage: 'a.next', title: 'h1', date: 'time',
      content: '.news-detail', images: 'img',
    },
  }

  const item = await parseNews(new URL('/news/some-news/', baseUrl), config)
  assert.equal(item.sourceUrl, '/news/some-news/')
  assert.equal(item.slug, 'some-news')
  assert.equal(item.title, 'Тестовая новость')
  assert.equal(item.publishedAt, '2024-06-12')
  assert.deepEqual(item.images, [{ src: `${origin}/upload/image.jpg`, alt: 'Фото' }])
  assert.match(item.html, new RegExp(`${origin}/docs/file\\.pdf`))
  assert.doesNotMatch(item.html, /script|bad\(\)/)
})
