'use strict';
// Bombas no escritório: mini pessoas montadas em formigas ou aranhas. Precisa de escritorio.js antes.
const GW=15,GH=13,CS=.45,GX0=10.0,GZ0=-2.95,GN=GW*GH;
const cx=i=>GX0+(i+.5)*CS,cz=j=>GZ0+(j+.5)*CS,ci=x=>Math.floor((x-GX0)/CS),cj=z=>Math.floor((z-GZ0)/CS),idx=(i,j)=>i+j*GW;
const inG=(i,j)=>i>=0&&j>=0&&i<GW&&j<GH;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const SPAWN=[[1,1],[13,11],[13,1],[1,11],[7,1],[7,11],[1,6],[13,6]];
const BCOL=[0xffc928,0xe8384f,0x22b37a,0x6a55f0,0xff8a1f,0x1fa3e8,0xf05ac8,0x8bd13a];
const ITEMS={bomb:{ic:'💣',nm:'Mais uma bomba'},fire:{ic:'🔥',nm:'Explosão maior'},speed:{ic:'⚡',nm:'Mais rápido'},grow:{ic:'🍄',nm:'Cresceste!'}};
const DUR=180,FUSE=2.6,FLAME=.55;
let G=new Uint8Array(GN),HID=[],ITEM=[],FL=new Float32Array(GN),softObj=[],itemObj=[],bombs=[],ppl=[],me=null,playing=false,T0=-9,gT=0,ended=false,bseq=0,camMode=0,paused=false;
let srng=1;const srnd=()=>{srng=(srng*16807)%2147483647;return srng/2147483647;};

// ---------- arena ----------
const arena=new THREE.Group();scene.add(arena);
{const g=ctex(512,448,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='rgba(30,34,40,.55)';g.fillRect(0,0,w,h);g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=2;
  for(let i=0;i<=GW;i++){g.beginPath();g.moveTo(i*w/GW,0);g.lineTo(i*w/GW,h);g.stroke();}for(let j=0;j<=GH;j++){g.beginPath();g.moveTo(0,j*h/GH);g.lineTo(w,j*h/GH);g.stroke();}});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(GW*CS,GH*CS),new THREE.MeshStandardMaterial({map:g,transparent:true,roughness:.9}));m.rotation.x=-Math.PI/2;m.position.set(GX0+GW*CS/2,.004,GZ0+GH*CS/2);m.receiveShadow=true;arena.add(m);}
// pilhas de livros e dossiês (fixos)
const BOOKC=[0x1f4e8c,0xb3332f,0x2d7d46,0xd9a521,0x5b3a86,0x2b2b2b,0xe8e2d0,0x16708a];
{const hard=[];for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const edge=i===0||j===0||i===GW-1||j===GH-1;if(edge||(i%2===0&&j%2===0))hard.push([i,j,edge]);}
  const n=hard.length*3,im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),M(0xffffff,.7),n);let k=0;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(const [i,j,edge] of hard){let y=0;for(let s=0;s<3;s++){const h=edge?.07+r()*.03:.09+r()*.05,w=CS*(.86-r()*.12),d=CS*(.8-r()*.15);tmpM.compose(V(cx(i)+(r()-.5)*.03,y+h/2,cz(j)+(r()-.5)*.03),tmpQ.setFromAxisAngle(UP,(r()-.5)*.25),V(w,h,d));im.setMatrixAt(k,tmpM);im.setColorAt(k,lin(BOOKC[(r()*8)|0]));k++;y+=h;}}
  im.castShadow=im.receiveShadow=true;arena.add(im);}
