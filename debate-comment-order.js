(function(){
  const debounce=new WeakMap();

  function reorderList(list){
    const children=[...list.children];
    if(!children.length||children.some(el=>el.classList.contains('ft-comments-loading')||el.classList.contains('ft-empty-comments')))return;

    const groups=[];
    let current=null;
    children.forEach(el=>{
      if(el.classList.contains('ft-comment')&&!el.classList.contains('reply')){
        current={root:el,replies:[]};
        groups.push(current);
      }else if(el.classList.contains('ft-comment')&&el.classList.contains('reply')&&current){
        current.replies.push(el);
      }
    });
    if(groups.length<2)return;

    const timeOf=el=>{
      const text=el.querySelector('.ft-comment-time')?.textContent?.trim()||'';
      if(text==='just now')return Date.now();
      const m=text.match(/^(\d+)([mhd]) ago$/);
      if(m){
        const n=Number(m[1]);
        const factor=m[2]==='m'?60000:m[2]==='h'?3600000:86400000;
        return Date.now()-(n*factor);
      }
      const id=el.dataset.commentId||'';
      const prefix=id.split('-')[0];
      const parsed=parseInt(prefix,36);
      return Number.isFinite(parsed)?parsed:0;
    };

    groups.sort((a,b)=>timeOf(b.root)-timeOf(a.root));
    groups.forEach(group=>{
      list.appendChild(group.root);
      group.replies.forEach(reply=>list.appendChild(reply));
    });
  }

  function scan(){
    document.querySelectorAll('.ft-comment-list').forEach(list=>{
      reorderList(list);
      if(list.dataset.newestFirst==='1')return;
      list.dataset.newestFirst='1';
      new MutationObserver(()=>{
        clearTimeout(debounce.get(list));
        const timer=setTimeout(()=>reorderList(list),20);
        debounce.set(list,timer);
      }).observe(list,{childList:true});
    });
  }

  scan();
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
})();
