# n8n 微信公众号节点

一个面向生产环境的 n8n 微信公众号（WeChat Official Account）社区节点。

项目聚焦公众号内容自动化中最常用、最稳定的能力：**图片素材、草稿管理、发布管理**。代码基于当前 n8n 社区节点规范重新实现，不是旧社区项目的 Fork，也不保留不必要的兼容层和通用 API 兜底。

## 功能

### 图片与素材

- 上传正文图片（`/cgi-bin/media/uploadimg`）
- 上传永久图片素材（`/cgi-bin/material/add_material`）

节点直接接收 n8n Binary 数据。如果图片来自 URL，建议先使用 n8n 的 HTTP Request 节点下载为 Binary，再交给本节点上传。

### 草稿管理

- 创建草稿
- 获取草稿
- 获取草稿列表
- 更新草稿
- 删除草稿

支持单图文和多图文草稿，常用字段包括：

- 标题 `title`
- 作者 `author`
- 摘要 `digest`
- 正文 HTML `content`
- 原文链接 `content_source_url`
- 封面素材 ID `thumb_media_id`
- 正文显示封面 `show_cover_pic`
- 开启评论 `need_open_comment`
- 仅粉丝可评论 `only_fans_can_comment`
- 2.35:1 / 1:1 封面裁剪参数

普通图文会显式发送 `article_type: "news"`。

### 发布管理

- 提交发布
- 查询发布状态
- 获取已发布文章
- 获取已发布文章列表
- 删除已发布文章

> 微信公众号的 `freepublish/*` 接口权限与草稿接口权限并不完全相同。个人主体、未认证或不具备相应发布权限的账号，可能可以正常使用草稿接口，但调用发布接口时返回 `48001`。请以公众号后台实际显示的接口权限为准。

定时、审批和人工确认应由 n8n Workflow 负责，本节点不在内部隐藏调度逻辑。

## V1 暂不包含

为了保持节点简单、稳定，V1 暂不提供：

- 消息 Trigger / Response
- 公众号回调 Webhook
- AES 消息加解密
- 自定义菜单
- 用户与标签管理
- 模板消息
- 客服消息
- 评论管理
- 数据分析
- 二维码管理

这些能力只有在出现稳定、重复的真实使用需求后，才会作为正式 Operation 加入。

## 凭据配置

在 n8n 中创建 **WeChat Official Account API** Credential，只需要：

- App ID
- App Secret

App Secret 以密码字段保存。

微信公众号服务端 API 还要求调用服务器的出口 IP 已加入公众号后台的 API IP 白名单。如果微信返回 `40164`，节点会给出针对性的白名单错误提示。

### Access Token

节点使用微信 Stable Access Token：

- 正常 Token 生命周期交给 n8n Credential 管理；
- 微信经常通过 HTTP 200 + JSON `errcode` 返回 Token 失效，而不是 HTTP 401；
- 遇到 `40001`、`40014`、`42001`、`42007` 等明确 Token 错误时，节点会执行一次 Stable Token 恢复，并且只重试一次原请求；
- 强制刷新在同一进程内至少间隔 30 秒，避免反复刷新；
- Access Token 不写入 Workflow JSON、节点输出或日志。

## 重试策略

这个项目不会简单地“失败就重试三次”。

- **读取类 / 幂等操作**：仅对网络异常、HTTP 429、HTTP 5xx 做有限退避重试；
- **明确 Token 失效**：恢复 Token 后重试一次，因为微信已经明确拒绝了原请求；
- **创建草稿、上传素材、提交发布等写操作**：如果网络结果未知，默认不自动重放，避免产生重复草稿、重复素材或重复发布。

## 输出结构

每个输入 Item 对应一个输出 Item，并保留正确的 `pairedItem` 关系。

原始输入 JSON 会保留，微信 API 的响应统一放在：

```text
$json.wechat
```

例如创建草稿成功后：

```text
$json.wechat.media_id
```

如果开启 n8n 的 Continue On Fail，错误信息会通过经过脱敏的 `wechatError.message` 返回。

## 安装

发布到 npm 后，可以在 n8n 的 Community Nodes 中安装：

```text
n8n-nodes-wechat-official-account
```

生产环境建议固定精确版本，不要依赖浮动的 `latest`。

## 兼容性

首个 `0.1.0` 版本基于以下环境开发和验证：

- Node.js 24.18.0
- `@n8n/node-cli` 0.45.5
- `n8n-workflow` 2.36.4

包要求 Node.js 22 或更高版本，并遵循当前 n8n strict community-node 规范。

如果 n8n 进行较大版本升级，建议先重新执行测试、Lint 和 Build，再升级生产环境中的节点版本。

## 开发

```bash
npm ci
npm test
npm run lint
npm run build
```

项目使用当前 `@n8n/node-cli` 构建与校验体系。

## 从旧微信公众号节点迁移

建议新旧包短期并存，而不是直接覆盖：

1. 安装本节点；
2. 新建对应公众号 Credential；
3. 在 Workflow 中只替换微信公众号适配节点；
4. 验证真实草稿/素材结果；
5. 保留旧 Workflow 或旧版本作为回滚路径；
6. 新版本稳定运行后，再删除旧社区节点。

## 安全设计

- 不记录 App Secret、Access Token、文章正文和 Binary 内容；
- API Host 固定为 `https://api.weixin.qq.com`；
- 不提供任意 Raw API 调用入口；
- 不包含外部 Telemetry；
- 节点默认不直接作为 AI Tool 暴露给 Agent；如需 AI 自动操作公众号，建议由受控 n8n Workflow 作为权限边界。

常见错误会提供更明确的诊断，例如：

- `40164`：服务器出口 IP 未加入微信 API 白名单；
- `45009`：接口调用额度不足；
- `45011`：调用频率过高；
- `48001`：当前公众号没有该接口权限。

## 维护原则

这个仓库长期遵循几个原则：

- 生产优先；
- 小核心；
- 尽量使用 n8n 原生能力；
- 不记录敏感信息；
- 不隐藏业务逻辑；
- 不为“可能有一天会用”提前增加接口；
- 新能力先经过真实 Workflow 验证，再进入正式节点。

更多技术细节：

- [安全策略](SECURITY.md)
- [架构说明](docs/ARCHITECTURE.md)
- [微信公众号 API 基线](docs/WECHAT_API_BASELINE.md)

## License

MIT