const boxT=ctex(128,128,(g,w,h)=>{g.fillStyle='#b98a52';g.fillRect(0,0,w,h);for(let i=0;i<500;i++){g.fillStyle=`rgba(90,60,30,${Math.random()*.15})`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}g.fillStyle='rgba(220,200,160,.75)';g.fillRect(w/2-10,0,20,h);g.strokeStyle='rgba(60,40,20,.35)';g.strokeRect(2,2,w-4,h-4);});
const softGeo=new THREE.BoxGeometry(CS*.84,CS*.66,CS*.84),softMat=M(0xffffff,.85,0,{map:boxT}),paperGeo=new THREE.BoxGeometry(CS*.7,CS*.42,CS*.55),paperMat=M(0xf4f3ee,.9);
// ícones dos objetos
const iconTex={};for(const k in ITEMS)iconTex[k]=ctex(128,128,(g,w,h)=>{g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.arc(64,64,58,0,7);g.fill();g.strokeStyle='#ffd23f';g.lineWidth=6;g.stroke();g.font='72px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(ITEMS[k].ic,64,70);});
// fogo
const fireT=ctex(64,64,(g,w,h)=>{const gr=g.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(255,255,220,1)');gr.addColorStop(.35,'rgba(255,190,60,.95)');gr.addColorStop(.7,'rgba(255,90,20,.6)');gr.addColorStop(1,'rgba(255,40,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);});
const fireMat=new THREE.SpriteMaterial({map:fireT,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
const flameSpr=[];for(let k=0;k<GN;k++){const s=new THREE.Sprite(fireMat);s.visible=false;s.position.set(cx(k%GW),.14,cz(Math.floor(k/GW)));arena.add(s);flameSpr.push(s);}
const bombGeo=new THREE.SphereGeometry(.13,18,14),bombMat=M(0x17171a,.25,.4),fuseMat=M(0xc9b48a,.8),sparkMat=new THREE.SpriteMaterial({map:fireT,blending:THREE.AdditiveBlending,depthWrite:false,color:0xffe08a});
const puffs=[];function puff(x,y,z,n,col){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.035),new THREE.MeshBasicMaterial({color:col||0xd8c09a,transparent:true}));m.position.set(x,y,z);scene.add(m);puffs.push({m,v:V(Math.random()-.5,Math.random()*.9,Math.random()-.5).multiplyScalar(2.2),t:.8});}}

function buildMap(sd){srng=sd>>>0||1;softObj.forEach(o=>o&&arena.remove(o));itemObj.forEach(o=>o&&arena.remove(o));G.fill(0);FL.fill(0);HID=[];ITEM=[];softObj=[];itemObj=[];
  for(let j=0;j<GH;j++)for(let i=0;i<GW;i++)if(i===0||j===0||i===GW-1||j===GH-1||(i%2===0&&j%2===0))G[idx(i,j)]=1;
  const keep=new Set();for(const [i,j] of SPAWN)for(const [dx,dz] of[[0,0],...DIRS])keep.add(idx(i+dx,j+dz));
  for(let k=0;k<GN;k++){if(G[k]||keep.has(k)||srnd()>.72)continue;G[k]=2;const i=k%GW,j=Math.floor(k/GW);const paper=srnd()<.35,m=new THREE.Mesh(paper?paperGeo:softGeo,paper?paperMat:softMat);
    m.position.set(cx(i),(paper?CS*.21:CS*.33),cz(j));m.rotation.y=(srnd()-.5)*.3;m.castShadow=m.receiveShadow=true;arena.add(m);softObj[k]=m;
    const r=srnd();HID[k]=r<.11?'bomb':r<.22?'fire':r<.3?'speed':r<.38?'grow':null;}}

// ---------- montadas: formiga e aranha com o boneco ----------
const skin=M(0xe0b08a,.8),antM=M(0x3a1d12,.35,.1),spM=M(0x1a1a1d,.45,.1),eyeM=M(0x050505,.1,.3);
function legGeo(l){const g=new THREE.CylinderGeometry(.006,.004,l,5);g.translate(0,-l/2,0);return g;}
function makeRider(hex){const g=new THREE.Group(),c=M(hex,.6);const b=new THREE.Mesh(new THREE.CylinderGeometry(.022,.028,.07,10),c);b.position.y=.035;g.add(b);
  const h=new THREE.Mesh(new THREE.SphereGeometry(.022,12,10),skin);h.position.y=.09;g.add(h);const cap=new THREE.Mesh(new THREE.SphereGeometry(.024,12,8,0,TAU,0,Math.PI/2),c);cap.position.y=.094;g.add(cap);
  for(const s of[-1,1]){const a=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.05,6),c);a.position.set(.018,.05,s*.03);a.rotation.z=1.1;g.add(a);}g.traverse(m=>{if(m.isMesh)m.castShadow=true;});return g;}
function makeMount(kind,hex){const root=new THREE.Group(),body=new THREE.Group();root.add(body);const legs=[];const mat=kind==='ant'?antM:spM;
  const ell=(r,sx,sy,sz,x,y,mm)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),mm||mat);m.scale.set(sx,sy,sz);m.position.set(x,y,0);m.castShadow=true;body.add(m);return m;};
  if(kind==='ant'){ell(.05,1.5,1,1.1,-.1,.07);ell(.032,1.5,.9,1,0,.07);ell(.035,1.1,1,1.05,.075,.075);
    for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.009,8,6),eyeM);e.position.set(.095,.085,s*.022);body.add(e);
      const an=new THREE.Mesh(legGeo(.08),mat);an.position.set(.095,.1,s*.012);an.rotation.set(s*.4,0,-2.2);body.add(an);
      for(let k=0;k<3;k++){const l=new THREE.Mesh(legGeo(.11),mat);l.position.set(.02-k*.03,.065,s*.02);l.userData={s,k,base:s*1.1};l.rotation.x=s*1.1;l.rotation.z=(k-1)*.45;body.add(l);legs.push(l);}}}
  else{ell(.07,1.15,.9,1.1,-.08,.09);ell(.042,1.2,.75,1,.03,.07);const st=new THREE.Mesh(new THREE.SphereGeometry(.071,16,12),M(hex,.5));st.scale.set(.9,.35,.35);st.position.set(-.085,.15,0);body.add(st);
    for(const s of[-1,1]){for(let e=0;e<2;e++){const m=new THREE.Mesh(new THREE.SphereGeometry(.007,6,5),eyeM);m.position.set(.075,.085+e*.012,s*.012);body.add(m);}
      for(let k=0;k<4;k++){const l=new THREE.Mesh(legGeo(.16),mat);l.position.set(.06-k*.03,.075,s*.03);l.userData={s,k,base:s*1.0};l.rotation.x=s*1.0;l.rotation.z=(k-1.5)*.5;body.add(l);legs.push(l);}}}
  const rider=makeRider(hex);rider.position.set(kind==='ant'?-.005:.0,kind==='ant'?.1:.12,0);body.add(rider);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.15,.18,28),new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:.7,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.008;root.add(ring);
  scene.add(root);return {root,body,legs,rider};}

// ---------- jogadores ----------
const MAXP=8,BOTN=['Marta','Rui','Inês','Tiago','Sofia','Duarte','Beatriz','Miguel'];
function addP(p,i){const sp=SPAWN[i%SPAWN.length],o=Object.assign(makeMount(p.mount,BCOL[p.slot%8]),{id:p.id,name:p.name,slot:p.slot,bot:!!p.bot,mount:p.mount,x:cx(sp[0]),z:cz(sp[1]),dir:0,size:1,maxB:1,fire:2,spd:0,alive:true,inv:0,outT:null,moving:0,ph:0,tgt:null,path:[],thinkT:0,lb:null});
  o.remote=!o.bot?p.id!==myId:!(isHost||solo);o.dir=sp[0]<7?0:Math.PI;
  const lb=document.createElement('div');lb.className='lb';lb.textContent=p.name;lb.style.borderColor='#'+new THREE.Color(BCOL[p.slot%8]).getHexString();$('labels').appendChild(lb);o.lb=lb;ppl.push(o);return o;}
