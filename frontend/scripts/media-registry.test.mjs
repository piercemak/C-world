import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { frontendRoot, registryPath, renderRegistry, validateRegistry, generateRegistry } from "./generate-media-registry.mjs";
import { getSkipMarkers } from "../src/data/mediaTiming.js";

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

test("registry rejects duplicate identities and invalid skip timestamps before generating", () => {
  const copy = structuredClone(registry);
  copy.media.thegrey.assetId = copy.media.paprika.assetId;
  assert.throws(()=>renderRegistry(copy), /Duplicate asset identity/);
  const timings = structuredClone(registry);
  timings.media.onepunchman.skipTimes.seasons[1][5].intro.end = 2;
  assert.throws(()=>validateRegistry(timings), /Invalid intro timing/);
});

test("timing resolver preserves cold opens, declarative rules, and disabled intros", () => {
  assert.deepEqual(getSkipMarkers("onepunchman",1,5).intro,{start:70.05,end:159.8});
  assert.equal(getSkipMarkers("steven-universe",2,8).intro.end,25);
  assert.equal(getSkipMarkers("steven-universe",2,9).intro.end,22);
  assert.equal(getSkipMarkers("steven-universe",3,1).intro.end,22);
  assert.equal(getSkipMarkers("onepunchman",1,12).intro,null);
  assert.deepEqual(getSkipMarkers("unknown",1,1),{intro:null,outro:null});
});

test("title edits propagate to generated views while deliberate overrides survive", () => {
  const copy = structuredClone(registry);
  copy.media.thegrey.library.title = "New display title";
  const outputs = renderRegistry(copy);
  for (const key of ["src/data/libraryShowsData.js","src/components/mobileshowsData.js","src/data/carouselData.js","src/data/videoPlayerCatalogData.js","src/components/newMedia.js"]) {
    assert.match(outputs.get(key), /New display title/);
  }
  assert.equal(copy.media.fmab.mobile.title,"Fullmetal Alchemist");
  assert.match(outputs.get("src/components/mobileshowsData.js"), /"title": "Fullmetal Alchemist"/);
});

test("Add to CWorld writes the registry and consistent projections; drift checks detect edits", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),"cworld-registry-test-"));
  try {
    fs.mkdirSync(path.join(root,"src/data"),{recursive:true});
    fs.mkdirSync(path.join(root,"src/components/modules"),{recursive:true});
    fs.writeFileSync(path.join(root,"src/data/mediaRegistry.json"),JSON.stringify(registry));
    fs.copyFileSync(path.join(frontendRoot,"src/components/modules/videoLibrary.module.scss"),path.join(root,"src/components/modules/videoLibrary.module.scss"));
    fs.writeFileSync(path.join(root,"package.json"),JSON.stringify({type:"module",scripts:{}}));
    const env={...process.env,CWORLD_AUTHORING_ROOT:root};
    for(const key of ["TMDB_API_KEY","TMDB_READ_ACCESS_TOKEN","OMDB_API_KEY"]) delete env[key];
    const run=spawnSync(process.execPath,[path.join(frontendRoot,"scripts/add-media-entry.mjs"),"--id","registry-fixture","--title","Registry Fixture","--type","movie","--age-rating","PG","--subtitles","yes","--new-media"],{env,encoding:"utf8"});
    assert.equal(run.status,0,run.stderr);
    const updated=JSON.parse(fs.readFileSync(path.join(root,"src/data/mediaRegistry.json")));
    assert.ok(updated.media["registry-fixture"].captions.movie);
    assert.equal(updated.newMedia[0].showSlug,"registry-fixture");
    generateRegistry({root,check:true});
    const {SHOWS}=await import(pathToFileURL(path.join(root,"src/components/mobileshowsData.js")));
    assert.equal(SHOWS.at(-1).title,"Registry Fixture");
    fs.appendFileSync(path.join(root,"src/components/mobileshowsData.js"),"// accidental direct edit\n");
    assert.throws(()=>generateRegistry({root,check:true}),/stale/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
