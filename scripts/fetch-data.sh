#!/usr/bin/env bash
set -euo pipefail

if [ -z "${GH_TOKEN:-}" ]; then
  echo "GH_TOKEN missing" >&2
  exit 1
fi
export GH_TOKEN

REPO_URL=$(git config -f .gitmodules --get submodule.src/data.url)
REPO_BRANCH=$(git config -f .gitmodules --get submodule.src/data.branch || echo main)
HTTPS_URL="${REPO_URL/git@github.com:/https://github.com/}"

FETCH_TMP=$(mktemp -d)
trap 'rm -rf "$FETCH_TMP"' EXIT
cat > "$FETCH_TMP/askpass" <<'ASKPASS'
#!/usr/bin/env bash
case "$1" in
  *Username*) printf '%s\n' 'x-access-token' ;;
  *Password*) printf '%s\n' "$GH_TOKEN" ;;
  *) exit 1 ;;
esac
ASKPASS
chmod 700 "$FETCH_TMP/askpass"

# Keep credentials out of the clone URL, process arguments and saved remote.
if ! GIT_ASKPASS="$FETCH_TMP/askpass" GIT_TERMINAL_PROMPT=0 \
  git -c credential.helper= clone --depth=1 --single-branch \
  --branch "$REPO_BRANCH" "$HTTPS_URL" "$FETCH_TMP/data"; then
  echo "Failed to fetch blog-data. Check Vercel GH_TOKEN validity and repository read access." >&2
  exit 1
fi

rm -rf src/data
mkdir -p src
mv "$FETCH_TMP/data" src/data
