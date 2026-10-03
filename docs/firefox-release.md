# Firefox 非公开签名与自动更新

仓库 Secrets：`AMO_JWT_ISSUER`、`AMO_JWT_SECRET`。只保存到 GitHub Actions
Secrets，不写入代码或日志。更新地址固定为：
https://finalpi.github.io/kiss-translator/firefox-updates.json

在 GitHub Settings → Pages 中确认使用 **Deploy from a branch**，分支为
`gh-pages`、目录为 `/ (root)`。现有 Pages 部署 action 向此分支推送站点文件。
首次成功部署前若该分支不存在，可在部署后选择它。不要改成其他域名或仅以
GitHub Actions Pages 工件为源，除非同步调整发布方式及更新地址。

发布入口仍为 `v*` 标签。先按仓库正常版本流程提升版本、提交和合并，再发布
与 package.json 一致的标签。已提交 AMO 的 2.1.0 不可当作新版本再次签名；
下次应使用新的版本号，例如 2.1.1。本次修改不会自动提升版本或推送标签。

工作流步骤：

1. 构建所有目标，并从同一构建工作区生成 Firefox 源码 ZIP。
2. 使用固定 web-ext 10.7.0 向 AMO 的 unlisted 渠道提交插件及源码。
3. 等待签名，最长一小时。检查返回 XPI 的签名文件、完整载荷、版本及更新地址。
   签名真实性最终由 Firefox 验证，脚本不会自行完成证书密码学验证。
4. 将 `kiss-translator_v<版本>_firefox.xpi` 上传到对应 GitHub Release。
5. 发布包含该 XPI 下载地址和 SHA-256 的 `firefox-updates.json`，与 Web 站点
   一起部署到 gh-pages。更新清单不会先于 XPI 上传成功而发布，也拒绝版本回退。
6. 显式调用 Pages 构建接口，并等待线上更新清单与产物逐字节一致。工作流令牌
   推送分支不会自动触发 Pages 构建，因此不能只凭分支提交成功判断已上线。

发布构建使用 `pnpm build:release && pnpm zip`，与完整构建的目标相同，但不会
全仓库格式化源码。提交前仅格式化本次改动，避免混入已有文件的无关格式调整。

手动审核可能超过一小时。超时会让签名 job 失败并保留线上旧更新清单；AMO
可能已收到提交，不要盲目重新上传同版本。先查看 AMO 版本状态，取回获批的
签名 XPI，再处理该次发布恢复。当前工作流没有实现人工审核超时后的自动恢复。
GitHub Release 及其他平台 ZIP 可能已发布，检查 job 状态区分部分成功。

首次迁移：所有已安装 2.1.0（没有更新地址）的设备，都须手动安装一次新的
签名 XPI；以后开启自动更新并能访问 GitHub/Pages 的设备可获取后续版本。
这不负责跨设备自动安装扩展，也不负责同步 API 密钥或用户设置。

发布后检查：Release 的 XPI 可下载；Pages 更新地址返回 JSON；清单的版本、
扩展 ID、下载链接及文件 SHA-256 正确；Firefox 手动“检查更新”能获取新版本。
旧版用户先导出设置备份，安装后验证网页翻译与所需同步功能。
