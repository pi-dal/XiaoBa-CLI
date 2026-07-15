/**
 * Issue #94 — opt-in official xURL smoke.
 *
 * This smoke is intentionally environment-gated so deterministic CI remains
 * independent of a locally installed xURL binary, user credentials, or private
 * logs. It records the release-gate seam now and becomes fully end-to-end once
 * #90–#93 land the official `agents://` reader wiring and multi-provider wake
 * path.
 *
 * Current behavior on this branch:
 *   - when disabled, the test skips cleanly;
 *   - when enabled, it verifies the official binary is present and records the
 *     version diagnostic;
 *   - fixture roots are present for Codex, Claude, and Pi.
 *
 * Integration-dependent follow-up after #90–#93:
 *   - invoke the unmodified installed xURL binary against these synthetic roots;
 *   - activate without historical admission;
 *   - append a stable completed turn;
 *   - run the public Runtime wake seam;
 *   - observe concurrent reads and serialized durable admission.
 */
import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { getXurlVersion } from '../src/utils/xurl-compatibility';

const SMOKE_ROOT = path.join(process.cwd(), 'tests', 'fixtures', 'xurl-smoke');
const ENABLED = /^(1|true|yes|on)$/i.test(process.env.XIAOBA_OFFICIAL_XURL_SMOKE ?? '');
const COMMAND = process.env.XIAOBA_EXTERNAL_SESSION_LOG_XURL_COMMAND || 'xurl';

describe('official xurl smoke (opt-in)', () => {
  test('prerequisites and fixture roots', { skip: !ENABLED }, () => {
    const diagnostic = getXurlVersion(COMMAND);
    assert.equal(
      diagnostic.source,
      'cli',
      `official xURL smoke prerequisite failed: command not available (${COMMAND})`,
    );

    for (const provider of ['codex', 'claude', 'pi']) {
      const threadsDir = path.join(SMOKE_ROOT, provider, 'threads');
      assert.ok(fs.existsSync(threadsDir), `missing smoke fixture threads dir for ${provider}`);
      const files = fs.readdirSync(threadsDir).filter(file => file.endsWith('.md'));
      assert.ok(files.length > 0, `missing smoke fixture timeline files for ${provider}`);
    }
  });
});