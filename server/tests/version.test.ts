import assert from "node:assert";
import test from "node:test";

import { getVersionInfo, refreshVersionInfo } from "../version";

test("version helper surfaces package version", () => {
  const info = getVersionInfo();
  assert.ok(info.version.length > 0);
});

test("version helper respects commit env", () => {
  const originalCommit = process.env.BUILD_COMMIT;
  process.env.BUILD_COMMIT = "test-sha";

  const info = refreshVersionInfo();
  assert.equal(info.commit, "test-sha");

  process.env.BUILD_COMMIT = originalCommit;
  refreshVersionInfo();
});
