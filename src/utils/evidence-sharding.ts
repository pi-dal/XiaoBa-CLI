/**
 * Deterministic Evidence Sharding — Runtime-owned partition of an Evidence Bundle.
 *
 * Partitions first along stable domain boundaries. An oversized domain unit is
 * split recursively along internal structure, with a stable byte boundary only
 * as the final fallback. Shard identity never depends on a model tokenizer.
 */

import * as crypto from 'crypto';
import type { EvidenceBundle } from './skill-evolution';
import type {
  EvidenceBundleManifest,
  EvidenceShard,
  EvidenceShardDomainKind,
} from './evidence-review-types';

/** Default soft content budget for one shard before recursive split (bytes). */
export const DEFAULT_SHARD_SOFT_LIMIT_BYTES = 12_000;

/** Absolute maximum shard payload before forced byte split. */
export const DEFAULT_SHARD_HARD_LIMIT_BYTES = 24_000;

export interface ShardingOptions {
  softLimitBytes?: number;
  hardLimitBytes?: number;
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b, 'en'))) {
      out[key] = canonicalize(record[key]);
    }
    return out;
  }
  return value;
}

export function hashEvidenceContent(content: string): string {
  return sha256(content);
}

export function hashEvidenceBundle(bundle: EvidenceBundle): string {
  return sha256(stableStringify(bundle));
}

export function makeShardId(domainKind: EvidenceShardDomainKind, contentHash: string, index: number): string {
  return `shard:${domainKind}:${contentHash.slice(0, 16)}:${index}`;
}

interface DomainUnit {
  domainKind: EvidenceShardDomainKind;
  sourceIdentity: string;
  content: string;
}

function domainUnitsFromBundle(bundle: EvidenceBundle): DomainUnit[] {
  const units: DomainUnit[] = [];
  units.push({
    domainKind: 'episode',
    sourceIdentity: `episode:${bundle.bundleId}`,
    content: stableStringify(bundle.episode ?? null),
  });
  if (bundle.completionEvidence?.length) {
    for (const [index, item] of bundle.completionEvidence.entries()) {
      units.push({
        domainKind: 'completion_evidence',
        sourceIdentity: typeof item?.ref === 'string' ? item.ref : `completion:${index}`,
        content: stableStringify(item),
      });
    }
  }
  if (bundle.settlementEvidence?.length) {
    for (const [index, item] of bundle.settlementEvidence.entries()) {
      units.push({
        domainKind: 'settlement_evidence',
        sourceIdentity: typeof item?.ref === 'string' ? item.ref : `settlement:${index}`,
        content: stableStringify(item),
      });
    }
  }
  if (bundle.boundedContinuity?.length) {
    units.push({
      domainKind: 'bounded_continuity',
      sourceIdentity: `continuity:${bundle.bundleId}`,
      content: stableStringify(bundle.boundedContinuity),
    });
  }
  if (bundle.referencedSkills?.length) {
    for (const [index, skill] of bundle.referencedSkills.entries()) {
      const name = typeof (skill as { name?: string })?.name === 'string'
        ? (skill as { name: string }).name
        : `referenced:${index}`;
      units.push({
        domainKind: 'referenced_skill',
        sourceIdentity: name,
        content: stableStringify(skill),
      });
    }
  }
  if (bundle.relatedCurrentSkills?.length) {
    for (const [index, skill] of bundle.relatedCurrentSkills.entries()) {
      const handle = typeof (skill as { handle?: string })?.handle === 'string'
        ? (skill as { handle: string }).handle
        : `related:${index}`;
      units.push({
        domainKind: 'related_current_skill',
        sourceIdentity: handle,
        content: stableStringify(skill),
      });
    }
  }
  if (bundle.semanticObservations?.length) {
    units.push({
      domainKind: 'semantic_observations',
      sourceIdentity: `semantic:${bundle.bundleId}`,
      content: stableStringify(bundle.semanticObservations),
    });
  }
  if (bundle.sourceEvidence?.length) {
    units.push({
      domainKind: 'source_evidence',
      sourceIdentity: `source:${bundle.bundleId}`,
      content: stableStringify(bundle.sourceEvidence),
    });
  }
  return units;
}

function splitByStructure(content: string, hardLimit: number): string[] {
  if (Buffer.byteLength(content, 'utf8') <= hardLimit) return [content];
  // Prefer paragraph, then line, then turn-like JSON object boundaries.
  const paragraphParts = content.split(/\n{2,}/);
  if (paragraphParts.length > 1) {
    return packParts(paragraphParts, hardLimit, '\n\n');
  }
  const lineParts = content.split('\n');
  if (lineParts.length > 1) {
    return packParts(lineParts, hardLimit, '\n');
  }
  return splitByStableBytes(content, hardLimit);
}

