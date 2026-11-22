// Small animated chess board. Reads window.OPENING and builds the page into #app.
(function(){
  const GLYPH={k:'\u265A',q:'\u265B',r:'\u265C',b:'\u265D',n:'\u265E',p:'\u265F\uFE0E'};
  const FILES='abcdefgh';
  const sq=s=>[FILES.indexOf(s[0]),+s[1]-1];

  function startPieces(){
    const back='rnbqkbnr', list=[];
    for(let f=0;f<8;f++){
      list.push({t:back[f],c:'w',f,r:0},{t:'p',c:'w',f,r:1},{t:'p',c:'b',f,r:6},{t:back[f],c:'b',f,r:7});
    }
    return list.map((p,i)=>({...p,id:i,alive:true}));
  }
  const clone=ps=>ps.map(p=>({...p}));
  const at=(ps,f,r)=>ps.find(p=>p.alive&&p.f===f&&p.r===r);

  function applyMove(ps,uci){
    const [ff,fr]=sq(uci.slice(0,2)), [tf,tr]=sq(uci.slice(2,4));
    const p=at(ps,ff,fr); if(!p) return;
    const cap=at(ps,tf,tr);
    if(cap) cap.alive=false;
    else if(p.t==='p'&&ff!==tf){const ep=at(ps,tf,fr); if(ep) ep.alive=false;}
    p.f=tf; p.r=tr;
    if(p.t==='k'&&Math.abs(tf-ff)===2){
      const rook=at(ps,tf>ff?7:0,fr); if(rook) rook.f=tf>ff?5:3;
    }
    if(uci.length===5) p.t=uci[4];
  }
  function positions(moves){
    let ps=startPieces(); const out=[clone(ps)];
    moves.forEach(m=>{applyMove(ps,m[0]); out.push(clone(ps));});
    return out;
  }

  function build(app,O){
    app.innerHTML=`
    <div class="play">
      <div>
        <div class="boardWrap" id="board"><div class="squares" id="sqs"></div></div>
        <div class="ctrls">
          <button id="bStart" title="Start">⏮</button>
          <button id="bPrev" title="Back">◀</button>
          <button id="bPlay" class="main">▶ Play</button>
          <button id="bNext" title="Next">▶</button>
          <button id="bEnd" title="End">⏭</button>
          <select id="spd"><option value="2200">Slow</option><option value="1400" selected>Normal</option><option value="800">Fast</option></select>
          <button id="bFlip" title="Flip board">🔄 Flip</button>
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Choose a line</h3>
          <div class="lines" id="lines"></div>
          <div class="note" id="note"></div>
          <div class="moves" id="moves"></div>
        </div>
        <div class="card"><h3>Key ideas</h3><ul class="idea">${O.ideas.map(i=>'<li>'+i+'</li>').join('')}</ul></div>
      </div>
    </div>`;
    const sqs=app.querySelector('#sqs'), board=app.querySelector('#board');
    let flip=!!O.flip, line=0, ply=0, timer=null, pos=[], els=[];

    function drawSquares(){
      sqs.innerHTML='';
      for(let row=0;row<8;row++)for(let col=0;col<8;col++){
        const f=flip?7-col:col, r=flip?row:7-row;
        const d=document.createElement('div');
        d.className='sq '+((f+r)%2?'l':'d'); d.dataset.s=FILES[f]+(r+1);
        if(row===7) d.innerHTML+=`<span class="cf">${FILES[f]}</span>`;
        if(col===0) d.innerHTML+=`<span class="cr">${r+1}</span>`;
        sqs.appendChild(d);
      }
    }
    function makePieces(){
      els.forEach(e=>e.remove()); els=startPieces().map(p=>{
        const e=document.createElement('div'); e.className='pc '+p.c; board.appendChild(e); return e;});
    }
    function place(p,e){
      const col=flip?7-p.f:p.f, row=flip?p.r:7-p.r;
      e.style.left=(col*12.5)+'%'; e.style.top=(row*12.5)+'%';
      e.textContent=GLYPH[p.t]; e.classList.toggle('gone',!p.alive);
    }
    function render(){
      const L=O.lines[line], ps=pos[ply];
      ps.forEach(p=>place(p,els[p.id]));
      sqs.querySelectorAll('.sq').forEach(s=>s.classList.remove('hl','chk'));
      if(ply>0){
        const [u,san]=L.moves[ply-1];
        [u.slice(0,2),u.slice(2,4)].forEach(s=>sqs.querySelector(`[data-s="${s}"]`).classList.add('hl'));
        if(/[+#]/.test(san)){
          const side=ply%2?'b':'w', k=ps.find(p=>p.t==='k'&&p.c===side);
          sqs.querySelector(`[data-s="${FILES[k.f]+(k.r+1)}"]`).classList.add('chk');
        }
      }
      app.querySelectorAll('.moves .m').forEach((m,i)=>m.classList.toggle('cur',i===ply-1));
      const note=L.notes[ply]||(ply===0?L.idea:'');
      const mv=ply?`<b>${Math.ceil(ply/2)}${ply%2?'.':'...'} ${L.moves[ply-1][1]}</b> `:'';
      app.querySelector('#note').innerHTML=(mv+note)||'&nbsp;';
      if(ply===L.moves.length) app.querySelector('#note').innerHTML+=' <span class="bl">(end of line)</span>';
    }
    function setLine(i){
      stop(); line=i; ply=0; pos=positions(O.lines[i].moves);
      app.querySelectorAll('#lines button').forEach((b,j)=>b.classList.toggle('on',j===i));
      const mv=app.querySelector('#moves'); mv.innerHTML='';
      O.lines[i].moves.forEach((m,k)=>{
        if(k%2===0){const n=document.createElement('span');n.className='n';n.textContent=(k/2+1)+'.';mv.appendChild(n);}
        const s=document.createElement('span'); s.className='m'; s.textContent=m[1];
        s.onclick=()=>{stop();ply=k+1;render();}; mv.appendChild(s);
      });
      board.style.setProperty('--spd','0s'); render(); void board.offsetWidth; board.style.setProperty('--spd','.45s');
    }
    function go(n){ply=Math.max(0,Math.min(O.lines[line].moves.length,n));render();}
    function stop(){clearInterval(timer);timer=null;app.querySelector('#bPlay').textContent='▶ Play';}
    function play(){
      if(timer){stop();return;}
      if(ply>=O.lines[line].moves.length) go(0);
      app.querySelector('#bPlay').textContent='⏸ Pause';
      const ms=+app.querySelector('#spd').value;
      timer=setInterval(()=>{ if(ply>=O.lines[line].moves.length){stop();return;} go(ply+1); },ms);
    }

    const lb=app.querySelector('#lines');
    O.lines.forEach((L,i)=>{const b=document.createElement('button');b.textContent=L.name;b.onclick=()=>setLine(i);lb.appendChild(b);});
    app.querySelector('#bStart').onclick=()=>{stop();go(0);};
    app.querySelector('#bEnd').onclick=()=>{stop();go(1e9);};
    app.querySelector('#bPrev').onclick=()=>{stop();go(ply-1);};
    app.querySelector('#bNext').onclick=()=>{stop();go(ply+1);};
    app.querySelector('#bPlay').onclick=play;
    app.querySelector('#spd').onchange=()=>{if(timer){stop();play();}};
    app.querySelector('#bFlip').onclick=()=>{flip=!flip;drawSquares();render();};
    document.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'){stop();go(ply+1);} else if(e.key==='ArrowLeft'){stop();go(ply-1);}
      else if(e.key===' '){e.preventDefault();play();}
    });
    drawSquares(); makePieces(); setLine(0);
  }
  window.addEventListener('DOMContentLoaded',()=>{const a=document.getElementById('app'); if(a&&window.OPENING) build(a,window.OPENING);});
})();
