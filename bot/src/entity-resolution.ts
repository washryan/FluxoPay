import { normalizeText } from "./utils";

export type EntityCandidate = { id: string; name: string };
export type EntityResolution<T extends EntityCandidate> =
  | { status: "matched"; entity: T }
  | { status: "ambiguous"; candidates: T[] }
  | { status: "missing"; candidates: [] };

export function resolveEntity<T extends EntityCandidate>(query: string, candidates: T[]): EntityResolution<T> {
  const normalizedQuery = normalizeText(query);
  const exact = candidates.filter((candidate) => normalizeText(candidate.name) === normalizedQuery);
  if (exact.length === 1) return { status: "matched", entity: exact[0] };
  const partial = candidates.filter((candidate) => {
    const name = normalizeText(candidate.name);
    return name.includes(normalizedQuery) || normalizedQuery.includes(name);
  });
  if (partial.length === 1) return { status: "matched", entity: partial[0] };
  if (partial.length > 1) return { status: "ambiguous", candidates: partial };
  return { status: "missing", candidates: [] };
}
