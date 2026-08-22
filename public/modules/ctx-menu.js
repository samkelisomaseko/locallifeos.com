/**
 * @module ctx-menu
 * Viewport-safe context menu builder, bulletin long-press wiring, CSV export helper.
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: exportCSV, openConfirmationModal, showCtxMenu.
 */
// Robust context menu builder (ensures menu stays inside viewport)
window.showCtxMenu = function(items, clientX = window.innerWidth/2, clientY = window.innerHeight/2){
  // remove existing
  const existing = document.querySelector('.context-menu.injected');
  if(existing) existing.remove();
  const menu = document.createElement('div');
  menu.className = 'context-menu injected';
  menu.setAttribute('role','menu');
  items.forEach(it=>{
    const btn = document.createElement('button');
    btn.className = 'context-menu-item';
    if(it.className) btn.classList.add(it.className);
    btn.innerHTML = `<i class="${it.icon||'fas fa-circle'}"></i><span>${it.label}</span>`;
    btn.onclick = ()=>{
      try{ (it.onClick && it.onClick()); } catch(e){ console.error(e); }
      menu.remove();
    };
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  // initial placement
  const pad = 8;
  let left = clientX; let top = clientY;
  menu.style.opacity = '0'; menu.style.transform = 'translateY(-6px) scale(0.98)';
  requestAnimationFrame(()=>{
    // measure
    const rect = menu.getBoundingClientRect();
    if(left + rect.width + pad > window.innerWidth) left = window.innerWidth - rect.width - pad;
    if(top + rect.height + pad > window.innerHeight) top = window.innerHeight - rect.height - pad;
    if(left < pad) left = pad;
    if(top < pad) top = pad;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.classList.add('show');
    menu.style.opacity = '1'; menu.style.transform = 'translateY(0) scale(1)';
  });
  // close on outside click / escape
  const closer = (e)=>{ if(!menu.contains(e.target)) { menu.remove(); document.removeEventListener('pointerdown', closer); document.removeEventListener('keydown', onKey); } };
  const onKey = (ev)=>{ if(ev.key==='Escape') { menu.remove(); document.removeEventListener('pointerdown', closer); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('pointerdown', closer);
  document.addEventListener('keydown', onKey);
  return menu;
};

// Wire long-press for bulletin posts to show edit/delete and ensure edit/delete work with DB_PRO if available
(function wireBulletinLongPress(){
  const container = document.querySelector('#placesList, .bulletin-list, #bulletinList, .bulletin-posts') || document.body;
  if(container.querySelectorAll) container.querySelectorAll('.bulletin-post-card, .card.bulletin-post-card, article.bulletin-post-card').forEach(card=>{
    let t=null;
    card.addEventListener('pointerdown', (e)=>{
      t = setTimeout(()=>{
        const id = card.dataset.id || card.getAttribute('data-id') || card.getAttribute('data-post-id') || card.querySelector('[data-id]')?.getAttribute('data-id') || null;
        showCtxMenu([
          { label:'Edit post', icon:'fas fa-pen', onClick: ()=> {
              // open existing edit modal if present
              const edit = document.getElementById('editPostModal') || document.getElementById('editPostSheet');
              if(edit && window.openEditPostModal){
                openEditPostModal(id);
                return;
              }
              // fallback: prompt inline edit
              const bodyEl = card.querySelector('.bulletin-post-body') || card.querySelector('p') || card;
              const newText = prompt('Edit post text:', bodyEl.textContent||'');
              if(newText!==null){
                bodyEl.textContent = newText;
                // persist if DB_PRO available
                if(window.DB_PRO && typeof window.DB_PRO.put==='function'){
                  (async ()=>{
                    try{
                      const posts = await DB_PRO.getAll('posts');
                      const p = posts.find(x=>x.id===id) || { id: id || crypto.randomUUID(), content: newText, updatedAt: new Date().toISOString() };
                      p.content = newText; p.updatedAt = new Date().toISOString();
                      await DB_PRO.put('posts', p);
                      if(window.toast) toast('Post updated.');
                    }catch(e){ console.error(e); }
                  })();
                }
              }
            } },
          { label:'Delete post', icon:'fas fa-trash', className:'danger', onClick: ()=> {
              if(!confirm('Delete this post?')) return;
              card.remove();
              if(window.DB_PRO && typeof window.DB_PRO.del==='function'){
                (async ()=>{ try{ const pid = card.dataset.id || card.getAttribute('data-id') || null; if(pid) await DB_PRO.del('posts', pid); if(window.toast) toast('Post deleted.'); }catch(e){console.error(e);} })();
              }
            } }
        ], e.clientX, e.clientY);
      }, 450);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(ev=> card.addEventListener(ev, ()=> clearTimeout(t)));
  });
})();

// Ensure toggle switches align right and look native
(function styleToggles(){
  const style = document.createElement('style');
  style.textContent = `
  .toggle-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .toggle-row .toggle-switch-button { margin-left:auto; }
  .toggle-switch-button { display:inline-flex; align-items:center; justify-content:center; padding:6px; border-radius:999px; border:1px solid rgba(0,0,0,0.06); background:var(--card-bg); }
  .toggle-switch { width:36px; height:20px; background:linear-gradient(180deg,#eee,#ddd); border-radius:999px; position:relative; display:inline-block; transition:all .18s ease; }
  .toggle-switch.active { background:linear-gradient(180deg,var(--primary-accent),var(--primary-accent-darker)); }
  .toggle-switch::after { content:''; position:absolute; left:3px; top:3px; width:14px; height:14px; border-radius:50%; background:white; transition:transform .18s ease; }
  .toggle-switch.active::after { transform: translateX(16px); }
  `;
  document.head.appendChild(style);
})();

// Export CSV helper (uses DB_PRO)
window.exportCSV = async function(){
  if(!window.DB_PRO || typeof DB_PRO.getAll!=='function') {
    alert('Export CSV requires local DB support in the app.');
    return;
  }
  const stores = ['nutritionLogs','focusSessions','meditations','goals','posts','claims'];
  const all = {};
  for(const s of stores){ try{ all[s] = await DB_PRO.getAll(s); }catch(e){ all[s]=[]; } }
  // simple CSV for nutritionLogs as example
  const rows = [['id','name','qty','unit','kcal','protein','carbs','fat','at']];
  (all['nutritionLogs']||[]).forEach(r=> rows.push([r.id, (r.name||'').replace(/,/g,' '), r.qty, r.unit, r.kcal, r.protein, r.carbs, r.fat, r.at]));
  const csv = rows.map(r=> r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'LocalLife_nutrition_logs.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  if(window.toast) toast('CSV exported.');
};

// Wire exportCSV button if present
document.addEventListener('click', function(e){
  if(e.target && (e.target.id==='exportCSV' || e.target.closest('#exportCSV'))) {
    e.preventDefault(); exportCSV();
  }
});

// Small UX: gentle confirmation for critical actions (clearAllData)
window.openConfirmationModal = window.openConfirmationModal || function(title, html, onConfirm){
  if(!confirm(title + '\n\n' + (html.replace(/<[^>]+>/g,'')||''))) return;
  onConfirm && onConfirm();
};
