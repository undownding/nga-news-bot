import { configDotenv } from 'dotenv'
import OpenAI from 'openai'
import { decodeHTMLEntities } from './lib'

// 确保环境变量被加载
configDotenv({ path: '.env' })

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export async function parseContent(input: string): Promise<Category[]> {
  try {
    // 预处理输入内容，移除域名以减少token使用
    const cleanedInput = input
      .replace(/https?:\/\/bbs\.nga\.cn\//g, '')
      .replace(/https?:\/\/nga\.cn\//g, '')
      .replace(/https?:\/\/www\.nga\.cn\//g, '')

    const prompt = `
请解析以下论坛内容，将其转换为JSON格式的分类和条目列表。

输入内容包含多个分类，每个分类有多个商品条目。请提取以下信息：
1. 分类名称（通常在 === 或 [align=center] 标签中）
2. 每个条目包含：
   - title: 商品标题
   - url: 链接路径（如果有的话。*重要*：仅提取相对路径部分，如 "read.php?tid=123"，不要包含域名）
   - img: 图片链接（在 [img] 标签中）
   - description: 商品描述（通常包含售价信息）

请返回符合以下TypeScript接口的JSON格式：
interface Entry {
  url?: string
  title: string
  img: string
  description: string
}

interface Category {
  name: string
  entries: Entry[]
}

输入内容：
${cleanedInput}

请只返回未格式化的紧凑JSON数组，不要包含任何其他文本、解释或格式化，不要使用markdown代码块包装。
`

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            '你是一个专业的文本解析助手，擅长从论坛格式的文本中提取结构化数据。请严格按照要求返回JSON格式的数据。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 14845,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI API 返回空内容')
    }

    // 尝试解析JSON响应
    let categories: Category[]
    try {
      // 清理可能的markdown代码块标记
      const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim()
      categories = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('解析OpenAI响应失败:', parseError)
      console.error('响应内容:', content)
      throw new Error('解析OpenAI API响应失败')
    }

    // 验证和清理数据
    return categories
      .filter(
        (category): category is Category =>
          category &&
          typeof category.name === 'string' &&
          Array.isArray(category.entries),
      )
      .map((category) => ({
        name: category.name.trim(),
        entries: category.entries
          .filter(
            (entry): entry is Entry =>
              entry &&
              typeof entry.title === 'string' &&
              typeof entry.img === 'string' &&
              typeof entry.description === 'string',
          )
          .map((entry) => ({
            ...entry,
            title: decodeHTMLEntities(entry.title.trim()),
            img: entry.img.trim(),
            description: entry.description.trim(),
            url: entry.url?.trim()
              ? `https://bbs.nga.cn/${entry.url.trim().replace(/^\/+/, '')}`
              : undefined,
          })),
      }))
      .filter((category) => category.entries.length > 0)
  } catch (error) {
    console.error('OpenAI API 调用失败:', error)
    // 如果API调用失败，返回空数组而不是抛出错误
    return []
  }
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
