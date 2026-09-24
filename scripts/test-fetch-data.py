"""Run with python3 scripts/test-fetch-data.py; no network or real token needed."""
import os
from pathlib import Path
import subprocess
import tempfile

script = Path(__file__).with_name("fetch-data.sh").resolve()
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    (root / "src/data").mkdir(parents=True)
    old = root / "src/data/old"
    old.write_text("keep until successful clone")
    git = root / "git"
    git.write_text("""#!/usr/bin/env bash
set -eu
if [ "$1" = config ]; then
  case "$*" in
    *.url) echo git@github.com:frevia/blog-data.git ;;
    *.branch) echo main ;;
  esac
  exit 0
fi
[[ "$*" != *fake-token* ]]
[[ "$("$GIT_ASKPASS" Username)" = x-access-token ]]
[[ "$("$GIT_ASKPASS" Password)" = fake-token ]]
[[ "$GIT_TERMINAL_PROMPT" = 0 ]]
[[ "$*" = *https://github.com/frevia/blog-data.git* ]]
if [ "${FAIL_CLONE:-}" = 1 ]; then exit 128; fi
mkdir -p "${@: -1}"
echo fetched > "${@: -1}/new"
""")
    git.chmod(0o700)
    env = {**os.environ, "PATH": f"{root}:{os.environ['PATH']}"}
    env.pop("GH_TOKEN", None)
    def run():
        result = subprocess.run(["bash", str(script)], cwd=root, env=env,
                                capture_output=True, text=True)
        assert "fake-token" not in result.stdout + result.stderr
        return result.returncode
    assert run() != 0 and old.exists()
    env.update(GH_TOKEN="fake-token", FAIL_CLONE="1")
    assert run() != 0 and old.exists()
    env.pop("FAIL_CLONE")
    assert run() == 0 and not old.exists()
    assert (root / "src/data/new").read_text().strip() == "fetched"
print("PASS: missing token, failed clone preservation, password auth, successful replacement")
