# nga-news-bot 

抓取 nga 模玩区版主的发帖，然后搬运每周周报后发送到飞书

## 部署

参考 .env.defaults 配置环境变量：

- `LARK_APP_ID`: 飞书应用ID
- `LARK_APP_SECRET`: 飞书应用密钥
- `LARK_OPEN_ID`: 飞书接收消息的用户ID
- `COOKIE`: NGA访问所需的Cookie
- `OPENAI_API_KEY`: OpenAI API密钥
- `OPENAI_BASE_URL`: OpenAI API地址（可选，默认为官方地址）
- `OPENAI_MODEL`: 使用的OpenAI模型（可选，默认为gpt-3.5-turbo）

运行 dist/index.js

## 更新说明

现在使用 OpenAI API 来解析论坛内容，替代了原来的正则表达式解析方式，提高了解析准确性和灵活性。
