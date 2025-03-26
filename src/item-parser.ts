import { decodeHTMLEntities } from './lib'

export interface Entry {
  url?: string
  title: string
  img: string
  description: string
}

export interface Category {
  name: string
  entries: Entry[]
}

export function parseContent(input: string): Category[] {
  const sectionRegex =
    /===([^=]+)===|\[align=center\][\s\S]*?\[size=\d+%\](.*?)\[\/size\][\s\S]*?\[\/align\]/g
  const sections: Category[] = []
  let lastIndex = 0
  let currentCategory: Category | null = null
  let match
  while ((match = sectionRegex.exec(input)) !== null) {
    const content = input.substring(lastIndex, match.index)
    if (currentCategory) {
      currentCategory.entries.push(...parseEntries(content))
    }
    const name = (match[1] || match[2]).trim().replace(/<br\/>/g, '')
    if (name) {
      currentCategory = { name, entries: [] }
      sections.push(currentCategory)
    }
    lastIndex = sectionRegex.lastIndex
  }
  const remainingContent = input.substring(lastIndex)
  if (currentCategory && remainingContent) {
    currentCategory.entries.push(...parseEntries(remainingContent))
  }
  return sections.filter((c) => c.entries.length > 0)
}

function parseEntries(content: string): Entry[] {
  const entries: Entry[] = []
  const quoteRegex = /\[quote\]([\s\S]*?)\[\/quote\]/g
  let quoteMatch
  while ((quoteMatch = quoteRegex.exec(content)) !== null) {
    const quoteContent = quoteMatch[1]
    const entryRegex =
      /(\[url=([^\]]+)\]([\s\S]*?)\[\/url\]|[\s\S]*?)\s*\[img\](.*?)\[\/img\][\s\S]*?(售价[\s\S]*?)(?=\s*(?:\[url=|\[img|\[b|<\/quote>|<br\/?>|$))/gi
    let entryMatch
    while ((entryMatch = entryRegex.exec(quoteContent)) !== null) {
      let url = null
      let title = ''
      if (entryMatch[2]) {
        // URL匹配情况
        url = entryMatch[2].trim()
        title = entryMatch[3].trim()
      } else {
        // 非URL情况
        title = entryMatch[1].trim()
      }
      const img = entryMatch[4].trim()
      const description = entryMatch[5].trim().replace(/<br\/?>/g, ' ')

      // 处理残余超链接
      const regex = /https:\/\/[^\s<>'"]+?tid=\d+/g
      const match = title.match(regex)
      if (match) {
        url = match[0]
        // title = match[2]
      }

      // 清理标题中的标签
      title = decodeHTMLEntities(title).replace(/\[\/?\w+.*?\]|<br\/?>/g, '')

      entries.push({ url, title, img, description })
    }
  }
  return entries
}

export function convertToMarkdown(categories: Category[]): string {
  return categories
    .map((category) => {
      // 分类标题
      const header = `## ${category.name}\n\n`

      // 处理每个条目
      const entriesMarkdown = category.entries
        .map((entry) => {
          // 带链接的标题（如果存在url）
          const title = entry.url
            ? `[${entry.title}](${entry.url})`
            : entry.title

          // 图片使用标题作为alt文本
          const image = `![${entry.title}](${entry.img})`

          // 组合成列表项
          return `- **${title}** ${image} - ${entry.description}`
        })
        .join('\n')
      return header + entriesMarkdown
    })
    .join('\n\n')
}
