@echo off
cd /d "%~dp0"
echo ===================================================
echo      FIXING RENDER DEPLOYMENT - SHOPHUB BACKEND
echo ===================================================
echo.
echo 1. Initializing Git Repository...
git init

echo 2. Setting branch to main...
git checkout -b main

echo 3. Adding remote repository...
git remote add origin https://github.com/mazhar-devx/backend_shophub.git

echo 4. Adding all files (including package.json)...
git add .

echo 5. Committing changes...
git commit -m "Fix deployment: Add google-auth-library"

echo 6. Pushing to GitHub...
echo.
echo NOTE: You might be asked for your GitHub username and password/token.
echo.
git push -u origin main --force

echo.
echo ===================================================
echo      DONE! Render should now deploy automatically.
echo ===================================================
pause