function packParts(parts: string[], hardLimit: number, joiner: string): string[] {
  const out: string[] = [];
  let current = '';
  for (const part of parts) {
    const candidate = current ? `${current}${joiner}${part}` : part;
    if (Buffer.byteLength(candidate, 'utf8') <= hardLimit) {
      current = candidate;
      continue;
    }
    if (current) out.push(current);
    if (Buffer.byteLength(part, 'utf8') <= hardLimit) {
      current = part;
    } else {
      out.push(...splitByStableBytes(part, hardLimit));
      current = '';
    }
  }
  if (current) out.push(current);
  return out.length > 0 ? out : [''];
}

function splitByStableBytes(content: string, hardLimit: number): string[] {
  const buffer = Buffer.from(content, 'utf8');
  if (buffer.length <= hardLimit) return [content];
  const out: string[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    let end = Math.min(buffer.length, offset + hardLimit);
    // Avoid splitting multi-byte UTF-8 sequences.
    while (end > offset && (buffer[end - 1]! & 0xc0) === 0x80) end -= 1;
    if (end === offset) end = Math.min(buffer.length, offset + hardLimit);
    out.push(buffer.subarray(offset, end).toString('utf8'));
    offset = end;
  }
  return out;
}

function shardFromUnit(
  unit: DomainUnit,
  content: string,
  index: number,
): EvidenceShard {
  const contentHash = hashEvidenceContent(content);
  return {
    shardId: makeShardId(unit.domainKind, contentHash, index),
    domainKind: unit.domainKind,
    sourceIdentity: unit.sourceIdentity,
    contentHash,
    content,
    byteLength: Buffer.byteLength(content, 'utf8'),
  };
}

/**
 * Partition a frozen Evidence Bundle into content-addressed Evidence Shards.
 * When the entire bundle fits the soft limit, emit one bundle_remainder shard
 * so one-shard tracer jobs remain simple and deterministic.
 */
export function shardEvidenceBundle(
  bundle: EvidenceBundle,
  options: ShardingOptions = {},
): { manifest: EvidenceBundleManifest; shards: EvidenceShard[] } {
  const softLimit = Math.max(1, options.softLimitBytes ?? DEFAULT_SHARD_SOFT_LIMIT_BYTES);
  const hardLimit = Math.max(softLimit, options.hardLimitBytes ?? DEFAULT_SHARD_HARD_LIMIT_BYTES);
  const whole = stableStringify(bundle);
  const wholeBytes = Buffer.byteLength(whole, 'utf8');

  let shards: EvidenceShard[];
  if (wholeBytes <= softLimit) {
    const contentHash = hashEvidenceContent(whole);
    shards = [{
      shardId: makeShardId('bundle_remainder', contentHash, 0),
      domainKind: 'bundle_remainder',
      sourceIdentity: `bundle:${bundle.bundleId}`,
      contentHash,
      content: whole,
      byteLength: wholeBytes,
    }];
  } else {
    const units = domainUnitsFromBundle(bundle);
    const expanded: EvidenceShard[] = [];
    let index = 0;
    for (const unit of units) {
      const unitBytes = Buffer.byteLength(unit.content, 'utf8');
      if (unitBytes <= softLimit) {
        expanded.push(shardFromUnit(unit, unit.content, index++));
        continue;
      }
      const pieces = unitBytes <= hardLimit
        ? splitByStructure(unit.content, hardLimit)
        : splitByStableBytes(unit.content, hardLimit);
      for (const piece of pieces) {
        expanded.push(shardFromUnit(unit, piece, index++));
      }
    }
    shards = expanded;
  }

  // Stable order by shardId for reproducible manifests.
  shards = [...shards].sort((a, b) => a.shardId.localeCompare(b.shardId, 'en'));
  const manifestHash = sha256(stableStringify({
    bundleId: bundle.bundleId,
    shardIds: shards.map(s => s.shardId),
    contentHashes: shards.map(s => s.contentHash),
  }));
  const manifest: EvidenceBundleManifest = {
    manifestId: `manifest:${manifestHash.slice(0, 24)}`,
    manifestHash,
    bundleId: bundle.bundleId,
    shardIds: shards.map(s => s.shardId),
    createdAt: new Date(0).toISOString(),
  };
  return { manifest, shards };
}

export function verifyShardContent(shard: EvidenceShard): boolean {
  return hashEvidenceContent(shard.content) === shard.contentHash;
}
