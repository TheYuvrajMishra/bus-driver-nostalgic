#!/usr/bin/env python3
"""Incremental push: only upload blobs for changed files, build tree on top of remote base_tree.

Usage:
  incremental_push.py <local_dir> <owner> <repo> "<commit message>" <file1> <file2> ... [--account-id ca_xxx]
"""
import base64
import json
import os
import sys
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

CRED = "custom.composio"
ALLOWED = ["backend.composio.dev"]
BASE = "https://backend.composio.dev/api/v3"


def call(slug, arguments, account_id):
    payload = {
        "arguments": arguments,
        "connected_account_id": account_id,
        "user_id": "default",
    }
    r = urllib.request.Request(
        BASE + "/tools/execute/" + slug,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    add_surrogate_to_request(r, CRED, allowed_hosts=ALLOWED)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            out = read_json_response(resp)
    except Exception as e:
        try:
            body = e.read().decode()[:1000]
        except Exception:
            body = str(e)[:300]
        raise RuntimeError(f"{slug} HTTP error: {body}")
    if not out.get("successful", True):
        raise RuntimeError(f"{slug} unsuccessful: {json.dumps(out)[:800]}")
    return out["data"]


def main():
    args = sys.argv[1:]
    account_id = None
    if "--account-id" in args:
        idx = args.index("--account-id")
        account_id = args[idx + 1]
        args = args[:idx] + args[idx + 2:]
    local_dir, owner, repo, message = args[:4]
    files = args[4:]
    if not files:
        raise RuntimeError("No files specified")

    if not account_id:
        url = BASE + "/connected_accounts?user_id=default&limit=50"
        r = urllib.request.Request(url, method="GET")
        add_surrogate_to_request(r, CRED, allowed_hosts=ALLOWED)
        with urllib.request.urlopen(r, timeout=60) as resp:
            accs = read_json_response(resp).get("items", [])
        for a in accs:
            if a["toolkit"]["slug"] == "github" and a["status"] == "ACTIVE":
                account_id = a["id"]
                break
        if not account_id:
            raise RuntimeError("No ACTIVE github connected account found.")
    print(f"account: {account_id}")

    ref = call("GITHUB_GET_A_REFERENCE",
               {"owner": owner, "repo": repo, "ref": "heads/main"}, account_id)
    parent_sha = ref["object"]["sha"]
    print(f"parent: {parent_sha}")

    # base_tree from local git (synced to remote HEAD before our commit)
    import subprocess
    base_tree = subprocess.run(
        ["git", "rev-parse", f"{parent_sha}^{{tree}}"],
        cwd=local_dir, capture_output=True, text=True, check=True
    ).stdout.strip()
    print(f"base_tree: {base_tree}")

    entries = []
    for rel in files:
        full = os.path.join(local_dir, rel)
        with open(full, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        blob = call("GITHUB_CREATE_A_BLOB", {
            "owner": owner, "repo": repo, "content": b64, "encoding": "base64",
        }, account_id)
        entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        print(f"  blob {rel} -> {blob['sha'][:8]}")

    tree = call("GITHUB_CREATE_A_TREE", {
        "owner": owner, "repo": repo,
        "base_tree": base_tree,
        "tree": entries,
    }, account_id)
    print(f"tree: {tree['sha']}")

    commit = call("GITHUB_CREATE_A_COMMIT", {
        "owner": owner, "repo": repo, "message": message,
        "tree": tree["sha"], "parents": [parent_sha],
    }, account_id)
    print(f"commit: {commit['sha']}")

    updated = call("GITHUB_UPDATE_A_REFERENCE", {
        "owner": owner, "repo": repo, "ref": "heads/main", "sha": commit["sha"],
    }, account_id)
    print("main ->", updated["object"]["sha"])
    print(f"DONE https://github.com/{owner}/{repo}/commit/{commit['sha']}")


if __name__ == "__main__":
    main()
