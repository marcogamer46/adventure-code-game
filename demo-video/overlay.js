// overlay.js — returns a JS string injected into every recorded page via
// page.addInitScript. It adds a recording-only UI (visible cursor, click
// ripples, keyboard chips) plus a small "window.__MV" helper object that the
// scene driver uses to read game state and navigate. index.html is untouched.
// NOTE: the returned script must contain NO backtick characters (this file is
// assembled without template literals for that reason).
'use strict';

module.exports = function buildInitScript() {
  var lines = [];
  lines.push('(function(){');
  lines.push('  if (window.__OV) return;');
  lines.push('  function boot(){');
  lines.push('    window.__OV = true;');
  lines.push('  var css = [');
  lines.push('    "*{ cursor:none !important; }",');
  lines.push('    "#ov-cursor{position:fixed; left:0; top:0; z-index:2147483001; width:26px; height:26px; pointer-events:none; transform:translate(-50%,-50%); display:none;}",');
  lines.push('    "#ov-cursor::before{content:\\"\\"; position:absolute; inset:0; border-radius:50%; border:2px solid #fff; box-shadow:0 0 0 1px rgba(0,0,0,.6);}",');
  lines.push('    "#ov-cursor::after{content:\\"\\"; position:absolute; left:7px; top:7px; width:9px; height:9px; border-radius:50%; background:rgba(0,0,0,.3);}",');
  lines.push('    ".ov-rip{position:fixed; z-index:2147483000; pointer-events:none; border-radius:50%; border:2px solid rgba(255,222,130,.95); transform:translate(-50%,-50%); animation:ovRip .45s ease-out forwards;}",');
  lines.push('    "@keyframes ovRip{from{width:10px; height:10px; opacity:.95} to{width:56px; height:56px; opacity:0}}",');
  lines.push('    "#ov-key{position:fixed; left:14px; bottom:96px; z-index:2147483002; pointer-events:none; font:600 20px/1 ui-sans-serif,system-ui,sans-serif; color:#fff; background:rgba(10,14,20,.85); border:1px solid rgba(255,255,255,.28); padding:8px 14px; border-radius:12px; opacity:0; transition:opacity .12s; letter-spacing:.5px}"');
  lines.push('  ].join("\\n");');
  lines.push('  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);');
  lines.push('  var cur = document.createElement("div"); cur.id = "ov-cursor"; document.body.appendChild(cur);');
  lines.push('  var key = document.createElement("div"); key.id = "ov-key"; document.body.appendChild(key);');
  lines.push('  var KEY_LABEL = { ArrowUp:"↑", ArrowDown:"↓", ArrowLeft:"←", ArrowRight:"→", " ":"Space", Enter:"Enter", Escape:"Esc", c:"C", e:"E", x:"X", C:"C", E:"E", X:"X" };');
  lines.push('  window.addEventListener("pointermove", function(e){ cur.style.display = "block"; cur.style.left = e.clientX + "px"; cur.style.top = e.clientY + "px"; }, { passive:true });');
  lines.push('  window.addEventListener("pointerdown", function(e){ var r = document.createElement("div"); r.className = "ov-rip"; r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px"; document.body.appendChild(r); setTimeout(function(){ r.remove(); }, 520); }, { passive:true });');
  lines.push('  document.addEventListener("keydown", function(e){ var lbl = KEY_LABEL[e.key] || e.key.toUpperCase(); if (!lbl) return; key.textContent = lbl.length > 4 ? e.key : lbl; key.style.opacity = "1"; clearTimeout(key._t); key._t = setTimeout(function(){ key.style.opacity = "0"; }, 760); });');
  lines.push('  var MV = window.__MV = {');
  lines.push('    focus(){ document.body.focus(); },');
  lines.push('    tr(r, c){ try { return isTraversable(world, r, c); } catch (e) { return false; } },');
  lines.push('    neighbors(r, c){ return [["ArrowUp", r-1, c], ["ArrowDown", r+1, c], ["ArrowLeft", r, c-1], ["ArrowRight", r, c+1]]; },');
  lines.push('    valid(r, c){ if (r<0 || r>=world.rows || c<0 || c>=world.cols) return false; if (!isTraversable(world, r, c)) return false; var k = r*world.cols + c; var en = world.enemyByKey[k]; if (en && !state.defeated.has(en.id)) return false; return true; },');
  lines.push('    openDir(){ var ns=MV.neighbors(state.r,state.c); for (var i=0;i<ns.length;i++){ var d=ns[i]; if (MV.valid(d[1],d[2])) return d[0]; } return null; },');
  lines.push('    wallDir(){ var ns=this.neighbors(state.r,state.c); for (var i=0;i<ns.length;i++){ var d=ns[i]; if (d[1]<0 || d[1]>=world.rows || d[2]<0 || d[2]>=world.cols) return d[0]; if (!isTraversable(world,d[1],d[2])) return d[0]; } return null; },');
  lines.push('    pathTo(targetFn){');
  lines.push('      var sr=state.r, sc=state.c;');
  lines.push('      var key=function(r,c){ return r*world.cols+c; };');
  lines.push('      if (targetFn(sr,sc)) return [];');
  lines.push('      if (!MV.valid(sr,sc)) return null;');
  lines.push('      var seen=new Set([key(sr,sc)]), prev=new Map(), q=[[sr,sc]];');
  lines.push('      while (q.length){');
  lines.push('        var cur=q.shift();');
  lines.push('        var ns=MV.neighbors(cur[0],cur[1]);');
  lines.push('        for (var i=0;i<ns.length;i++){');
  lines.push('          var d=ns[i];');
  lines.push('          if (!MV.valid(d[1],d[2])) continue;');
  lines.push('          var k=key(d[1],d[2]);');
  lines.push('          if (seen.has(k)) continue;');
  lines.push('          seen.add(k); prev.set(k,[d[0],cur[0],cur[1]]);');
  lines.push('          if (targetFn(d[1],d[2])){');
  lines.push('            var path=[], at=[d[1],d[2]];');
  lines.push('            while (prev.has(key(at[0],at[1]))){ var e=prev.get(key(at[0],at[1])); path.push(e[0]); at=[e[1],e[2]]; }');
  lines.push('            return path.reverse();');
  lines.push('          }');
  lines.push('          q.push([d[1],d[2]]);');
  lines.push('        }');
  lines.push('      }');
  lines.push('      return null;');
  lines.push('    },');
  lines.push('    pathToCollect(){ return this.pathTo(function(r,c){ var k=r*world.cols+c; var a=world.artifactByKey[k]; return a && !state.collected.has(a.id); }); },');
  lines.push('    pathToAmbush(){ return this.pathTo(function(r,c){ var ns=MV.neighbors(r,c); for (var i=0;i<ns.length;i++){ var k=ns[i][1]*world.cols+ns[i][2]; var en=world.enemyByKey[k]; if (en && !state.defeated.has(en.id)) return true; } return false; }); },');
  lines.push('    adjacentFoe(){ var ns=MV.neighbors(state.r,state.c); for (var i=0;i<ns.length;i++){ var k=ns[i][1]*world.cols+ns[i][2]; var en=world.enemyByKey[k]; if (en && !state.defeated.has(en.id)) return true; } return false; },');
  lines.push('    foes(){ return Object.values(world.enemyByKey).filter(function(e){ return !state.defeated.has(e.id); }).length; },');
  lines.push('    dirToPad(dir){ return { ArrowUp:"MOVE_NORTH", ArrowDown:"MOVE_SOUTH", ArrowLeft:"MOVE_WEST", ArrowRight:"MOVE_EAST" }[dir]; }');
  lines.push('  };');
  lines.push('  }');
  lines.push('  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);');
  lines.push('})();');
  return lines.join('\n');
};