function clearAll(){ppl.forEach(o=>{scene.remove(o.root);o.lb.remove();});ppl=[];me=null;bombs.forEach(b=>arena.remove(b.obj));bombs=[];flameSpr.forEach(s=>s.visible=false);}
const owned=o=>o===me||(o.bot&&(isHost||solo));
const pSpeed=o=>(2.3+.45*o.spd)*CS*(o.mount==='ant'?1.18:1)*(1-.06*(o.size-1));
const bombAt=(i,j)=>bombs.find(b=>b.i===i&&b.j===j);
function solidFor(o,i,j){if(!inG(i,j))return true;const g=G[idx(i,j)];if(g)return true;const b=bombAt(i,j);return !!b&&!(o&&o.pass&&o.pass.has(b));}
function tryKick(o,i,j,dx,dz){if(o.mount!=='spider')return;const b=bombAt(i,j);if(!b||b.slide||solidFor(null,i+dx,j+dz))return;const e={k:'kick',id:b.id,dx,dz};onEv(e);sendEv(e);}
function move(o,dx,dz,dt){if(!dx&&!dz){o.moving=0;return;}const sp=pSpeed(o)*dt,h=CS*.4;o.moving=1;o.dir=Math.atan2(-dz,dx);
  if(dx){const nx=o.x+dx*sp,lead=ci(nx+dx*h),j0=cj(o.z-h*.9),j1=cj(o.z+h*.9),jc=cj(o.z);
    const b0=solidFor(o,lead,j0),b1=solidFor(o,lead,j1);if(!b0&&!b1)o.x=nx;
    else if(b0!==b1){o.z+=clamp(cz(b0?j1:j0)-o.z,-sp,sp);}else{o.x=clamp(nx,-1e9,1e9);o.x=dx>0?Math.min(nx,GX0+lead*CS-h-.001):Math.max(nx,GX0+(lead+1)*CS+h+.001);if(owned(o))tryKick(o,lead,jc,dx,0);}}
  else{const nz=o.z+dz*sp,lead=cj(nz+dz*h),i0=ci(o.x-h*.9),i1=ci(o.x+h*.9),ic=ci(o.x);
    const b0=solidFor(o,i0,lead),b1=solidFor(o,i1,lead);if(!b0&&!b1)o.z=nz;
    else if(b0!==b1){o.x+=clamp(cx(b0?i1:i0)-o.x,-sp,sp);}else{o.z=dz>0?Math.min(nz,GZ0+lead*CS-h-.001):Math.max(nz,GZ0+(lead+1)*CS+h+.001);if(owned(o))tryKick(o,ic,lead,0,dz);}}
  if(o.pass)for(const b of [...o.pass]){if(Math.abs(o.x-cx(b.i))>CS*.85||Math.abs(o.z-cz(b.j))>CS*.85)o.pass.delete(b);}}

// ---------- bombas ----------
function placeBomb(o){if(!o.alive||gT<0)return;const i=ci(o.x),j=cj(o.z);if(bombAt(i,j)||G[idx(i,j)])return;if(bombs.filter(b=>b.by===o.id).length>=o.maxB)return;
  const e={k:'bomb',id:myId+'-'+(bseq++),by:o.id,i,j,r:o.fire};onEv(e);sendEv(e);}
function addBomb(e){if(bombs.some(b=>b.id===e.id)||!inG(e.i,e.j))return;const g=new THREE.Group(),s=new THREE.Mesh(bombGeo,bombMat);s.position.y=.13;s.castShadow=true;g.add(s);
  const f=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.07,6),fuseMat);f.position.set(0,.27,0);f.rotation.z=.3;g.add(f);const sk=new THREE.Sprite(sparkMat);sk.scale.setScalar(.09);sk.position.set(-.012,.31,0);g.add(sk);
  g.position.set(cx(e.i),0,cz(e.j));arena.add(g);const b={id:e.id,by:e.by,i:e.i,j:e.j,r:e.r|0||2,t:FUSE,obj:g,sk,x:cx(e.i),z:cz(e.j),slide:null};bombs.push(b);
  for(const o of ppl)if(Math.abs(o.x-b.x)<CS*.9&&Math.abs(o.z-b.z)<CS*.9){(o.pass=o.pass||new Set()).add(b);}
  if(e.by===myId)ping(220,.08);}
function blastCells(b,cb){const out=[[b.i,b.j]];for(const [dx,dz] of DIRS)for(let s=1;s<=b.r;s++){const i=b.i+dx*s,j=b.j+dz*s;if(!inG(i,j))break;const g=G[idx(i,j)];if(g===1)break;out.push([i,j]);if(cb&&cb(i,j))break;if(g===2)break;}return out;}
function explode(b){bombs=bombs.filter(x=>x!==b);arena.remove(b.obj);ping(90,.3);shake=Math.max(shake,.12);
  const cells=blastCells(b,(i,j)=>{const k=idx(i,j);const o=bombAt(i,j);if(o&&o.t>.08){o.t=.08;}if(ITEM[k]&&G[k]===0){burnItem(k);return true;}return false;});
  for(const [i,j] of cells){const k=idx(i,j);FL[k]=FLAME;if(G[k]===2){G[k]=0;puff(cx(i),.15,cz(j),10);arena.remove(softObj[k]);softObj[k]=null;if(HID[k])showItem(k,HID[k]);}}
  puff(b.x,.2,b.z,8,0xffa040);}
