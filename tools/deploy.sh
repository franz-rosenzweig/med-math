#!/bin/bash
# Copy Med Math to the stuffs site. It's a folder of static files, so that's all deploying is.
set -euo pipefail
cd "$(dirname "$0")/.."
rsync -a --delete app/ /srv/docker/stuffs/site/med-math/
echo "Live at https://stuffs.tiresia.xyz/med-math/"
