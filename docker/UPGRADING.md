# Upgrading self-hosted Supabase

Use `update.sh` to pull in newer Supabase configuration files without overwriting
your secrets, overrides, or database data.

## Before you start

1. **Back up your database.** `update.sh` backs up configuration files to
   `backups/`, but it does not back up Postgres or Storage data.
2. Run from your **deployment directory** (where `docker-compose.yml` and
   `.env` live).

## Standard upgrade

```sh
# Optional: see what would change without writing anything
sh update.sh --dry-run

# Apply the upgrade (targets the latest self-hosted/v* release tag)
sh update.sh

# Pull new images and recreate containers
sh run.sh pull
sh run.sh recreate
```

Review the summary `update.sh` prints — especially any **CONFLICTS**, new
`.env` keys, or **breaking-change** notices.

## What `update.sh` changes

| Touched | Not touched |
| --- | --- |
| `docker-compose.yml`, override templates, vendor `volumes/*` config, scripts, `.env.example` | `.env` values you already set (new keys are appended) |
| `volumes/functions/main/index.ts` (vendor bundle) | `docker-compose.override.yml` |
| | Paths listed in `.gitignore` (data dirs, snippets, your edge functions, etc.) |

Installations created with `setup.sh` record their starting version in
`.supabase-version`. The script uses that to merge upstream changes safely.

## Options

| Flag | Purpose |
| --- | --- |
| `--dry-run` | Show the plan; write nothing |
| `--to <tag>` | Upgrade to a specific release (e.g. `self-hosted/v1.2.0`) |
| `--from <ref>` | Supply the base version when `.supabase-version` is missing |
| `--yes` | Skip the breaking-change confirmation prompt |

## Troubleshooting

### Merge conflicts

If the summary lists **CONFLICTS**, open those files and resolve the
`<<<<<<<`, `=======`, `>>>>>>>` markers before starting the stack. `update.sh`
exits with status `2` when conflicts remain.

You edited a vendor file and upstream changed the same file. Pick the correct
content (yours, upstream, or a combination), remove the markers, then run
`sh run.sh pull && sh run.sh recreate`.

### Custom auth providers (OAuth, SMS, SAML)

Enabling an external provider currently means uncommenting its lines in
`docker-compose.yml` (a vendor file) and filling in the matching keys in `.env`
— see the comments in `.env.example`. Those uncommented lines are your edits,
and `update.sh` keeps them: the 3-way merge only reports a **conflict** if a
release changes the very same lines (for example renaming a provider variable),
which it flags for you to resolve. A cleaner split that moves provider config
into a file the upgrader never touches is planned for a future release.

### Breaking-change prompt

Some releases need manual steps first (for example a Postgres major upgrade).
`update.sh` stops and lists them **before** modifying your files. Complete the
steps (including any `utils/*.sh` migration script mentioned), then re-run
`sh update.sh`.

Use `--yes` only if you have already done the required work.

### No `.supabase-version` (older or manual installs)

Without a recorded base version the script cannot merge safely. It runs in
**report-only** mode and prints guidance. To fix it once:

1. Identify the version you deployed (image tags in `docker-compose.yml` /
   `.env` vs [versions.md](./versions.md), or a [CHANGELOG.md](./CHANGELOG.md)
   date you remember pulling).
2. Write the stamp:

   ```sh
   printf 'ref=<tag-or-commit>\n' > .supabase-version
   ```

   Or pass the base inline: `sh update.sh --from <tag-or-commit>`.

### Pin a specific release

```sh
sh update.sh --to self-hosted/v1.2.0
```

Useful when you want to stay on a known version or upgrade in steps.

### Restore from backup

If something goes wrong, configuration backups are in `backups/pre-update-*.tgz`
(created on each non-dry-run upgrade). Extract or compare against that archive.
Your database backup is separate.

## More detail

- [CHANGELOG.md](./CHANGELOG.md) — what changed in each release
- [versions.md](./versions.md) — image version history
- [CONFIG.md](./CONFIG.md) — environment variable reference
