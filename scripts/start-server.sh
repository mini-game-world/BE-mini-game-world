#!/bin/bash

echo "---------------- 서버 배포 시작 ------------------"
cd /home/ubuntu/minigameworld
npm i
pm2 kill
pm2 start dist/main.js --name "minigameworld"
echo "---------------- 서버 배포 시작 ------------------"