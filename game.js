(() => {
  "use strict";
  const W=420,H=700,DANGER=116,R=[18,22,27,33,40,49,59,70,83,98,116];
  const C=["#45d7ff","#77e6cb","#a9ef78","#ffe06b","#ffb45f","#ff8d72","#ff70a8","#d786ff","#9f8cff","#6ea5ff","#ffd34e"];
  const T=[
    ["characters/09.png",.5,.5,1,"认真脸"],["characters/04.png",.5,.5,1,"回眸笑"],["characters/05.png",.5,.5,1,"包饺子"],
    ["characters/02.png",.5,.5,1,"骰子王"],["characters/06.png",.5,.5,1,"台上范"],["characters/03.png",.5,.5,1,"骑车侠"],
    ["characters/11.png",.5,.5,1,"困困版"],["characters/10.png",.5,.5,1,"宿舍版"],["characters/08.png",.5,.5,1,"麦霸版"],
    ["characters/01.png",.5,.5,1,"大碗王"],["characters/07.png",.5,.5,1,"终极教官"]
  ];
  const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const canvas=$("#game"),ctx=canvas.getContext("2d"),imgs=T.map(t=>Object.assign(new Image(),{src:`./${t[0]}`}));
  let balls=[],id=1,aim=W/2,next=0,score=0,best=+(localStorage.getItem("friend-merge-best")||0);
  let cooldown=0,over=false,muted=localStorage.getItem("friend-merge-muted")==="1",last=0,pointerDown=false;
  const ball=(tier,x,y)=>({id:id++,tier,x,y,vx:0,vy:0,r:R[tier],age:0,over:0,squash:0,dead:false});
  function ping(pitch=440,d=.06){
    if(muted)return;
    try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A(),o=a.createOscillator(),g=a.createGain();o.frequency.value=pitch;g.gain.setValueAtTime(.055,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+d)}catch{}
  }
  function updateUI(){
    $("#score").textContent=score;$("#best").textContent=Math.max(best,score);$("#nextLabel").textContent=T[next][4];
    $("#nextImage").src=`./${T[next][0]}`;$("#nextImage").alt=T[next][4];$("#nextImage").style.objectPosition=`${T[next][1]*100}% ${T[next][2]*100}%`;
    $("#nextAvatar").style.borderColor=C[next];$("#mute").textContent=muted?"🔇 音效关":"🔊 音效开";
  }
  function reset(){balls=[];score=0;aim=W/2;next=Math.floor(Math.random()*5);cooldown=0;over=false;$("#gameOver").classList.add("hidden");updateUI()}
  function drop(){
    if(over||performance.now()<cooldown)return;
    const b=ball(next,clamp(aim,R[next]+4,W-R[next]-4),66);b.vy=30;balls.push(b);cooldown=performance.now()+340;
    next=Math.floor(Math.random()*5);ping(260+b.tier*35,.05);updateUI();
  }
  function finish(){
    if(over)return;over=true;best=Math.max(best,score);localStorage.setItem("friend-merge-best",best);
    const name=cleanName($("#playerName").value), rows=readRanks();if(score>0)rows.push({name,score,at:Date.now()});
    rows.sort((a,b)=>b.score-a.score||b.at-a.at);localStorage.setItem("friend-merge-ranks",JSON.stringify(rows.slice(0,20)));
    $("#finalScore").textContent=score;$("#finalBest").textContent=best;$("#gameOver").classList.remove("hidden");ping(120,.35);updateUI();
  }
  function drawAvatar(b){
    const im=imgs[b.tier],s=clamp(b.squash||0,0,.34),maxW=b.r*2.34*(1+s*.62),maxH=b.r*2.62*(1-s*.48);
    ctx.save();ctx.translate(b.x,b.y+b.r*.05);ctx.shadowColor="rgba(0,0,0,.38)";ctx.shadowBlur=Math.max(4,b.r*.18);ctx.shadowOffsetY=Math.max(2,b.r*.07);
    if(im.complete&&im.naturalWidth){const scale=Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight),dw=im.naturalWidth*scale,dh=im.naturalHeight*scale;ctx.drawImage(im,-dw/2,-dh/2,dw,dh)}
    else{ctx.fillStyle=C[b.tier];ctx.beginPath();ctx.roundRect(-b.r*.7,-b.r,b.r*1.4,b.r*2,b.r*.35);ctx.fill()}
    ctx.restore();
  }
  function physics(dt){
    let gained=0;
    for(let step=0;step<3;step++){
      const d=dt/3;
      for(const b of balls){if(b.dead)continue;b.age+=d;b.vy+=1500*d;b.x+=b.vx*d;b.y+=b.vy*d;b.vx*=.999;b.squash*=.86;
        if(b.x-b.r<0){b.x=b.r;b.squash=Math.max(b.squash,Math.min(.24,Math.abs(b.vx)/650));b.vx=Math.abs(b.vx)*.48}
        if(b.x+b.r>W){b.x=W-b.r;b.squash=Math.max(b.squash,Math.min(.24,Math.abs(b.vx)/650));b.vx=-Math.abs(b.vx)*.48}
        if(b.y+b.r>H){b.y=H-b.r;b.squash=Math.max(b.squash,Math.min(.32,Math.abs(b.vy)/760));b.vy=-Math.abs(b.vy)*.42;b.vx*=.955}}
      for(let iter=0;iter<3;iter++)for(let i=0;i<balls.length;i++){const a=balls[i];if(a.dead)continue;for(let j=i+1;j<balls.length;j++){const b=balls[j];if(b.dead)continue;
        const dx=b.x-a.x,dy=b.y-a.y,md=a.r+b.r,d2=dx*dx+dy*dy;if(d2>=md*md||d2===0)continue;const dist=Math.sqrt(d2),nx=dx/dist,ny=dy/dist;
        if(iter===0&&a.tier===b.tier){a.dead=b.dead=true;if(a.tier<T.length-1){const m=ball(a.tier+1,(a.x+b.x)/2,(a.y+b.y)/2);m.vx=(a.vx+b.vx)*.25;m.vy=Math.min(-155,(a.vy+b.vy)*.15-105);m.squash=.32;balls.push(m);gained+=(a.tier+1)*(a.tier+2)/2;ping(420+a.tier*55,.09);if(navigator.vibrate&&!muted)navigator.vibrate(18+a.tier*3)}else{gained+=100;ping(980,.18)}continue}
        const overlap=md-dist,total=a.r*a.r+b.r*b.r,ma=b.r*b.r/total,mb=a.r*a.r/total;a.x-=nx*overlap*ma;a.y-=ny*overlap*ma;b.x+=nx*overlap*mb;b.y+=ny*overlap*mb;
        const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){const imp=-rel*.72,compression=Math.min(.25,-rel/780);a.vx-=nx*imp*ma;a.vy-=ny*imp*ma;b.vx+=nx*imp*mb;b.vy+=ny*imp*mb;a.squash=Math.max(a.squash,compression);b.squash=Math.max(b.squash,compression)}
      }}
      if(balls.some(b=>b.dead))balls=balls.filter(b=>!b.dead);
    }
    if(gained){score+=gained;updateUI()}
    for(const b of balls){const speed=Math.hypot(b.vx,b.vy);if(b.age>.8&&b.y-b.r<DANGER&&speed<135)b.over+=dt;else b.over=Math.max(0,b.over-dt*2);if(b.over>1.45)finish()}
  }
  function frame(now){
    const dt=Math.min(last?(now-last)/1000:1/60,.025);last=now;if(!over)physics(dt);
    const dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==W*dpr||canvas.height!==H*dpr){canvas.width=W*dpr;canvas.height=H*dpr}ctx.setTransform(dpr,0,0,dpr,0,0);
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#111b42");bg.addColorStop(.55,"#142457");bg.addColorStop(1,"#0a102a");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.fillStyle="rgba(255,255,255,.025)";for(let y=0;y<H;y+=28)for(let x=(y/28)%2?14:0;x<W;x+=28){ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fill()}
    ctx.setLineDash([7,7]);ctx.strokeStyle="rgba(255,117,144,.76)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,DANGER);ctx.lineTo(W,DANGER);ctx.stroke();
    ctx.setLineDash([5,6]);ctx.strokeStyle="rgba(126,224,255,.42)";ctx.beginPath();ctx.moveTo(aim,25);ctx.lineTo(aim,92);ctx.stroke();ctx.setLineDash([]);
    balls.forEach(drawAvatar);ctx.globalAlpha=performance.now()<cooldown?.34:.83;const g=ball(next,clamp(aim,R[next],W-R[next]),66);id--;g.r=R[next]*.86;drawAvatar(g);ctx.globalAlpha=1;requestAnimationFrame(frame);
  }
  function point(clientX){const r=canvas.getBoundingClientRect();aim=clamp((clientX-r.left)/r.width*W,18,W-18)}
  function cleanName(v){return(v||"默认用户").replace(/[\u0000-\u001f]/g,"").slice(0,12)||"默认用户"}
  function readRanks(){try{return JSON.parse(localStorage.getItem("friend-merge-ranks")||"[]")}catch{return[]}}
  function renderRanks(){const rows=readRanks();$("#rankList").innerHTML=rows.length?rows.map((r,i)=>`<div class="rank-row"><span>${i+1}</span><span></span><strong></strong></div>`).join(""):'<div class="empty">还没有成绩，等你来上榜。</div>';rows.forEach((r,i)=>{const row=$("#rankList").children[i];row.children[1].textContent=r.name;row.children[2].textContent=r.score})}
  canvas.addEventListener("pointermove",e=>point(e.clientX));canvas.addEventListener("pointerdown",e=>{pointerDown=true;point(e.clientX);canvas.setPointerCapture(e.pointerId);if(e.pointerType==="mouse")drop()});canvas.addEventListener("pointerup",e=>{point(e.clientX);if(pointerDown&&e.pointerType!=="mouse")drop();pointerDown=false});
  addEventListener("keydown",e=>{if(e.target.tagName==="INPUT")return;if(e.key==="ArrowLeft")aim=clamp(aim-12,20,W-20);if(e.key==="ArrowRight")aim=clamp(aim+12,20,W-20);if((e.key===" "||e.key==="Enter")&&!over){e.preventDefault();drop()}if(e.key.toLowerCase()==="r")reset()});
  $("#restart").onclick=$("#again").onclick=reset;$("#mute").onclick=()=>{muted=!muted;localStorage.setItem("friend-merge-muted",muted?"1":"0");updateUI()};
  const dialog=$("#rankDialog");$$("[data-open-rank]").forEach(b=>b.onclick=()=>{renderRanks();dialog.showModal()});$("#closeRank").onclick=()=>dialog.close();
  $("#playerName").value=localStorage.getItem("friend-merge-name")||"默认用户";$("#playerName").oninput=e=>{const n=cleanName(e.target.value);localStorage.setItem("friend-merge-name",n)};
  $("#chain").innerHTML=T.map((t,i)=>`<div class="chain-avatar" title="${i+1}级 · ${t[4]}" style="border-color:${C[i]}"><img src="./${t[0]}" alt="" style="object-position:${t[1]*100}% ${t[2]*100}%"></div>`).join("");
  reset();requestAnimationFrame(frame);
})();
