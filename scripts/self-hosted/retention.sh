#!/usr/bin/env bash
set -euo pipefail

backup_dir=${FLUXOPAY_BACKUP_DIR:-/data/atlas/apps/fluxopay/backups/encrypted}
mode=${1:---dry-run}

if [[ "$mode" != "--dry-run" && "$mode" != "--apply" ]]; then
  echo "Usage: $0 [--dry-run|--apply]" >&2
  exit 2
fi

declare -A keep=()
declare -A weeks=()
declare -A months=()
mapfile -t files < <(find "$backup_dir" -maxdepth 1 -type f -name 'fluxopay-????????T??????Z.dump.gpg' -printf '%f\n' | sort -r)

for index in "${!files[@]}"; do
  file=${files[$index]}
  stamp=${file#fluxopay-}
  day=${stamp:0:8}
  iso_date="${day:0:4}-${day:4:2}-${day:6:2}"

  if (( index < 7 )); then
    keep[$file]=daily
  fi

  week=$(date -d "$iso_date" +%G-%V)
  if [[ -z ${weeks[$week]+x} && ${#weeks[@]} -lt 4 ]]; then
    weeks[$week]=1
    keep[$file]="${keep[$file]:+${keep[$file]},}weekly"
  fi

  month=${day:0:6}
  if [[ -z ${months[$month]+x} && ${#months[@]} -lt 6 ]]; then
    months[$month]=1
    keep[$file]="${keep[$file]:+${keep[$file]},}monthly"
  fi
done

for file in "${files[@]}"; do
  if [[ -n ${keep[$file]+x} ]]; then
    printf 'KEEP %s (%s)\n' "$file" "${keep[$file]}"
  elif [[ "$mode" == "--apply" ]]; then
    rm -f -- "$backup_dir/$file" "$backup_dir/$file.sha256"
    printf 'DELETE %s\n' "$file"
  else
    printf 'WOULD_DELETE %s\n' "$file"
  fi
done
