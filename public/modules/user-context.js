/**
 * @module user-context
 * Current-user context (persistable profile snapshot).
 *
 * Loaded as a classic script (global scope preserved for inline handlers);
 * load order is defined by index.html.
 * Exports on window: currentUser, showCtxMenu.
 */
(function(){
  // current user (persistable)
  try {
    window.currentUser = JSON.parse(localStorage.getItem("currentUser") || '{"id":"1","name":"You"}');
  } catch(e) {
    window.currentUser = { id: "1", name: "You" };
  }

  // Safe share helper
  async function sharePayload(payload){
    try{
      if(navigator.share){ await navigator.share(payload); }
      else {
        await navigator.clipboard.writeText(payload.url || (payload.text||""));
        toast?.("Link copied");
      }
    }catch(e){ console.warn(e); }
  }

  // Directions helper
  function openDirectionsFromEl(el){
    const lat = el.dataset.lat, lng = el.dataset.lng, q = el.dataset.address || el.dataset.title || el.textContent.trim();
    const url = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}` :
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    window.open(url, "_blank", "noopener");
  }

  // Attach long-press handlers with viewport-safe menus using showCtxMenu()
  function attachLongPress(selector, builder){
    document.querySelectorAll(selector).forEach(el=>{
      if(el.__lpBound) return; el.__lpBound = true;
      let t=null;
      el.addEventListener("pointerdown", (e)=>{
        if(e.button!==0) return;
        const x=e.clientX, y=e.clientY;
        t = setTimeout(()=>{
          const items = builder(el, e) || [];
          if(items.length>0 && typeof window.showCtxMenu==='function'){
            showCtxMenu(items, x, y);
          }
        }, 420);
      });
      ["pointerup","pointerleave","pointercancel"].forEach(ev=> el.addEventListener(ev, ()=> t && clearTimeout(t)));
    });
  }

  // 1) Generic cards -> Pin & Share menu
  attachLongPress(".card", (el)=>{
    // Skip if specialized card types handle their own menus
    if(el.classList.contains("bulletin-card") || el.closest(".bulletin-card")) return [];
    if(el.classList.contains("place-card") || el.closest(".place-card")) return [];
    const title = el.querySelector(".card-title")?.textContent?.trim() || "Card";
    return [
      { label: "Pin", icon:"fas fa-thumbtack", onClick: ()=>{
          el.dataset.pinned = "1";
          el.style.boxShadow = "0 8px 30px rgba(0,0,0,.15)";
          toast?.("Pinned");
      }},
      { label: "Share", icon:"fas fa-share-alt", onClick: ()=>{
          const url = location.href.split("#")[0];
          sharePayload({ title, url, text: title });
      }}
    ];
  });

  // 2) Place cards -> View details, Share, Get directions
  attachLongPress(".place-card, [data-lat][data-lng], .card[data-address]", (el, e)=>{
    const title = el.dataset.title || el.querySelector(".card-title")?.textContent?.trim() || "Place";
    return [
      { label: "View details", icon:"fas fa-eye", onClick: ()=>{
          el.querySelector("a,button,[role='button']")?.click();
      }},
      { label: "Share", icon:"fas fa-share-alt", onClick: ()=>{
          const url = el.dataset.url || location.href.split("#")[0];
          sharePayload({ title, url, text: title });
      }},
      { label: "Get directions", icon:"fas fa-location-arrow", onClick: ()=> openDirectionsFromEl(el) }
    ];
  });

  // 3) Bulletin posts -> Only author can Edit/Delete
  attachLongPress(".bulletin-card", (el)=>{
    const id = el.dataset.id;
    const owner = String(el.dataset.owner || "");
    const isOwner = !!window.currentUser && String(window.currentUser.id) === owner;
    const items = [
      { label: "Pin", icon:"fas fa-thumbtack", onClick: ()=>{ el.dataset.pinned="1"; el.style.outline="2px solid var(--primary-accent)"; toast?.("Pinned"); } },
      { label: "Share", icon:"fas fa-share-alt", onClick: ()=>{
          const url = location.href.split("#")[0] + `#post-${id}`;
          sharePayload({ title: el.querySelector("strong")?.textContent || "Post", url });
      } }
    ];
    if(isOwner){
      items.push(
        { label:"Edit", icon:"fas fa-pen", onClick: async ()=>{
            const bodyEl = el.querySelector("p") || el;
            const newText = prompt("Edit your post:", bodyEl.textContent||"");
            if(newText===null) return;
            bodyEl.textContent = newText;
            try{
              const posts = await DB_PRO.getAll("posts");
              const rec = posts.find(p=> p.id===id) || { id };
              rec.content = newText; rec.updatedAt = new Date().toISOString(); rec.authorId = owner;
              await DB_PRO.put("posts", rec); toast?.("Post updated");
            }catch(err){ console.warn(err); }
        }},
        { label:"Delete", icon:"fas fa-trash", className:"danger", onClick: async ()=>{
            if(!confirm("Delete this post?")) return;
            el.remove();
            try{ await DB_PRO.del("posts", id); toast?.("Deleted"); }catch(err){ console.warn(err); }
        }}
      );
    } else {
      items.push({ label:"Report", icon:"fas fa-flag", onClick: ()=> toast?.("Thanks, we'll review this.") });
    }
    return items;
  });

  // 4) Tasks -> Ensure viewport-safe menu (Edit/Delete already implemented elsewhere)
  attachLongPress(".task-list .task-item, li.task", (el)=>{
    const text = el.querySelector(".task-text")?.textContent?.trim() || el.textContent.trim();
    return [
      { label:"Edit", icon:"fas fa-pen", onClick: ()=>{
          const newText = prompt("Edit task:", text);
          if(newText && el.querySelector(".task-text")) el.querySelector(".task-text").textContent = newText;
      }},
      { label:"Delete", icon:"fas fa-trash", className:"danger", onClick: ()=> el.remove() }
    ];
  });

  // 5) "Your Goals" should only show when there are goals
  function applyGoalsVisibility(){
    const holder = document.querySelector("#planner #goalsHolder");
    const list = holder?.querySelector("#goalsList");
    const toggle = ()=>{
      if(!holder) return;
      const hasItems = list && list.children.length > 0;
      holder.style.display = hasItems ? "" : "none";
    };
    if(holder && list){
      const mo = new MutationObserver(toggle);
      mo.observe(list, { childList:true });
      toggle();
    }
  }
  document.addEventListener("DOMContentLoaded", applyGoalsVisibility);
  // Also run after a bit for late renders
  setTimeout(applyGoalsVisibility, 1200);
})();
