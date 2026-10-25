// End-to-end backend lifecycle verification (auth, upload, feed, comment, reaction, soft-delete, restore)
const BASE = "http://localhost:8000";
const fs = await import("node:fs/promises");
const path = await import("node:path");

const FIX = "E:/Users/hangu/AppData/Local/Temp/opencode";

async function main() {
  const log = (...a) => console.log(...a);
  const check = (label, ok) => { log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failed.push(label); };
  const failed = [];

  // Account setup: fresh user
  const uname = `e2e_${Date.now().toString(36)}`;
  let r = await fetch(`${BASE}/api/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: uname, password: "Testpass!1" }),
  });
  check("register 200", r.status === 200);

  r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: uname, password: "Testpass!1" }),
  });
  let login = await r.json();
  check("login 200 + tokens", r.status === 200 && !!login.accessToken && !!login.refreshToken);

  const H = { Authorization: `Bearer ${login.accessToken}` };

  // Admin login
  r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "ChangeMeAdmin!1" }),
  });
  const admin = await r.json();
  check("admin login", r.status === 200);

  // Unauthenticated feed must fail
  r = await fetch(`${BASE}/api/posts`);
  check("feed requires auth (401)", r.status === 401);

  // Create post with PNG + MP4
  const fd = new FormData();
  fd.set("caption", "E2E lifecycle post");
  const pngBytes = await fs.readFile(path.join(FIX, "test1.png"));
  const mp4Bytes = await fs.readFile(path.join(FIX, "test1.mp4"));
  fd.append("files", new Blob([pngBytes], { type: "image/png" }), "lifecycle.png");
  fd.append("files", new Blob([mp4Bytes], { type: "video/mp4" }), "lifecycle.mp4");

  r = await fetch(`${BASE}/api/posts`, { method: "POST", headers: H, body: fd });
  const post = await r.json();
  check("create post 200", r.status === 200);
  check("post has 2 media (image+video)", post.media?.length === 2 &&
    post.media.some(m => m.mediaKind === "image") && post.media.some(m => m.mediaKind === "video"));
  check("audit createdAt set", !!post.createdAt);

  const badFd = new FormData();
  badFd.set("caption", "bad");
  badFd.append("files", new Blob([Buffer.from("%PDF-1.4 not allowed")], { type: "application/pdf" }), "evil.pdf");
  r = await fetch(`${BASE}/api/posts`, { method: "POST", headers: H, body: badFd });
  check("rejected file type 400", r.status === 400);

  // Comments
  r = await fetch(`${BASE}/api/posts/${post.id}/comments`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ content: "First comment!" }),
  });
  const comment = await r.json();
  check("comment created", r.status === 200 && comment.content === "First comment!");

  r = await fetch(`${BASE}/api/posts/${post.id}/comments`, { headers: H });
  let comments = await r.json();
  check("comment listed", comments.length === 1);

  // Reactions
  r = await fetch(`${BASE}/api/posts/${post.id}/reactions`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ reactionType: "like" }),
  });
  let counts = await r.json();
  check("react like count=1", counts.some(c => c.reactionType === "like" && c.count === 1));

  // duplicate reaction — idempotent
  r = await fetch(`${BASE}/api/posts/${post.id}/reactions`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ reactionType: "like" }),
  });
  counts = await r.json();
  check("duplicate react idempotent", counts.filter(c => c.reactionType === "like")[0].count === 1);

  // second reaction type
  r = await fetch(`${BASE}/api/posts/${post.id}/reactions`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ reactionType: "heart" }),
  });
  counts = await r.json();
  check("second reaction type allowed", counts.length === 2);

  // remove heart (soft delete)
  r = await fetch(`${BASE}/api/posts/${post.id}/reactions/heart`, { method: "DELETE", headers: H });
  counts = await r.json();
  check("unreact removes heart", r.status === 200 && !counts.some(c => c.reactionType === "heart"));

  // feed shows post with counts
  r = await fetch(`${BASE}/api/posts?limit=5`, { headers: H });
  const feed = await r.json();
  const feedPost = feed.items.find(p => p.id === post.id);
  check("feed contains post", !!feedPost);
  check("feed comments count=1", feedPost.commentCount === 1);
  check("feed reaction like=1", feedPost.reactionCounts[0]?.count === 1);
  check("feed media served", feedPost.media.length === 2);

  // media serving: header auth AND ?accessToken= (browser <video> path)
  const mediaId = post.media.find(m => m.mediaKind === "image").id;
  r = await fetch(`${BASE}/api/media/${mediaId}/file`, { headers: H });
  check("media GET via header auth", r.status === 200 && r.headers.get("content-type").startsWith("image/png"));
  r = await fetch(`${BASE}/api/media/${mediaId}/file?accessToken=${login.accessToken}`);
  check("media GET via ?accessToken", r.status === 200);
  r = await fetch(`${BASE}/api/media/${mediaId}/file?accessToken=garbage`);
  check("media GET bad token 401", r.status === 401);

  // other user cannot delete my post
  const uname2 = `e2e_${(Date.now() + 1).toString(36)}`;
  await fetch(`${BASE}/api/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: uname2, password: "Testpass!1" }),
  });
  const login2 = await (await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: uname2, password: "Testpass!1" }),
  })).json();
  r = await fetch(`${BASE}/api/posts/${post.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${login2.accessToken}` } });
  check("foreign delete forbidden 403", r.status === 403);

  // soft-delete post → files move to trash
  const countStorageFiles = async () => {
    const all = [];
    const walkAll = async (dir) => {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        if (e.isFile() && e.name !== ".gitkeep") all.push(e.name);
      }
    };
    await walkAll(path.join(storageRoot, "trash", "image"));
    await walkAll(path.join(storageRoot, "trash", "video"));
    return all;
  };
  const storageRoot = "E:/Project/ShinigaCim Project/Backend/Storage";
  const trashedCountBefore = (await countStorageFiles()).length;
  r = await fetch(`${BASE}/api/posts/${post.id}`, { method: "DELETE", headers: H });
  check("owner delete 204", r.status === 204);

  r = await fetch(`${BASE}/api/posts?limit=50`, { headers: H });
  const feed2 = await r.json();
  check("feed excludes soft-deleted post", !feed2.items.some(p => p.id === post.id));

  r = await fetch(`${BASE}/api/media/${mediaId}/file`, { headers: H });
  check("media of deleted post unavailable", r.status === 404);

  r = await fetch(`${BASE}/api/posts/${post.id}/comments`, { headers: H });
  check("comments of deleted post hidden", (await r.json()).length === 0);

  // trash directory (delta): the post's 2 files were moved in; originals counted before
  const files = [];
  const walk = async (dir, rel = "") => {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p, path.join(rel, e.name));
      else files.push(path.join(rel, e.name).replace(/\\/g, "/"));
    }
  };
  await walk(storageRoot);
  const trashed = files.filter(f => f.startsWith("trash/"));
  const active = files.filter(f => f.startsWith("media/"));
  // The deleted post's media must not remain anywhere under media/<kind>/.
  const strays = active.filter(f => post.media.some(m => f.endsWith(path.basename(m.storagePath))));
  check("trashed count grew by 2 this run", trashedCountBefore + 2 === trashed.length);
  check("deleted post's files moved out of media/", strays.length === 0);
  const trashedBoth = post.media.every(m =>
    trashed.some(f => f.endsWith(path.basename(m.storagePath))));
  check("deleted post's files present in trash", trashedBoth);

  // restore with admin user (any active media? post is deleted → restore blocked by policy)
  r = await fetch(`${BASE}/api/media/${mediaId}/restore`, { method: "POST", headers: { Authorization: `Bearer ${admin.accessToken}` } });
  check("restore into deleted post blocked 409", r.status === 409);

  console.log(failed.length === 0 ? "\nALL CHECKS PASSED" : `\n${failed.length} CHECKS FAILED: ${failed.join("; ")}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(e => { console.error("SCRIPT ERROR", e); process.exit(2); });
