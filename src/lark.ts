import * as Lark from '@larksuiteoapi/node-sdk'
import { configDotenv } from 'dotenv'
import { Category } from './item-parser'
import * as console from 'node:console'
import * as fs from 'node:fs'

configDotenv()
const appId = process.env.LARK_APP_ID
const appSecret = process.env.LARK_APP_SECRET
const openId = process.env.LARK_OPEN_ID

const larkClient = new Lark.Client({ appId, appSecret })
// export const wsClient = new Lark.WSClient({
//   appId,
//   appSecret,
//   domain: Lark.Domain.Feishu,
//   loggerLevel: LoggerLevel.debug,
// })
//
// await wsClient.start({
//   eventDispatcher: new EventDispatcher({}).register({
//     'im.message.receive_v1': async (data) => {
//       console.log(data.sender.sender_id)
//     },
//   }),
// })

export async function sendMessage(categories: Category[]) {
  console.log('sendMessage', JSON.stringify(categories, null, 2))
  const content = []
  for (const category of categories) {
    content.push([
      {
        tag: 'text',
        text: category.name,
        style: ['bold'],
      },
    ])
    for (const entry of category.entries) {
      const url = 'https://img.nga.178.com/attachments/' + entry.img
      console.log(url)
      const filename = 'dist/' + entry.img.split('/').pop()
      const image = await fetch(url)
        .then((res) => res.arrayBuffer())
        .then((arrayBuffer) =>
          fs.writeFileSync(filename, Buffer.from(arrayBuffer)),
        )
        .then(() => fs.createReadStream(filename))

      const imageKey = await larkClient.im.v1.image
        .create({
          data: {
            image_type: 'message',
            image,
          },
        })
        .then((resp) => resp.image_key)

      // title
      if (entry.url) {
        content.push([
          {
            tag: 'a',
            text: entry.title,
            href: entry.url,
          },
        ])
      } else {
        content.push([
          {
            tag: 'text',
            text: `${entry.title}`,
          },
        ])
      }

      // image
      content.push([
        {
          tag: 'img',
          image_key: imageKey,
        },
      ])

      // description
      content.push([
        {
          tag: 'text',
          text: `${entry.description}`,
        },
      ])
    }
  }
  await sendMessageImpl(content)
}

async function sendMessageImpl(content: object) {
  await larkClient.im.message.create({
    data: {
      receive_id: openId,
      msg_type: 'post',
      content: JSON.stringify({
        zh_cn: {
          title: '模玩资讯每周播报',
          content,
        },
      }),
    },
    params: {
      receive_id_type: 'open_id',
    },
  })
}
