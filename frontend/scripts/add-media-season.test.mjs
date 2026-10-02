import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const generator = fileURLToPath(new URL("./add-media-entry.mjs", import.meta.url));

function preview(options) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cworld-season-test-"));
  try {
    const mock = path.join(root, "mock.mjs");
    fs.writeFileSync(mock, `
      globalThis.fetch = async (url) => {
        const pathname = new URL(url).pathname;
        console.error('FETCH ' + pathname);
        if (pathname === '/3/tv/123') return {ok:true,json:async()=>({seasons:[
          {season_number:1,episode_count:2},{season_number:6,episode_count:2}
        ]})};
        const match = pathname.match(/^\\/3\\/tv\\/123\\/season\\/(1|6)$/);
        if (!match) throw Error('Unexpected fetch: ' + pathname);
        return {ok:true,json:async()=>({episodes:[1,2].map(n=>({
          episode_number:n,name:'Source ' + match[1] + ' Episode ' + n,
          overview:'Selected season synopsis',air_date:'2026-01-01',id:600+n
        }))})};
      };
    `);
    return spawnSync(process.execPath, ["--import", mock, generator,
      "--id", "season-import-test-fixture", "--title", "Standalone Arc",
      "--type", "show", "--tmdb-id", "123", "--age-rating", "TV-MA",
      "--subtitles", "no", "--new-media", "--dry-run", ...options], {
      encoding: "utf8", env: { ...process.env, TMDB_READ_ACCESS_TOKEN: "test-only" },
    });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test("single source season defaults to destination season 1 and overrides the limit", () => {
  const result = preview(["--tmdb-season", "6", "--seasons", "1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Import only TMDB season 6 as CWorld season 1/);
  assert.match(result.stdout, /Source_6_Episode_1/);
  assert.doesNotMatch(result.stderr, /FETCH \/3\/tv\/123\/season\/1/);
  assert.match(result.stdout, /season=1&episode=1/);
});

test("custom destination numbering applies to episodes and new-on shelf", () => {
  const result = preview(["--tmdb-season", "6", "--cworld-season", "2"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Import only TMDB season 6 as CWorld season 2/);
  assert.match(result.stdout, /"2": \[/);
  assert.match(result.stdout, /season=2&episode=1/);
  assert.match(result.stdout, /placeholders\/season2\/S2E1_/);
});

test("normal season limit still imports only the first season", () => {
  const result = preview(["--seasons", "1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Source_1_Episode_1/);
  assert.doesNotMatch(result.stdout, /Source_6_Episode_1/);
});

test("blank selection still imports every regular season", () => {
  const result = preview([]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Source_1_Episode_1/);
  assert.match(result.stdout, /Source_6_Episode_1/);
});

for (const options of [["--tmdb-season", "0"], ["--tmdb-season", "1.5"],
  ["--cworld-season", "1"], ["--tmdb-season", "99"]]) {
  test(`reject invalid season selection: ${options.join(" ")}`, () => {
    const result = preview(options);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /positive whole season number|Select a TMDB source season|no regular episodes listed/);
  });
}
