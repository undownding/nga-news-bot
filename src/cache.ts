import * as fs from 'node:fs'
import * as cache from '@actions/cache'

const CACHE_KEY = 'nga-last-tid'
const CACHE_PATH = 'last-tid.txt'

export class Cache {
  async loadLastTid(): Promise<number> {
    try {
      await cache.restoreCache([CACHE_PATH], CACHE_KEY)

      if (fs.existsSync(CACHE_PATH)) {
        const content = fs.readFileSync(CACHE_PATH, 'utf-8')
        return parseInt(content)
      }
    } catch {
      console.warn('没有缓存的 tid，使用 0')
    }
    return 0
  }

  async saveLastTid(tid: number): Promise<void> {
    fs.writeFileSync(CACHE_PATH, tid.toString())
    try {
      await cache.saveCache([CACHE_PATH], CACHE_KEY)
    } catch (e) {
      console.error(`缓存写入失败: ${e}`)
    }
  }
}
