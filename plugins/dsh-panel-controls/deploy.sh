#!/usr/bin/env bash
# Deploy dsh-panel-controls into the dsh web profile and enable it (Linux/macOS).
set -euo pipefail

PROFILE="${1:-web}"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"
# Shared lib install (a profile-private node_modules is rebuilt by pnpm, so the
# package goes into the shared profile node_modules instead).
TARGET="$DSH_HOME/profiles/node_modules/dsh-panel-controls"
PATCH="$PROFILE_DIR/cordis.patch.yml"

if [ ! -f "$PROFILE_DIR/cordis.yml" ]; then
  echo "未找到 profile：$PROFILE_DIR —— 请先至少运行过一次 dsh $PROFILE" >&2
  exit 1
fi

mkdir -p "$TARGET"
cp -R "$ROOT/lib" "$ROOT/package.json" "$ROOT/cordis.patch.yml" "$ROOT/README.md" "$ROOT/LICENSE" "$TARGET/"

if [ ! -f "$PATCH" ]; then
  echo '[]' > "$PATCH"
fi
if ! grep -q '^    - id: panel-controls$' "$PATCH"; then
  printf '\n- insert:\n    - id: panel-controls\n      name: dsh-panel-controls\n' >> "$PATCH"
  echo "OK 已写入启用条目：$PATCH"
else
  echo "OK 启用条目已存在：$PATCH"
fi

echo "OK 已安装：$TARGET"
echo
echo '下一步：'
echo '  1. 重启 dsh web 服务进程'
echo '  2. 刷新浏览器页面，打开任意会话，composer 下方应出现「Focus workspaces」控制条'