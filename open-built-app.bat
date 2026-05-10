@echo off
chcp 65001 > nul
cd /d "%~dp0"
npm.cmd run build
start "" "%~dp0dist\index.html"