function showItem(k,ty){ITEM[k]=ty;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex[ty]}));s.scale.setScalar(.3);s.position.set(cx(k%GW),.22,cz(Math.floor(k/GW)));s.userData.t0=.6;arena.add(s);itemObj[k]=s;}
function burnItem(k){if(itemObj[k])arena.remove(itemObj[k]);itemObj[k]=null;ITEM[k]=null;}
function stepBombs(dt){for(const b of bombs.slice()){b.t-=dt;
    if(b.slide){const [dx,dz]=b.slide,sp=5*CS*dt;const ni=b.i+dx,nj=b.j+dz,blocked=solidFor(null,ni,nj)||ppl.some(o=>o.alive&&ci(o.x)===ni&&cj(o.z)===nj);
      const tx=cx(b.i),tz=cz(b.j);if(blocked&&Math.abs(b.x-tx)+Math.abs(b.z-tz)<sp*1.01){b.x=tx;b.z=tz;b.slide=null;}
      else{b.x+=dx*sp;b.z+=dz*sp;if(!blocked&&Math.abs(b.x-cx(ni))+Math.abs(b.z-cz(nj))<CS*.5){b.i=ni;b.j=nj;}}
      b.obj.position.set(b.x,0,b.z);b.obj.rotation.z-=dx*dt*12;b.obj.rotation.x+=dz*dt*12;}
    const pul=1+.08*Math.sin((FUSE-b.t)*(b.t<.8?30:10));b.obj.children[0].scale.setScalar(pul);b.sk.scale.setScalar(.07+Math.random()*.05);
    if(b.t<=0)explode(b);}
  for(let k=0;k<GN;k++){const s=flameSpr[k];if(FL[k]>0){FL[k]-=dt;s.visible=true;const f=FL[k]/FLAME;s.scale.setScalar(CS*(1.1+.4*Math.sin(gT*40+k))*(.5+.5*f));s.material.opacity=1;}else s.visible=false;}}

// ---------- dano, objetos ----------
function stepPlayerRules(o,dt){if(!o.alive)return;o.inv-=dt;const i=ci(o.x),j=cj(o.z),k=idx(i,j);
  if(FL[k]>0&&o.inv<=0){if(o.size>1){o.size--;o.inv=2;if(o===me){toast('Encolheste! Tamanho '+o.size,1.4);flash();}}else{o.alive=false;o.outT=gT;if(o===me){toast('Foste apanhado pela explosão',2.5);flash();}}
    const e={k:'hit',to:o.id,size:o.size,alive:o.alive};sendEv(e);if(o!==me)onHitMsg(e);}
  if(ITEM[k]&&G[k]===0){const ty=ITEM[k];burnItem(k);applyItem(o,ty);const e={k:'pick',k2:k,by:o.id};sendEv(e);}}
function applyItem(o,ty){if(ty==='bomb')o.maxB=Math.min(8,o.maxB+1);else if(ty==='fire')o.fire=Math.min(9,o.fire+1);else if(ty==='speed')o.spd=Math.min(5,o.spd+1);else if(ty==='grow'){o.size=Math.min(3,o.size+1);}
  if(o===me){toast(ITEMS[ty].ic+' '+(ty==='grow'?'Cresceste! Aguentas mais '+(o.size-1)+' explosão'+(o.size>2?'ões':''):ITEMS[ty].nm),1.4);ping(990,.12);}}
function onHitMsg(e){const o=ppl.find(p=>p.id===e.to);if(!o)return;if(e.alive===false){toast(o.name+' foi apanhado!',1.4);puff(o.x,.15,o.z,16,BCOL[o.slot%8]);}}
function onEv(e){if(!playing)return;
  if(e.k==='bomb')addBomb(e);
  else if(e.k==='kick'){const b=bombs.find(x=>x.id===e.id);if(b&&!b.slide){b.slide=[e.dx,e.dz];}}
  else if(e.k==='pick'){burnItem(e.k2);}
  else if(e.k==='hit'){const o=ppl.find(p=>p.id===e.to);if(o&&o.remote){o.size=e.size;if(!e.alive&&o.alive){o.alive=false;o.outT=gT;}}onHitMsg(e);}}

// ---------- bots ----------
function dangerSet(extra){const D=new Uint8Array(GN);for(const b of bombs)for(const [i,j] of blastCells(b))D[idx(i,j)]=1;if(extra)for(const [i,j] of blastCells(extra))D[idx(i,j)]=1;for(let k=0;k<GN;k++)if(FL[k]>0)D[k]=1;return D;}
function bfs(o,si,sj,goal,D,maxd){const prev=new Int16Array(GN).fill(-1),q=[idx(si,sj)];prev[q[0]]=q[0];let h=0;
  while(h<q.length){const k=q[h++],i=k%GW,j=Math.floor(k/GW);if(h>1&&goal(i,j,k))return pathTo(prev,k);if(maxd&&h>maxd*12)break;
    for(const [dx,dz] of DIRS){const ni=i+dx,nj=j+dz;if(!inG(ni,nj))continue;const nk=idx(ni,nj);if(prev[nk]>=0)continue;if(G[nk]||bombAt(ni,nj)||FL[nk]>0)continue;if(D&&D[nk]&&!D[k])continue;prev[nk]=k;q.push(nk);}}return null;}
