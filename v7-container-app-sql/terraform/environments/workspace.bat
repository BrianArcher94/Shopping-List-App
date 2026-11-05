@echo off
echo ***** Create or select workspace *****

REM Change to parent directory where terraform config files are located

REM Check if the workspace exists
terraform workspace list | findstr /c:"%1" >nul
IF %ERRORLEVEL% NEQ 0 (
    echo Create new workspace %1
    terraform workspace new "%1" -no-color
) ELSE (
    echo Switch to workspace %1
    terraform workspace select "%1" -no-color
)