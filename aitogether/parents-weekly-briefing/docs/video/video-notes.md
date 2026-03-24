# 视频笔记 - Parents Weekly Briefing 宣传片

## 使用工具

| 工具 | 用途 | 备注 |
|------|------|------|
| edge-tts (zh-CN-YunyangNeural) | TTS 旁白生成 | 语速 -8%，58秒 |
| ffmpeg 8.0.1 | 视频合成 | Homebrew 版本 |
| Python 3.14 | 自动化脚本 | |
| Pixabay BGM | piano-gentle.mp3 | 2:27，循环使用 |

## 制作决策

- **背景色**: `#1a8066`（深青绿，品牌色 `#20A080` 的深色变体）
- **分辨率**: 1920x1080 @ 24fps
- **截图布局**: 手机截图居中，高 800px，Ken Burns 缓慢缩放效果
- **BGM 音量**: 15%，避免盖过旁白
- **截图顺序**: 周报 → 用药确认 → 用药计划 → 回声 → Logo
- **总时长**: ~58秒（匹配旁白长度）

## 待确认事项

- ⚠️ **字幕未烧录**: 系统 ffmpeg 未编译 libass，无法使用 subtitles/drawtext 滤镜。如需字幕：
  - 方案 A: `brew install ffmpeg --with-libass`（可能需要自定义编译）
  - 方案 B: 使用 CapCut/剪映 等视频编辑软件手动添加
  - 方案 C: 用 Python + Pillow 逐帧渲染字幕（复杂但可控）
- ⚠️ **旁白时长较短**（58秒）：原脚本内容偏短，如需更长视频可补充更多文案
- 📝 **SRT 字幕文件已生成**: `voiceover-full.srt`，可直接导入剪映等工具
- 🎬 **Ken Burns 效果**: 每个片段有缓慢缩放动画，增加视觉动感

## 素材清单

```
docs/media/video/
├── app-icon.png              # App 图标
├── phone-02-report.jpg       # 周报界面截图
├── phone-03-med-confirm.jpg  # 用药确认截图
├── phone-04-med-plan.jpg     # 用药计划截图
├── phone-05-echo.jpg         # 回声区域截图
├── piano-gentle.mp3          # BGM (4.5MB)
├── voiceover-full.mp3        # 完整 TTS 旁白 (58秒)
├── voiceover-full.vtt        # VTT 字幕
├── voiceover-full.srt        # SRT 字幕
└── parents-weekly-briefing-promo.mp4  # 最终视频 (2.0MB)
```