function pathTo(prev,k){const p=[];while(prev[k]!==k){p.unshift(k);k=prev[k];}return p;}
function botThink(o){const i=ci(o.x),j=cj(o.z),k=idx(i,j),D=dangerSet();
  if(D[k]){o.path=bfs(o,i,j,(a,b,kk)=>!D[kk],null)||[];return;}
  const mine=bombs.filter(b=>b.by===o.id).length;const soft=(a,b)=>DIRS.some(([dx,dz])=>inG(a+dx,b+dz)&&G[idx(a+dx,b+dz)]===2);
  const enemyNear=ppl.some(p=>p!==o&&p.alive&&((ci(p.x)===i&&Math.abs(cj(p.z)-j)<=o.fire)||(cj(p.z)===j&&Math.abs(ci(p.x)-i)<=o.fire)));
  if(mine<o.maxB&&(soft(i,j)||enemyNear)&&Math.random()<.85){const fake={i,j,r:o.fire},D2=dangerSet(fake);const esc=bfsEsc(i,j,D2);if(esc){placeBomb(o);o.path=esc;return;}}
  let p=bfs(o,i,j,(a,b,kk)=>ITEM[kk]&&!D[kk],D,8);
  if(!p)p=bfs(o,i,j,(a,b,kk)=>soft(a,b)&&!D[kk],D);
  if(!p){const tg=ppl.find(q=>q!==o&&q.alive);if(tg){const ti=ci(tg.x),tj=cj(tg.z);p=bfs(o,i,j,(a,b)=>Math.abs(a-ti)+Math.abs(b-tj)<=1,D);}}
  o.path=p?p.slice(0,3):[];}
function bfsEsc(i,j,D2){const prev=new Int16Array(GN).fill(-1),s=idx(i,j),q=[s];prev[s]=s;let h=0;while(h<q.length){const k=q[h++];if(!D2[k])return pathTo(prev,k);const a=k%GW,b=Math.floor(k/GW);
  for(const [dx,dz] of DIRS){const ni=a+dx,nj=b+dz;if(!inG(ni,nj))continue;const nk=idx(ni,nj);if(prev[nk]>=0||G[nk]||bombAt(ni,nj)||FL[nk]>0)continue;prev[nk]=k;q.push(nk);}}return null;}
function botCtl(o,dt){o.thinkT-=dt;const i=ci(o.x),j=cj(o.z);const atC=Math.abs(o.x-cx(i))<.04&&Math.abs(o.z-cz(j))<.04;
  if(o.path.length&&o.path[0]===idx(i,j)&&atC)o.path.shift();
  if((o.thinkT<=0&&atC)||(!o.path.length&&atC)){o.thinkT=.25+Math.random()*.2;botThink(o);}
  if(!o.path.length){const dx=cx(i)-o.x,dz=cz(j)-o.z;return [Math.abs(dx)>.02?Math.sign(dx):0,Math.abs(dx)>.02?0:Math.abs(dz)>.02?Math.sign(dz):0];}
  const nk=o.path[0],ni=nk%GW,nj=Math.floor(nk/GW);if(G[nk]||bombAt(ni,nj)&&!(o.pass&&o.pass.has(bombAt(ni,nj)))){o.path=[];return [0,0];}
  // primeiro alinha no eixo perpendicular, depois avança
  if(ni!==i){if(Math.abs(o.z-cz(j))>.03)return [0,Math.sign(cz(j)-o.z)];return [Math.sign(ni-i),0];}
  if(nj!==j){if(Math.abs(o.x-cx(i))>.03)return [Math.sign(cx(i)-o.x),0];return [0,Math.sign(nj-j)];}
  const dx=cx(ni)-o.x,dz=cz(nj)-o.z;return Math.abs(dx)>Math.abs(dz)?[Math.sign(dx),0]:[0,Math.sign(dz)];}

// ---------- entrada ----------
const keys={};let lastDir=[0,0];
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(!keys[e.code]&&playing&&(e.code==='Space'||e.code==='KeyJ')&&me&&me.alive)placeBomb(me);keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&playing)setPause(!paused);if(e.code==='KeyC')camMode=(camMode+1)%2;});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
document.querySelectorAll('#tc [data-k]').forEach(b=>{const k=b.dataset.k,on=e=>{e.preventDefault();if(k==='Space'&&playing&&me&&me.alive)placeBomb(me);keys[k]=true;},off=e=>{e.preventDefault();keys[k]=false;};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);});
function inDir(){const r=(keys.ArrowRight||keys.KeyD)?1:0,l=(keys.ArrowLeft||keys.KeyA)?1:0,u=(keys.ArrowUp||keys.KeyW)?1:0,d=(keys.ArrowDown||keys.KeyS)?1:0;
  let dx=r-l,dz=d-u;if(camMode){// câmara atrás do boneco: frente é para onde ele olha
    const f=Math.round(me.dir/(Math.PI/2))*(Math.PI/2),fx=Math.round(Math.cos(f)),fz=-Math.round(Math.sin(f));const a=-dz,b=dx;dx=a*fx+b*-fz;dz=a*fz+b*fx;if(dx&&dz)dz=0;}
  if(dx&&dz){if(lastDir[0])dz=0;else dx=0;}if(dx||dz)lastDir=[dx,dz];return [dx,dz];}

// ---------- som e avisos ----------
let actx=null;function ping(f,dur){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f;o.type=f<150?'sawtooth':'triangle';g.gain.setValueAtTime(f<150?.12:.07,t);g.gain.exponentialRampToValueAtTime(.001,t+(dur||.18));o.connect(g).connect(actx.destination);o.start(t);o.stop(t+(dur||.18));}catch(e){}}
let toastT=0;function toast(s,d){const e=$('toast');e.textContent=s;e.classList.add('on');toastT=d||1.5;}
function flash(){const f=$('flash');f.classList.remove('on');void f.offsetWidth;f.classList.add('on');}
let shake=0;

