import { configDotenv } from 'dotenv'
import { isEmpty } from 'lodash-es'
import * as console from 'node:console'
import { Cache } from './cache'
import { parseContent } from './item-parser'
import { decodeHTMLEntities } from './lib'
import { sendMessage } from './lark'

configDotenv({ path: '.env' })

interface LinkResult {
  href: string
  text: string
}

const cache = new Cache()

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-language':
        'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'sec-ch-ua':
        '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      cookie: process.env.cookie,
      Referer: 'https://nga.178.com/nuke.php?func=ucp&uid=38260890',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'GET',
  })
  const decoder = new TextDecoder('gbk')
  const gbkBuffer = await response.arrayBuffer()

  return decoder.decode(gbkBuffer)
}

async function getThreadList(): Promise<LinkResult[]> {
  const htmlContent = await fetchPage(
    'https://nga.178.com/thread.php?authorid=38260890',
  )

  const regex =
    /<a\s+href=['"](\/read\.php\?tid=\d+[^'"]*)['"][^>]*>(.*?)<\/a>/gis

  return Array.from(htmlContent.matchAll(regex))
    .map(([, hrefPath, rawText]) => ({
      href: new URL(hrefPath, 'https://nga.178.com/').href,
      text: decodeHTMLEntities(rawText), // 处理HTML实体解码
    }))
    .filter((item) => !isEmpty(item.text))
}

async function main() {
  const lastTid = await cache.loadLastTid()
  const links = await getThreadList()
  if (isEmpty(links)) {
    console.error('主题列表为空，需要重新配置 cookie')
    return
  }
  const thread = links.find((item) => item.text.includes(`情报汇总`))
  if (!thread) {
    console.warn('找不到情报贴，结束')
    return
  }
  const tid = thread.href.match(/[?&]tid=(\d+)(?:&|$)/)?.[1]
  console.log(`情报贴 tid 为 ${tid}`)

  if (tid && parseInt(tid) > lastTid) {
    console.log(`新情报贴发布，开始爬取`)
    const page = await fetchPage(thread.href)
    const items = await parseContent(page)
    await sendMessage(items)
    await cache.saveLastTid(parseInt(tid))
  }
}

await main()
