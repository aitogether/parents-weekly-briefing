#!/bin/bash
set -e

DEST=/Users/diygun/.openclaw/workspace/projects/parents-weekly-briefing/ui-prototype/screenshots
OUT_DIR=/Users/diygun/.openclaw/workspace/projects/parents-weekly-briefing/ui-prototype
VW=1080
VH=1920
DUR=5

# 裁剪为手机竖屏
for f in "$DEST"/0{1,2,3,4}-*.jpg; do
  base=$(basename "$f")
  ffmpeg -y -i "$f" -vf "crop=ih*9/16:ih,scale=${VW}:${VH}" "$DEST/phone-${base}" 2>/dev/null
done

# concat
cat > "$DEST/concat.txt" << EOF
file 'phone-01-report.jpg'
duration ${DUR}
file 'phone-02-daily.jpg'
duration ${DUR}
file 'phone-03-medication.jpg'
duration ${DUR}
file 'phone-04-settings.jpg'
duration ${DUR}
file 'phone-04-settings.jpg'
EOF

# 生成视频（先不加字幕）
ffmpeg -y -f concat -safe 0 -i "$DEST/concat.txt" \
  -c:v libx264 -pix_fmt yuv420p -r 24 \
  "$OUT_DIR/demo-nosub.mp4" 2>&1 | tail -3

# 叠加 ASS 字幕
ffmpeg -y -i "$OUT_DIR/demo-nosub.mp4" \
  -vf "ass=${DEST}/subtitles.ass" \
  -c:v libx264 -pix_fmt yuv420p \
  "$OUT_DIR/demo.mp4" 2>&1 | tail -3

ls -la "$OUT_DIR/demo.mp4"