// ---------- rede ----------
const PQ=Q.get('peer'),PCFG=PQ?{host:PQ.split(':')[0],port:+PQ.split(':')[1]||9000,path:'/',secure:false}:{};
const PFX='regata-bom-';
let peer=null,conns=[],hostConn=null,isHost=false,solo=true,myId='h',players=[],code='',leaving=false;
const myName=()=>($('name').value.trim()||'Jogador').slice(0,14),myMount=()=>$('smount').value;
const rc=()=>Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random()*24)]).join('');
const bcast=m=>conns.forEach(c=>{if(c.open)c.send(m);});
function sendEv(e,except){if(solo)return;const m={t:'ev',e};if(isHost)conns.forEach(c=>{if(c!==except&&c.open)c.send(m);});else if(hostConn&&hostConn.open)hostConn.send(m);}
function netErr(e){const t=e&&e.type;$('merr').textContent=t==='peer-unavailable'?'Sala não encontrada. Confirma o código.':t==='network'||t==='server-error'||t==='socket-error'?'Sem ligação ao servidor de salas. Tenta outra vez.':'Erro de ligação: '+(t||e);showMenu('main');}
function resetNet(){leaving=true;conns.forEach(c=>c.close());conns=[];if(hostConn)hostConn.close();hostConn=null;if(peer)peer.destroy();peer=null;leaving=false;}
function hostRoom(){if(!window.Peer)return netErr({type:'PeerJS não carregou'});resetNet();isHost=true;solo=false;code=rc();$('merr').textContent='A criar sala…';
  peer=new Peer(PFX+code,PCFG);
  peer.on('open',()=>{$('merr').textContent='';myId='h';players=[{id:'h',name:myName(),slot:0,mount:myMount()}];showRoom();});
  peer.on('connection',c=>{c.on('data',d=>hostData(c,d));c.on('close',()=>dropConn(c));});
  peer.on('error',e=>{if(e.type==='unavailable-id')hostRoom();else if(e.type!=='peer-unavailable')netErr(e);});}
function hostData(c,d){
  if(d.t==='hello'){if(playing||players.length>=MAXP){c.send({t:'full'});setTimeout(()=>c.close(),400);return;}
    const used=players.map(p=>p.slot),slot=[...Array(MAXP).keys()].find(s=>!used.includes(s));players.push({id:c.peer,name:String(d.name||'Jogador').slice(0,14),slot,mount:d.mount==='spider'?'spider':'ant'});conns.push(c);c.send({t:'welcome',id:c.peer});sendLobby();}
  else if(d.t==='s')applyStates(d.b);
  else if(d.t==='ev'){onEv(d.e);sendEv(d.e,c);}}
function dropConn(c){if(!conns.includes(c))return;conns=conns.filter(x=>x!==c);players=players.filter(p=>p.id!==c.peer);const o=ppl.find(x=>x.id===c.peer);if(o){o.alive=false;o.outT=gT;o.root.visible=false;}if(!playing)sendLobby();}
function sendLobby(){bcast({t:'lobby',players});if(!playing)showRoom();}
function joinRoom(cd){if(!window.Peer)return netErr({type:'PeerJS não carregou'});resetNet();isHost=false;solo=false;code=cd.toUpperCase();$('merr').textContent='A ligar…';
  peer=new Peer(PCFG);
  peer.on('open',()=>{hostConn=peer.connect(PFX+code,{reliable:true});
    hostConn.on('open',()=>hostConn.send({t:'hello',name:myName(),mount:myMount()}));hostConn.on('data',clientData);
    hostConn.on('close',()=>{if(leaving)return;endGame(true);$('merr').textContent='A ligação ao anfitrião caiu.';showMenu('main');});});
  peer.on('error',netErr);}
function clientData(d){
  if(d.t==='welcome')myId=d.id;
  else if(d.t==='lobby'){$('merr').textContent='';players=d.players;if(playing)endGame(true);showRoom();}
  else if(d.t==='full'){$('merr').textContent='Sala cheia ou jogo já a decorrer.';resetNet();showMenu('main');}
  else if(d.t==='start')startGame(d.ps,d.seed);
  else if(d.t==='s')applyStates(d.b);
  else if(d.t==='ev')onEv(d.e);}
const pack=o=>[o.id,+o.x.toFixed(3),+o.z.toFixed(3),+o.dir.toFixed(2),o.size,o.alive?1:0,o.moving];
function applyStates(arr){if(!playing)return;for(const s of arr){const o=ppl.find(p=>p.id===s[0]);if(!o||!o.remote||!Number.isFinite(s[1])||!Number.isFinite(s[2]))continue;o.tgt=s;o.size=s[4]|0||1;if(!s[5]&&o.alive){o.alive=false;o.outT=gT;}o.moving=s[6];}}
let netT=0;function netTick(){if(solo||!playing)return;if(isHost)bcast({t:'s',b:ppl.map(o=>o.remote&&o.tgt?o.tgt:pack(o))});else if(hostConn&&hostConn.open&&me)hostConn.send({t:'s',b:[pack(me)]});}

