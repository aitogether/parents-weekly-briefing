# 父母周报 Parents Weekly Briefing — 宣传片制作记录

## 最终产出

| 文件 | 规格 | 说明 |
|------|------|------|
| `parents-weekly-briefing-promo.mp4` | 1080p, 92MB, 3:39 | 完整高清版（推荐） |
| `parents-weekly-briefing-promo-720p.mp4` | 720p, 8.1MB, 3:39 | 压缩版（方便分享） |
| `voiceover-full.mp3` | 1.3MB, 3:43 | 完整旁白音频 |
| `voiceover-full.srt` | 99条字幕 | 中文字幕（可导入剪映/CapCut） |
| `voiceover-full.vtt` | WebVTT 格式 | 中文字幕（备用格式） |

所有文件位于：`docs/media/video/`

## 使用的工具

| 工具 | 用途 | 版本/配置 |
|------|------|----------|
| edge-tts | 中文旁白合成 | zh-CN-YunyangNeural, 语速 -5% |
| ffmpeg | 视频拼接、音频混合 | macOS Homebrew 版 |
| Pixabay | 免版权 BGM | Content License, 无需署名 |
| Python 3.14 | 脚本编排 | VTT→SRT 转换、ffmpeg 调用 |

## 制作决策

1. **配音人选**：选择 YunyangNeural（更沉稳，适合情感宣传片），而非 YunxiNeural（偏年轻活泼）
2. **BGM 音量**：设为 12%，确保旁白清晰可听
3. **画面策略**：初版使用 5 张产品截图 + Ken Burns 缩放效果循环展示
4. **视频分辨率**：1080p 主版本 + 720p 压缩版
5. **字幕**：ffmpeg 未编译 libass，字幕以 SRT 单独导出

## 待确认/后续优化

- [ ] **字幕烧录**：需在剪映/CapCut 中导入 SRT 并烧录，或重新编译带 libass 的 ffmpeg
- [ ] **镜头1-3画面**：初版用截图替代，理想应为「城市夜景」「加班场景」「父母独处」的画面（可 AI 生成或实拍）
- [ ] **转场效果**：当前为硬切，可考虑添加淡入淡出或交叉溶解
- [ ] **BGM 曲目**：需人工试听确认 Pixabay 钢琴曲是否合适
- [ ] **二维码**：结尾画面的 GitHub/网站二维码尚未生成
- [ ] **封面图**：可单独导出一帧作为视频封面

## 文件清单

```
docs/video/
├── script-cn.md          # 完整中文旁白脚本
├── storyboard.md         # 10镜头分镜表
└── video-notes.md        # 本文件

docs/media/video/
├── parents-weekly-briefing-promo.mp4        # 最终视频 1080p
├── parents-weekly-briefing-promo-720p.mp4   # 压缩版 720p
├── voiceover-full.mp3                       # 完整旁白
├── voiceover-full.srt                       # 中文字幕 SRT
├── voiceover-full.vtt                       # 中文字幕 VTT
├── app-icon.png                             # 应用图标
├── phone-02-report.jpg                      # 周报详情页
├── phone-03-med-confirm.jpg                 # 用药确认页
├── phone-04-med-plan.jpg                    # 用药计划页
├── phone-05-echo.jpg                        # 回声结果页
└── piano-gentle.mp3                         # BGM
```
