#!/usr/bin/env bash
set -euo pipefail

echo "***** Create or select workspace *****"

workspaceName="$1"

# Select the workspace if it already exists, otherwise create it.
# Using select-or-new is idempotent and avoids parsing `terraform workspace
# list`, which can fail to report a workspace that already exists in the
# backend and lead to a "workspace already exists" error on `new`.
if terraform workspace select "$workspaceName" -no-color 2>/dev/null; then
    echo "Switched to existing workspace $workspaceName"
else
    echo "Create new workspace $workspaceName"
    terraform workspace new "$workspaceName" -no-color
fi
