/* Yowza Bowl, part 3 of 4: the online layer. A thin wrapper over a Firebase Realtime Database (free plan), so the
   lobby, rooms, chat and Hall of Fame are shared by everyone in the league. All league data sits under one private
   "space" key that only the built site knows, so strangers who find the database can't read or join the league's lanes.

   connect("mock", space) gives the same interface backed by this browser's own storage. The tests use it to play a
   two-player game between two tabs without touching the real database. */
(function (root) {
  "use strict";
  if (typeof document === "undefined") return;
  const YB = root.YB, SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const load = src => new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Couldn't load " + src));
    document.head.appendChild(s);
  });

  async function connect(config, space) {
    if (config === "mock") return mock(space);
    if (!root.firebase || !root.firebase.database) {
      await load(SDK + "firebase-app-compat.js");
      await Promise.all([load(SDK + "firebase-auth-compat.js"), load(SDK + "firebase-database-compat.js")]);
    }
    const fb = root.firebase;
    if (!fb.apps.length) fb.initializeApp(config);
    const cred = await fb.auth().signInAnonymously();
    const db = fb.database(), ref = p => db.ref("y/" + space + "/" + p);
    let offset = 0;
    db.ref(".info/serverTimeOffset").on("value", s => { offset = s.val() || 0; });
    return {
      uid: cred.user.uid,
      now: () => Date.now() + offset,
      set: (p, v) => ref(p).set(v),
      update: (p, v) => ref(p).update(v),
      remove: p => ref(p).remove(),
      push: (p, v) => { const r = ref(p).push(); r.set(v); return r.key; },
      get: p => ref(p).once("value").then(s => s.val()),
      watch: (p, cb) => { const r = ref(p), f = s => cb(s.val()); r.on("value", f); return () => r.off("value", f); },
      added: (p, cb, limit) => { const r = limit ? ref(p).limitToLast(limit) : ref(p), f = s => cb(s.val(), s.key); r.on("child_added", f); return () => r.off("child_added", f); },
      claim: (p, v) => ref(p).transaction(cur => (cur === null ? v : undefined)).then(r => r.committed),
      onDrop: (p, v) => { const d = ref(p).onDisconnect(); return v === null ? d.remove() : d.set(v); },
      cancelDrop: p => ref(p).onDisconnect().cancel(),
      connected: cb => db.ref(".info/connected").on("value", s => cb(!!s.val()))
    };
  }

  function mock(space) {
    const KEY = "ybmock:" + space, listeners = [], drops = [];
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } };
    const keys = p => p.split("/").filter(Boolean);
    const at = (tree, p) => { let o = tree; for (const k of keys(p)) { if (o == null || typeof o !== "object") return null; o = o[k]; } return o === undefined ? null : o; };
    const put = (tree, p, v) => {
      const ks = keys(p); let o = tree;
      ks.slice(0, -1).forEach(k => { if (typeof o[k] !== "object" || o[k] === null) o[k] = {}; o = o[k]; });
      if (v === null || v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
    };
    let pending = false;
    const fire = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        const tree = read();
        listeners.slice().forEach(l => {
          const v = at(tree, l.p);
          if (l.type === "value") { const j = JSON.stringify(v); if (j !== l.last) { l.last = j; l.cb(v); } }
          else if (v && typeof v === "object") Object.keys(v).sort().forEach(k => { if (!l.seen.has(k)) { l.seen.add(k); l.cb(v[k], k); } });
        });
      }, 0);
    };
    const write = fn => { const tree = read(); fn(tree); localStorage.setItem(KEY, JSON.stringify(tree)); fire(); };
    window.addEventListener("storage", e => { if (e.key === KEY) fire(); });
    window.addEventListener("pagehide", () => { if (drops.length) write(tree => drops.forEach(d => put(tree, d.p, d.v))); });
    let n = 0;
    const listen = (type, p, cb) => { const l = { type, p, cb, seen: new Set(), last: undefined }; listeners.push(l); fire(); return () => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); }; };
    let uid = null;
    try { uid = sessionStorage.getItem("ybmock-uid"); if (!uid) { uid = "u" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("ybmock-uid", uid); } } catch (e) { uid = "u" + Math.random().toString(36).slice(2, 10); }
    return Promise.resolve({
      uid,
      now: () => Date.now(),
      set: (p, v) => { write(t => put(t, p, v)); return Promise.resolve(); },
      update: (p, v) => { write(t => Object.keys(v).forEach(k => put(t, p + "/" + k, v[k]))); return Promise.resolve(); },
      remove: p => { write(t => put(t, p, null)); return Promise.resolve(); },
      push: (p, v) => { const k = Date.now().toString(36).padStart(9, "0") + (n++).toString(36).padStart(3, "0") + Math.random().toString(36).slice(2, 6); write(t => put(t, p + "/" + k, v)); return k; },
      get: p => Promise.resolve(at(read(), p)),
      watch: (p, cb) => listen("value", p, cb),
      added: (p, cb) => listen("added", p, cb),
      claim: (p, v) => { let ok = false; write(t => { if (at(t, p) === null) { put(t, p, v); ok = true; } }); return Promise.resolve(ok); },
      onDrop: (p, v) => { drops.push({ p, v }); return Promise.resolve(); },
      cancelDrop: p => { for (let i = drops.length - 1; i >= 0; i--) if (drops[i].p === p) drops.splice(i, 1); return Promise.resolve(); },
      connected: cb => cb(true)
    });
  }

  YB.net = { connect };
})(typeof window !== "undefined" ? window : globalThis);
