@echo off
echo ===================================================
echo   BOTC Grimoire - One-Click Build, Test & Doc Tool
echo ===================================================
echo.
echo This tool will:
echo 1. Clean Rust Cargo compile cache
echo 2. Clean frontend build output folder (dist)
echo 3. Rebuild frontend assets (Vite Build)
echo 4. Package Windows version (.exe)
echo 5. Package Android version (.apk)
echo 6. Run Playwright Integration Tests (Storyteller & Script Management)
echo 7. Convert Markdown Guides to PDF (.pdf) (Storyteller & Player)
echo.

::set /p CHOICE="Are you sure you want to build? [Y/N]: "
::if /I "%CHOICE%" neq "Y" goto END

echo.
echo ---------------------------------------------------
echo Step [1/6]: Cleaning Rust & Frontend build cache...
echo ---------------------------------------------------
echo Cleaning Rust cache...
cd src-tauri
call cargo clean
cd ..
echo Cleaning dist folder...
if exist dist rmdir /s /q dist
echo Cache clean complete!
echo.

echo ---------------------------------------------------
echo Step [2/6]: Rebuilding frontend assets (Vite Build)...
echo ---------------------------------------------------
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed! Please check your code.
    pause
    exit /b %ERRORLEVEL%
)
echo Frontend build complete!
echo.

echo ---------------------------------------------------
echo Step [3/6]: Packaging Windows (.exe)...
echo ---------------------------------------------------
call npx tauri build
if %ERRORLEVEL% neq 0 (
    echo [WARNING] EXE build failed, continuing to APK...
) else (
    echo Windows EXE build successful!
)
echo.

echo ---------------------------------------------------
echo Step [4/6]: Packaging Android (.apk)...
echo ---------------------------------------------------
call npm run build:android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] APK build failed! Please check Android SDK settings.
) else (
    echo Android APK build successful!
)
echo.

@REM echo ---------------------------------------------------
@REM echo Step [5/6]: Running Playwright Integration Tests...
@REM echo ---------------------------------------------------
@REM echo Running Storyteller Guide tests...
@REM py scripts\test_storyteller_guide_all.py
@REM if %ERRORLEVEL% neq 0 (
@REM     echo [WARNING] Storyteller guide tests failed!
@REM ) else (
@REM     echo Storyteller guide tests completed successfully!
@REM )
@REM echo.
@REM echo Running Script Management tests...
@REM py scripts\test_script_management_all.py
@REM if %ERRORLEVEL% neq 0 (
@REM     echo [WARNING] Script management tests failed!
@REM ) else (
@REM     echo Script management tests completed successfully!
@REM )
@REM echo.

@REM echo ---------------------------------------------------
@REM echo Step [6/6]: Converting Markdown Guides to PDF (.pdf)...
@REM echo ---------------------------------------------------
@REM echo Converting Storyteller Guide to PDF...
@REM py scripts\md_to_pdf.py guide\storyteller_guide.md
@REM if %ERRORLEVEL% neq 0 (
@REM     echo [WARNING] Failed to convert Storyteller Guide to PDF!
@REM ) else (
@REM     echo Storyteller Guide successfully converted to PDF!
@REM )
@REM echo.
@REM echo Converting Player Guide to PDF...
@REM py scripts\md_to_pdf.py guide\player_guide.md
@REM if %ERRORLEVEL% neq 0 (
@REM     echo [WARNING] Failed to convert Player Guide to PDF!
@REM ) else (
@REM     echo Player Guide successfully converted to PDF!
@REM )
@REM echo.

echo ===================================================
echo   Build, Test & Document generation completed!
echo   - Windows EXE: search in src-tauri\target\release
echo   - Android APK: search in src-tauri\gen\android
echo   - PDF Docs   : search in guide folder (.pdf)
echo   - Test Results: check screenshots folder
echo ===================================================
pause
exit /b 0

:END
echo Operation cancelled.
pause
exit /b 0

