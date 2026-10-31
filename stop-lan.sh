#!/bin/sh
set -eu
cd "$(dirname "$0")"
port=${PORT:-4173}
case "$port" in *[!0-9]*|'') echo '端口必须是数字。' >&2; exit 1;; esac
pid_file=".lan-cert/$port.pid"
if [ ! -f "$pid_file" ]; then
  echo "没有找到由 start-lan.sh 启动的端口 $port 的服务。"
  exit 1
fi
pid=$(cat "$pid_file")
case "$pid" in *[!0-9]*|'') echo '进程记录无效，请检查 PID 文件。' >&2; exit 1;; esac
if [ ! -r "/proc/$pid/cmdline" ]; then
  echo "服务进程不存在或无法核验，请检查 $pid_file。" >&2
  exit 1
fi
command_line=$(tr '\000' ' ' < "/proc/$pid/cmdline")
case "$command_line" in
  *'node lan-server.mjs '*) kill "$pid"; echo "已发送停止请求（端口 $port）。";;
  *) echo "进程 $pid 与局域网服务不匹配，未停止。" >&2; exit 1;;
esac