// ---------- menus ----------
function showMenu(w){$('menu').hidden=false;$('results').hidden=true;$('hud').hidden=true;['main','room'].forEach(s=>$('m-'+s).hidden=s!==w);}
function showRoom(){showMenu('room');$('rcode').textContent=code;$('rlink').value=location.origin+location.pathname+'?sala='+code;
  $('rlist').innerHTML=players.map(p=>`<li><span class="dot" style="background:#${new THREE.Color(BCOL[p.slot%8]).getHexString()}"></span>${esc(p.name)} · ${p.mount==='spider'?'🕷️ aranha':'🐜 formiga'}${p.id===myId?' (tu)':''}${p.id==='h'?' · anfitrião':''}</li>`).join('');
  $('rhost').hidden=!isHost;$('rwait').hidden=isHost;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function pickMount(m){$('smount').value=m;document.querySelectorAll('[data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m));try{localStorage.setItem('bombas-montada',m);}catch(e){}}
document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>pickMount(b.dataset.m));
function fillBots(ps){const out=ps.slice(),n=+$('sbots').value;let k=0;for(let s=0;s<MAXP&&out.length<ps.length+n;s++)if(!out.some(p=>p.slot===s))out.push({id:'b'+s,name:BOTN[k++%8],slot:s,bot:true,mount:Math.random()<.5?'ant':'spider'});return out;}
function go(){const ps=solo?fillBots([{id:'h',name:myName(),slot:0,mount:myMount()}]):fillBots(players),sd=1+Math.floor(Math.random()*2e9);if(!solo)bcast({t:'start',ps,seed:sd});startGame(ps,sd);}
$('bsolo').onclick=()=>{saveName();resetNet();solo=true;isHost=false;myId='h';go();};
$('bhost').onclick=()=>{saveName();hostRoom();};
$('bjoin').onclick=()=>{const c=$('jcode').value.trim();if(c.length<4){$('merr').textContent='Escreve o código da sala (4 letras).';return;}saveName();joinRoom(c);};
$('bstart').onclick=()=>go();
$('bleave').onclick=()=>{resetNet();solo=true;showMenu('main');};
$('bcopy').onclick=()=>{$('rlink').select();try{navigator.clipboard.writeText($('rlink').value);}catch(e){}$('bcopy').textContent='Copiado';setTimeout(()=>$('bcopy').textContent='Copiar',1500);};
$('bagain').onclick=()=>{if(solo||isHost)go();};
$('bmenu').onclick=()=>{endGame(true);if(!solo){resetNet();solo=true;}showMenu('main');};
$('bresume').onclick=()=>setPause(false);$('bquit').onclick=()=>{setPause(false);endGame(true);if(!solo){resetNet();solo=true;}showMenu('main');};
$('bpause').onclick=()=>setPause(!paused);
function saveName(){try{localStorage.setItem('regata-nome',myName());}catch(e){}}
try{$('name').value=localStorage.getItem('regata-nome')||'';pickMount(localStorage.getItem('bombas-montada')==='spider'?'spider':'ant');}catch(e){pickMount('ant');}
function setPause(v){paused=v&&playing;$('pause').hidden=!paused;$('pnote').textContent=solo?'Jogo em pausa.':'O jogo continua para os outros.';}

function startGame(ps,sd){clearAll();buildMap(sd);ps.forEach((p,i)=>{const o=addP(p,i);if(p.id===myId)me=o;});ended=false;playing=true;gT=-3;
  $('menu').hidden=true;$('results').hidden=true;$('hud').hidden=false;toast(me&&me.mount==='spider'?'Aranha: empurra as bombas ao andar contra elas':'Formiga: és mais rápida',2.5);}
function endGame(silent){playing=false;paused=false;$('pause').hidden=true;if(!silent)showResults();else clearAll();}
const rank=()=>[...ppl].sort((a,b)=>(b.alive-a.alive)||((b.outT??1e9)-(a.outT??1e9))||(b.size-a.size));
function showResults(){const ord=rank(),alive=ppl.filter(o=>o.alive),w=alive.length===1?alive[0]:null;
  $('rtitle').textContent=w?(w===me?'Ganhaste!':w.name+' ganhou'):alive.length?'Empate: acabou o tempo':'Ninguém sobreviveu';
  $('rtable').innerHTML=ord.map((o,i)=>`<tr${o===me?' class="me"':''}><td>${i+1}.º</td><td><span class="dot" style="background:#${new THREE.Color(BCOL[o.slot%8]).getHexString()}"></span>${esc(o.name)} ${o.mount==='spider'?'🕷️':'🐜'}</td><td>${o.alive?'de pé · tamanho '+o.size:'apanhado aos '+fmt(o.outT)}</td></tr>`).join('');
  $('bagain').hidden=!(solo||isHost);$('rnote').hidden=solo||isHost;$('results').hidden=false;$('hud').hidden=true;}
const fmt=t=>Math.floor(Math.max(0,t)/60)+':'+String(Math.floor(Math.max(0,t)%60)).padStart(2,'0');

function hud(){if(!me)return;const alive=ppl.filter(o=>o.alive).length,left=Math.max(0,DUR-gT);
  $('status').innerHTML=`<small>DE PÉ</small><b>${alive}/${ppl.length}</b><small>${fmt(left)}</small>`;
  $('board').innerHTML=rank().map(o=>`<div class="r${o===me?' me':''}${o.alive?'':' out'}"><span class="dot" style="background:#${new THREE.Color(BCOL[o.slot%8]).getHexString()}"></span><span>${esc(o.name)}</span><span class="gap">${o.alive?'●'.repeat(o.size):'✕'}</span></div>`).join('');
  $('stats').innerHTML=`💣 ${me.maxB} · 🔥 ${me.fire} · ⚡ ${me.spd} · 🍄 ${me.size}/3`;}

// ---------- ciclo ----------
const tv=V(),camT=V(),camL=V();let last=performance.now(),hudT=0,T=0;
function step(dt){gT+=dt;
  if(gT<0){$('count').hidden=false;$('count').textContent=Math.ceil(-gT);}else if(gT<.8){$('count').hidden=false;$('count').textContent='Já!';}else $('count').hidden=true;
  if(gT>=0)stepBombs(dt);
  for(const o of ppl){
    if(o.remote){if(o.tgt){const s=o.tgt,k=1-Math.exp(-dt*14);o.x+=(s[1]-o.x)*k;o.z+=(s[2]-o.z)*k;o.dir+=angDiff(s[3],o.dir)*k;}}
    else if(o.alive&&gT>=0){let d=[0,0];if(o===me)d=inDir();else if(o.bot)d=botCtl(o,dt);move(o,d[0],d[1],dt);stepPlayerRules(o,dt);}
    // aspeto
    const sc=(1.3+.33*(o.size-1))*(o.mount==='spider'?1.05:1);o.root.scale.setScalar(o.root.scale.x+(sc-o.root.scale.x)*Math.min(1,dt*6));
    o.root.position.set(o.x,0,o.z);o.root.rotation.y+=angDiff(o.dir,o.root.rotation.y)*Math.min(1,dt*12);
    if(o.moving&&o.alive)o.ph+=dt*(o.mount==='ant'?22:16);for(const l of o.legs){const u=l.userData,w=Math.sin(o.ph+u.k*2.1+(u.s>0?0:Math.PI));l.rotation.y=w*.35;l.rotation.x=u.base+(o.moving?Math.max(0,w)*.25*u.s:0);}
    o.body.position.y=o.moving?Math.abs(Math.sin(o.ph))*.008:0;o.rider.rotation.z=o.moving?Math.sin(o.ph*.5)*.08:0;
    o.root.visible=o.alive?!(o.inv>0&&Math.sin(T*30)>0):false;
    if(!o.alive&&o.wasAlive!==false){puff(o.x,.15,o.z,16,BCOL[o.slot%8]);}o.wasAlive=o.alive;}
  for(let k=0;k<GN;k++){const s=itemObj[k];if(s){s.position.y=.22+Math.sin(T*3+k)*.03;if(s.userData.t0>0){s.userData.t0-=dt;s.visible=Math.sin(T*25)>0;}else s.visible=true;}}
  if(!ended&&gT>0){const al=ppl.filter(o=>o.alive).length;if((ppl.length>1&&al<=1)||gT>=DUR||(me&&!me.alive&&solo&&al>0&&ppl.filter(o=>o.alive&&!o.bot).length===0&&gT-me.outT>4)){ended=true;setTimeout(()=>{if(playing)endGame(false);},1800);}}
  netT+=dt;if(netT>.05){netT=0;netTick();}hudT+=dt;if(hudT>.2){hudT=0;hud();}}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
  if(playing&&!(paused&&solo))step(dt);
  const ax=GX0+GW*CS/2,az=GZ0+GH*CS/2;
  if(!playing){const a=T*.08;camT.set(ax+Math.cos(a)*4.5,2.4,az+Math.sin(a)*4.5);camL.set(ax,.2,az);}
  else if(camMode&&me&&me.alive){const f=me.root.rotation.y;camT.set(me.x-Math.cos(f)*.75,.42*me.root.scale.x+.15,me.z+Math.sin(f)*.75);camL.set(me.x+Math.cos(f)*.6,.1,me.z-Math.sin(f)*.6);}
  else{const fx=me?clamp((me.x-ax)*.25,-.6,.6):0,fz=me?clamp((me.z-az)*.2,-.4,.4):0;camT.set(ax+fx,3.4,az+5.1+fz);camL.set(ax+fx*.6,0,az+.4+fz*.6);}
  cam.position.lerp(camT,1-Math.exp(-dt*(playing?5:2)));tv.lerp(camL,1-Math.exp(-dt*(playing?6:2)));if(shake>0){shake-=dt;cam.position.x+=(Math.random()-.5)*shake*.15;cam.position.y+=(Math.random()-.5)*shake*.15;}cam.lookAt(tv);
  const fov=camMode&&playing?72:58;if(Math.abs(cam.fov-fov)>.1){cam.fov+=(fov-cam.fov)*Math.min(1,dt*4);cam.updateProjectionMatrix();}
  for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.t-=dt;p.v.y-=5*dt;p.m.position.addScaledVector(p.v,dt);if(p.m.position.y<.01){p.m.position.y=.01;p.v.multiplyScalar(.5);}p.m.material.opacity=Math.max(0,p.t/.8);if(p.t<=0){scene.remove(p.m);p.m.geometry.dispose();puffs.splice(i,1);}}
  for(const o of ppl){if(!playing||o===me&&!camMode||!o.alive){o.lb.style.display='none';continue;}camL.set(o.x,.32*o.root.scale.x,o.z).project(cam);const vis=camL.z<1&&Math.abs(camL.x)<1.05&&Math.abs(camL.y)<1.05;o.lb.style.display=vis?'block':'none';if(vis)o.lb.style.transform=`translate(${(camL.x*.5+.5)*host.clientWidth}px,${(-camL.y*.5+.5)*host.clientHeight}px) translate(-50%,-100%)`;}
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('on');}
  draw();}
tv.set(GX0+GW*CS/2,.2,GZ0+GH*CS/2);cam.position.set(tv.x+4,2.5,tv.z+4);
{const s=Q.get('sala');if(s)$('jcode').value=s.toUpperCase();}
showMenu('main');requestAnimationFrame(frame);
window.__bombas={get ppl(){return ppl;},get me(){return me;},get bombs(){return bombs;},G,sim(sec){for(let t=0;t<sec;t+=1/30)step(1/30);},start(){solo=true;myId='h';go();}};
