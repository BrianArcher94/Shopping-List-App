param (
    [string]$workspaceName
)

write-host "***** Create or select workspace *****"

# Get list of TF workspaces and check if the desired one exists
$workspaceList = terraform workspace list
$workspaceExists = $workspaceList | select-string -pattern "\b$workspaceName\b"

if (-not $workspaceExists) {
    write-host "Create new workspace"
    terraform workspace new $workspaceName -no-color
} else {
    write-host "Switch to existing workspace"
    terraform workspace select $workspaceName -no-color
}