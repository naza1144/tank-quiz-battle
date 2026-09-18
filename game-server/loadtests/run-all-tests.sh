#!/bin/sh
# รันชุดเทสต์ทั้งหมดของ game-server เรียงกัน แล้วสรุปผลท้ายสุด
# ใช้: docker run --rm -v "<repo>/game-server:/app" -w /app node:20 sh loadtests/run-all-tests.sh
set -u

TESTS="test-game.ts test-spec-features.ts test-exhaustive-all-modes.ts test-multiplayer-full.ts test-socket-multiplayer.ts test-multi-round-exhaustive.ts test-brutal-full-room-coop.ts"

failed=0
for f in $TESTS; do
  printf '===== %s =====\n' "$f"
  if ./node_modules/.bin/tsx "$f" >/tmp/out.log 2>&1; then
    echo 'PASS'
  else
    echo 'FAIL'
    tail -25 /tmp/out.log
    failed=$((failed + 1))
  fi
done

printf '\n===== SUMMARY: %s failed =====\n' "$failed"
exit $failed
