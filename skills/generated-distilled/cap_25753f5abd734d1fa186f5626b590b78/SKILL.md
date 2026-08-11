---
name: "collect-github-user-comments"
description: "Collect and normalize all recent comments and PR reviews by a specified GitHub user across confirmed repositories using the local gh CLI, producing a deduplicated, sorted JSON report of issue/PR comments, inline review comments, and review bodies."
user-invocable: true
x-xiaoba-capability-handle: "cap_25753f5abd734d1fa186f5626b590b78"
x-xiaoba-transition-id: "transition-00522f44-708d-453f-9816-c8a6b16fc21f"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:delivery:write_file:call-id-76b3be46764f-1, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:delivery:write_file:call-id-04e5a2298466-2, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#episode-episode:1:c1812882:settlement-2026-07-30T09:14:41.841Z"
---

# Collect a GitHub User's Comments Across Named Repositories

## When to use
Use this when a user asks to gather and review the recent comments made by a specific GitHub user (e.g., "Nobody-ly") across named repositories (e.g., "cats-company", "XiaoBa-CLI"), and a local `gh` CLI is available (or web access is acceptable). The transferable capability evidenced here is the read-only collection and normalization of that user's comments into a single JSON report — not the accuracy/compliance/testing judgment the user also mentioned, which is not evidenced in this episode.

## Prerequisites — confirm before running
1. Confirm the exact inputs with the user at execution time:
   - Target GitHub username whose comments are to be collected.
   - Repository **owner/org and repo names** (e.g., `owner/cats-company`, `owner/XiaoBa-CLI`). Do **not** assume an organization such as `buildsense-ai`; in the source episode that org was assumed by the agent without user confirmation and is not a safe default.
   - Time window ("recent") if the user wants one.
2. Verify the local `gh` CLI is installed and currently authenticated: run `gh auth status`. Require an explicit, current login and read access to the repositories at execution time. Never inherit credentials, tokens, or permissions from any prior session; if `gh` is not logged in or repo access is not confirmed, stop and ask the user.
3. Confirm the input comment-page JSON files exist. The evidenced pipeline reads pre-fetched GitHub API pages named `<repo>-issues.json` and `<repo>-pulls.json` (e.g., under `%TEMP%\nobody-ly-review`). If these pages do not exist yet, fetch them first (e.g., via `gh api` pagination for the repos' `issues` and `pulls` endpoints) — the fetch step itself is not shown in the episode evidence, so treat the pages as required inputs and verify them before proceeding.

## Steps
1. **Collect issue/PR conversation comments and inline review comments.** For each confirmed repo, read the pre-fetched `issues` and `pulls` JSON pages. Keep only records where the comment author (`user.login`) equals the target username. Classify: comments from `issues` pages as `issue_or_pr_comment` (or `conversation`), comments from `pulls` pages as `review_comment` (or `inline_review`). Preserve fields: `repo`, `kind`, `id`, `created_at`, `updated_at`, `url`, `issue_url`, `pull_request_url`, `path`, `line`, `side`, `commit_id`, `body`, `diff_hunk`.
2. **Collect submitted PR reviews.** List PRs with `gh pr list -R <owner>/<repo> --state all --search 'reviewed-by:<user>' --limit 100 --json number,title,url,updatedAt`. For each PR, fetch reviews with `gh api --paginate --slurp "repos/<owner>/<repo>/pulls/<number>/reviews?per_page=100"`. Keep reviews authored by the target user whose `body` is non-empty; classify them as `review` (use `submitted_at` for `created_at`/`updated_at`).
3. **Deduplicate and sort.** Deduplicate by `repo`, `kind`, `id` (e.g., `Sort-Object repo,kind,id -Unique`), then sort by `created_at` descending so the newest comments come first.
4. **Write a normalized report.** Serialize to JSON with depth (e.g., `ConvertTo-Json -Depth 8`) and write as UTF-8 (e.g., `Out-File -Encoding utf8`) to a local temp output such as `%TEMP%\nobody-ly-review\nobody-ly-comments.json`.
5. **Surface the results for spot-checking.** Print the total comment count, counts grouped by `repo`/`kind`, the oldest and newest `created_at` (date range), and each comment truncated to a readable length (e.g., ~260 chars) as `created_at<TAB>repo<TAB>kind<TAB>url<TAB>body`. Report the output path back to the user.

## Boundaries
- This skill covers only the read-only collection and normalization of a GitHub user's comments. The source episode does **not** contain evidence of script execution, nor of the accuracy, compliance, test, code-review, or visual-experience findings the user requested — do not claim those were completed.
- Requires current `gh` authentication and repository read access confirmed at execution time; do not inherit any access, credentials, or permissions from the episode or prior runs.
- Do not assume the repository owner/org, repository names, target username, or time window — all must be confirmed with the user.
- Do not create, modify, or close PRs/issues, and do not write to any repository. This is a local read-only data-gathering workflow only.
- Keep the capability bounded to this GitHub-comment collection task; do not extend it to arbitrary GitHub analysis or other account operations.
