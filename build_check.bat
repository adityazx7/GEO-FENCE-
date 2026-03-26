cd /d d:\AP\CivicSentinel-AI-main
echo === NEXT.JS BUILD === > build_log.txt
call npm run build >> build_log.txt 2>&1
echo === MOBILE TSC === >> build_log.txt
cd mobile
call npx tsc --noEmit >> ../build_log.txt 2>&1
cd ..
echo === DONE === >> build_log.txt
