'use strict';
// Precisa de escritorio.js (a sala) carregado antes.
// ---------- aros da corrida ----------
const RINGS=[[-9,1.5,-2.6],[1,1.1,-2.6],[9,2.0,-2.6],[14.6,2.2,0],[9,1.6,2.6],[0,2.2,2.6],[-8,1.2,2.6],[-16,2.0,0]].map(a=>V(...a)),RN=RINGS.length,RR=.62;
const RDIR=RINGS.map((p,i)=>RINGS[(i+1)%RN].clone().sub(RINGS[(i-1+RN)%RN]).normalize());
const ringGeo=new THREE.TorusGeometry(RR,.045,10,48),ringObjs=RINGS.map((p,i)=>{const m=new THREE.Mesh(ringGeo,new THREE.MeshStandardMaterial({color:lin(0x40d8ff),emissive:lin(0x40d8ff),emissiveIntensity:.8,roughness:.3,transparent:true,opacity:.5}));
  m.position.copy(p);m.lookAt(p.clone().add(RDIR[i]));world.add(m);return m;});
const START=V(-16.4,1.5,-2.6);

// ---------- avião de papel ----------
const PCOL=[0xffc928,0xe8384f,0x22b37a,0x6a55f0,0xff8a1f,0x1fa3e8,0xf05ac8,0x8bd13a];
const paperT=ctex(128,128,(g,w,h)=>{noise(g,w,h,'#fbfbf8',.05,800);g.strokeStyle='rgba(120,160,200,.35)';g.lineWidth=1;for(let y=10;y<h;y+=12){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}g.strokeStyle='rgba(220,90,90,.35)';g.beginPath();g.moveTo(18,0);g.lineTo(18,h);g.stroke();});
function planeGeo(hex){const c=new THREE.Color(hex),w=new THREE.Color(0xffffff);
  // frente em +x; asas ligeiramente em V, quilha por baixo
  const N=[.24,0,0],T=[-.2,0,0],L=[-.2,.035,-.17],R=[-.2,.035,.17],K=[-.17,-.06,0],Lm=[-.02,.012,-.07],Rm=[-.02,.012,.07];
  const tri=[[N,Lm,T,w,c,w],[Lm,L,T,c,c,w],[N,Lm,L,w,c,c],[N,T,Rm,w,w,c],[Rm,T,R,c,w,c],[N,R,Rm,w,c,c],[N,K,T,w,c,c]];
  const pos=[],col=[],uv=[];for(const [a,b,d,ca,cb,cd] of tri){pos.push(...a,...b,...d);for(const k of[ca,cb,cd])col.push(k.r,k.g,k.b);for(const p of[a,b,d])uv.push(p[0]*2+.5,p[2]*2+.5);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;}
function makePlane(slot){const g=new THREE.Group(),m=new THREE.Mesh(planeGeo(PCOL[slot%8]),new THREE.MeshStandardMaterial({map:paperT,vertexColors:true,side:THREE.DoubleSide,roughness:.85}));m.castShadow=true;g.add(m);g.scale.setScalar(1.45);scene.add(g);return g;}
const arrow=new THREE.Mesh(new THREE.ConeGeometry(.05,.16,10),new THREE.MeshBasicMaterial({color:0xffd23f}));arrow.geometry.rotateX(Math.PI/2);scene.add(arrow);arrow.visible=false;

// ---------- bolinhas de papel ----------
const ballGeo=new THREE.IcosahedronGeometry(.055,0),ballMat=M(0xf4f2ea,.9,0,{flatShading:true});let balls=[];
const puffs=[];function puff(p,n,col){for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.05,.05),new THREE.MeshBasicMaterial({color:col||0xffffff,side:THREE.DoubleSide,transparent:true}));m.position.copy(p);scene.add(m);puffs.push({m,v:V(rnd()-.5,rnd()-.2,rnd()-.5).multiplyScalar(3),t:.7});}}

// ---------- estado do jogo ----------
let planes=[],me=null,mode='race',LAPS=3,DUR=150,racing=false,raceT=-9,paused=false,ended=false,firstFin=null;
const MAXP=8,BOTN=['Marta','Rui','Inês','Tiago','Sofia','Duarte','Beatriz','Miguel'];
function addPlane(p,i){const o={id:p.id,name:p.name,slot:p.slot,bot:!!p.bot,obj:makePlane(p.slot),pos:V(),yaw:0,pitch:0,roll:0,yr:0,v:0,cnt:0,fin:null,hp:3,dead:0,kills:0,deaths:0,cd:0,boost:1,bump:0,remote:false,tgt:null,lb:null,wp:0,skill:.9+Math.random()*.08,aimT:0};
  o.remote=!o.bot?p.id!==myId:!(isHost||solo);
  const lb=document.createElement('div');lb.className='lb';lb.textContent=p.name;lb.style.borderColor='#'+new THREE.Color(PCOL[p.slot%8]).getHexString();$('labels').appendChild(lb);o.lb=lb;
  spawn(o,i);planes.push(o);return o;}
function spawn(o,i){if(mode==='race'){const r=Math.floor(i/3),c=i%3;o.pos.set(START.x-r*.9,START.y+(r%2?.5:0)+(c===1?.25:0),START.z+(c-1)*.8);o.yaw=0;}
  else{const sp=SPAWNS[i%SPAWNS.length];o.pos.set(...sp);o.yaw=Math.atan2(-(0-sp[2]),0-sp[0]);}
  o.pitch=0;o.roll=0;o.yr=0;o.v=mode==='race'?0:5;o.tgt=null;o.obj.position.copy(o.pos);}
const SPAWNS=[[-15,2,-7],[15,2,7],[-15,2,7],[15,2,-7],[0,2.6,-7.5],[0,2.6,7.5],[-6,2.6,0],[6,2.6,0]];
function clearPlanes(){planes.forEach(p=>{scene.remove(p.obj);p.lb.remove();});planes=[];me=null;balls.forEach(b=>scene.remove(b.m));balls=[];}

// ---------- voo ----------
const dirOf=(o,out)=>(out||V()).set(Math.cos(o.pitch)*Math.cos(o.yaw),Math.sin(o.pitch),-Math.cos(o.pitch)*Math.sin(o.yaw));
const tv=V(),pv=V();
function collide(o){const p=o.pos,r=.1;let hit=false;
  for(const c of COLS){if(p.x<c[0]-r||p.x>c[3]+r||p.y<c[1]-r||p.y>c[4]+r||p.z<c[2]-r||p.z>c[5]+r)continue;
    const pen=[p.x-(c[0]-r),(c[3]+r)-p.x,p.y-(c[1]-r),(c[4]+r)-p.y,p.z-(c[2]-r),(c[5]+r)-p.z];let k=0;for(let i=1;i<6;i++)if(pen[i]<pen[k])k=i;
    if(k===0)p.x=c[0]-r;else if(k===1)p.x=c[3]+r;else if(k===2)p.y=c[1]-r;else if(k===3)p.y=c[4]+r;else if(k===4)p.z=c[2]-r;else p.z=c[5]+r;
    const ax=k>>1;if(ax===0)o.yaw=Math.PI-o.yaw;else if(ax===2)o.yaw=-o.yaw;else o.pitch=k===3?Math.abs(o.pitch)*.6+.15:-Math.abs(o.pitch)*.5;hit=true;}
  if(hit){if(o.bump<=0){o.v*=.55;if(o===me)toast('Pumba!',.5);puff(p,4);}o.bump=.35;}return hit;}
function fly(o,dt,turn,pit,boost){
  o.yr+=(turn*2.1-o.yr)*Math.min(1,dt*7);o.yaw+=o.yr*dt;
  const tp=pit*.8;o.pitch+=(tp-o.pitch)*Math.min(1,dt*(pit?2.6:1.6));
  const bo=boost&&o.boost>0;o.boost=clamp(o.boost+(bo?-.45:.16)*dt,0,1);
  const vc=6.2+(bo?5:0);o.v+=(-Math.sin(o.pitch)*8+(vc-o.v)*.9)*dt;o.v=clamp(o.v,2.4,15);
  o.roll+=(-o.yr*.42-o.roll)*Math.min(1,dt*6);o.bump-=dt;
  const steps=Math.max(1,Math.ceil(o.v*dt/.08)),h=dt/steps;
  for(let s=0;s<steps;s++){const d=dirOf(o,tv);pv.copy(o.pos);o.pos.addScaledVector(d,o.v*h);o.pos.y-=Math.max(0,4-o.v)*.5*h;collide(o);if(mode==='race')ringCheck(o,pv);}}
function ringCheck(o,prev){if(o.fin!=null)return;const k=o.cnt%RN,c=RINGS[k],n=RDIR[k];
  const a=pv2.copy(prev).sub(c).dot(n),b=pv3.copy(o.pos).sub(c).dot(n);if(!(a<0&&b>=0))return;
  const t=a/(a-b),hp=pv2.copy(prev).lerp(o.pos,t);if(hp.distanceTo(c)>RR+.05)return;
  o.cnt++;if(o===me){ping(880);if(o.cnt%RN===0&&o.cnt<LAPS*RN)toast('Volta '+(o.cnt/RN+1)+' de '+LAPS,1.4);}
  if(o.cnt>=LAPS*RN){o.fin=raceT;if(firstFin==null)firstFin=raceT;if(o===me){toast('Chegada! '+(place(me))+'.º lugar',3);ping(1320);}}}
const pv2=V(),pv3=V();
const progress=o=>o.fin!=null?1e9-o.fin:o.cnt*100-o.pos.distanceTo(RINGS[o.cnt%RN]);
const place=o=>[...planes].sort((a,b)=>mode==='race'?progress(b)-progress(a):(b.kills-a.kills)||(a.deaths-b.deaths)).indexOf(o)+1;

// ---------- bots ----------
const probe=V();
function blockedAt(p){for(const c of COLS)if(p.x>c[0]-.15&&p.x<c[3]+.15&&p.y>c[1]-.15&&p.y<c[4]+.15&&p.z>c[2]-.15&&p.z<c[5]+.15)return c;return null;}
function botCtl(o,dt){let tx,ty,tz,fire=false,boost=false;
  if(mode==='race'){const k=o.cnt%RN,c=RINGS[k],d=o.pos.distanceTo(c);const n=RINGS[(k+1)%RN];const w=clamp(1-d/2.2,0,.35);tx=c.x+(n.x-c.x)*w;ty=c.y+(n.y-c.y)*w;tz=c.z+(n.z-c.z)*w;
    // aproxima-se do aro pelo lado certo
    if(d>1.2){const back=RDIR[k];tx-=back.x*.8;ty-=back.y*.8;tz-=back.z*.8;}boost=o.boost>.6&&d>6&&Math.abs(o.yr)<.5;}
  else{let best=null,bd=14;for(const p of planes){if(p===o||p.dead>0)continue;const d=p.pos.distanceTo(o.pos);if(d<bd){bd=d;best=p;}}
    if(best&&(o.slot+Math.floor(raceT/6))%3){tx=best.pos.x;ty=best.pos.y;tz=best.pos.z;const f=dirOf(o,tv),to=pv.copy(best.pos).sub(o.pos);if(bd<9&&f.dot(to.normalize())>.96)fire=Math.random()<o.skill*.5;}
    else{let w=RINGS[o.wp%RN];if(o.pos.distanceTo(w)<1.5)o.wp=(o.wp+1+Math.floor(Math.random()*3))%RN;w=RINGS[o.wp%RN];tx=w.x;ty=w.y;tz=w.z;}}
  const dy=Math.atan2(-(tz-o.pos.z),tx-o.pos.x),e=angDiff(dy,o.yaw);let turn=clamp(e*2.2,-1,1);
  const hd=Math.hypot(tx-o.pos.x,tz-o.pos.z),dp=Math.atan2(ty-o.pos.y,Math.max(.4,hd));let pit=clamp((dp-o.pitch*.6)*2.4,-1,1);
  probe.copy(o.pos).addScaledVector(dirOf(o,tv),1.3);const c=blockedAt(probe);if(c){if(c[4]<2.6&&o.pos.y<c[4]+.6)pit=1;else turn=turn>=0?1:-1;}
  if(o.pos.y<.55)pit=1;if(o.pos.y>3.35)pit=-1;
  return [turn*o.skill,pit,boost,fire];}

// ---------- combate ----------
function shoot(o){if(o.cd>0||o.dead>0||mode!=='fight'||raceT<0)return;o.cd=.32;const d=dirOf(o,V()),p=o.pos.clone().addScaledVector(d,.3);
  const e={k:'sh',by:o.id,p:[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)],d:[+d.x.toFixed(3),+d.y.toFixed(3),+d.z.toFixed(3)],v:+(o.v+11).toFixed(1)};onEv(e);sendEv(e);}
function addBall(e){const by=planes.find(p=>p.id===e.by);if(!by)return;const m=new THREE.Mesh(ballGeo,ballMat);m.position.set(...e.p);scene.add(m);
  balls.push({m,by,vel:V(...e.d).multiplyScalar(e.v),t:1.3,mine:by===me||(by.bot&&(isHost||solo))});if(by===me)ping(420,.05);}
function stepBalls(dt){for(let i=balls.length-1;i>=0;i--){const b=balls[i];b.t-=dt;b.vel.y-=2.2*dt;b.m.position.addScaledVector(b.vel,dt);b.m.rotation.x+=dt*9;b.m.rotation.y+=dt*7;
    let end=b.t<=0||!!blockedAt(b.m.position);
    if(!end&&b.mine)for(const p of planes){if(p===b.by||p.dead>0)continue;if(p.pos.distanceTo(b.m.position)<.32){const e={k:'hit',by:b.by.id,to:p.id};onEv(e);sendEv(e);end=true;break;}}
    if(end){if(b.t>0)puff(b.m.position,3);scene.remove(b.m);balls.splice(i,1);}}}
function owned(p){return p===me||(p.bot&&(isHost||solo));}
function onEv(e){const by=planes.find(p=>p.id===e.by),to=planes.find(p=>p.id===e.to);
  if(e.k==='sh')addBall(e);
  else if(e.k==='hit'&&to){puff(to.pos,6,PCOL[to.slot%8]);if(to===me){flash();toast((by?by.name:'Alguém')+' acertou-te!',1);}if(by===me)ping(660,.08);
    if(owned(to)&&to.dead<=0){to.hp--;if(to.hp<=0){to.dead=3;to.v=0;const k={k:'ko',by:e.by,to:to.id};onEv(k);sendEv(k);}}}
  else if(e.k==='ko'&&to){if(by)by.kills++;to.deaths++;if(!owned(to)){to.dead=3;}puff(to.pos,14,PCOL[to.slot%8]);
    if(by===me)toast('Derrubaste '+to.name+'!',1.6);else if(to===me)toast((by?by.name:'Alguém')+' derrubou-te. Voltas em 3 s',2);else toast((by?by.name:'?')+' derrubou '+to.name,1.2);}}

// ---------- entrada ----------
const keys={};addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&racing)setPause(!paused);if(e.code==='KeyC')camMode=(camMode+1)%2;});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
const inTurn=()=>((keys.ArrowLeft||keys.KeyA)?1:0)-((keys.ArrowRight||keys.KeyD)?1:0);
// W/↑ sobe, S/↓ desce
const inPitch=()=>((keys.ArrowUp||keys.KeyW)?1:0)-((keys.ArrowDown||keys.KeyS)?1:0);
document.querySelectorAll('#tc [data-k]').forEach(b=>{const k=b.dataset.k,on=e=>{e.preventDefault();keys[k]=true;},off=e=>{e.preventDefault();keys[k]=false;};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);});
let camMode=0;

// ---------- som e avisos ----------
let actx=null;function ping(f,dur){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();o.frequency.value=f;o.type='triangle';g.gain.setValueAtTime(.08,t);g.gain.exponentialRampToValueAtTime(.001,t+(dur||.18));o.connect(g).connect(actx.destination);o.start(t);o.stop(t+(dur||.18));}catch(e){}}
let toastT=0;function toast(s,d){const e=$('toast');e.textContent=s;e.classList.add('on');toastT=d||1.5;}
function flash(){const f=$('flash');f.classList.remove('on');void f.offsetWidth;f.classList.add('on');}

// ---------- rede (PeerJS, como na regata) ----------
const PQ=Q.get('peer'),PCFG=PQ?{host:PQ.split(':')[0],port:+PQ.split(':')[1]||9000,path:'/',secure:false}:{};
const PFX='regata-avi-';
let peer=null,conns=[],hostConn=null,isHost=false,solo=true,myId='h',players=[],code='',leaving=false;
const myName=()=>($('name').value.trim()||'Jogador').slice(0,14);
const rc=()=>Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random()*24)]).join('');
const bcast=m=>conns.forEach(c=>{if(c.open)c.send(m);});
function sendEv(e,except){if(solo)return;const m={t:'ev',e};if(isHost)conns.forEach(c=>{if(c!==except&&c.open)c.send(m);});else if(hostConn&&hostConn.open)hostConn.send(m);}
function netErr(e){const t=e&&e.type;$('merr').textContent=t==='peer-unavailable'?'Sala não encontrada. Confirma o código.':t==='network'||t==='server-error'||t==='socket-error'?'Sem ligação ao servidor de salas. Tenta outra vez.':'Erro de ligação: '+(t||e);showMenu('main');}
function resetNet(){leaving=true;conns.forEach(c=>c.close());conns=[];if(hostConn)hostConn.close();hostConn=null;if(peer)peer.destroy();peer=null;leaving=false;}
function hostRoom(){if(!window.Peer)return netErr({type:'PeerJS não carregou'});resetNet();isHost=true;solo=false;code=rc();$('merr').textContent='A criar sala…';
  peer=new Peer(PFX+code,PCFG);
  peer.on('open',()=>{$('merr').textContent='';myId='h';players=[{id:'h',name:myName(),slot:0}];showRoom();});
  peer.on('connection',c=>{c.on('data',d=>hostData(c,d));c.on('close',()=>dropConn(c));});
  peer.on('error',e=>{if(e.type==='unavailable-id')hostRoom();else if(e.type!=='peer-unavailable')netErr(e);});}
function hostData(c,d){
  if(d.t==='hello'){if(racing||players.length>=MAXP){c.send({t:'full'});setTimeout(()=>c.close(),400);return;}
    const used=players.map(p=>p.slot),slot=[...Array(MAXP).keys()].find(s=>!used.includes(s));players.push({id:c.peer,name:String(d.name||'Jogador').slice(0,14),slot});conns.push(c);c.send({t:'welcome',id:c.peer});sendLobby();}
  else if(d.t==='s')applyStates(d.b);
  else if(d.t==='ev'){onEv(d.e);sendEv(d.e,c);}}
function dropConn(c){if(!conns.includes(c))return;conns=conns.filter(x=>x!==c);players=players.filter(p=>p.id!==c.peer);const p=planes.find(x=>x.id===c.peer);if(p){scene.remove(p.obj);p.lb.remove();planes=planes.filter(x=>x!==p);}if(!racing)sendLobby();}
function sendLobby(){bcast({t:'lobby',players,mode:$('smode').value});if(!racing)showRoom();}
function joinRoom(cd){if(!window.Peer)return netErr({type:'PeerJS não carregou'});resetNet();isHost=false;solo=false;code=cd.toUpperCase();$('merr').textContent='A ligar…';
  peer=new Peer(PCFG);
  peer.on('open',()=>{hostConn=peer.connect(PFX+code,{reliable:true});
    hostConn.on('open',()=>hostConn.send({t:'hello',name:myName()}));hostConn.on('data',clientData);
    hostConn.on('close',()=>{if(leaving)return;endGame(true);$('merr').textContent='A ligação ao anfitrião caiu.';showMenu('main');});});
  peer.on('error',netErr);}
function clientData(d){
  if(d.t==='welcome')myId=d.id;
  else if(d.t==='lobby'){$('merr').textContent='';players=d.players;$('smode').value=d.mode;if(racing)endGame(true);showRoom();}
  else if(d.t==='full'){$('merr').textContent='Sala cheia ou jogo já a decorrer.';resetNet();showMenu('main');}
  else if(d.t==='start')startGame(d.ps,d.mode,d.laps);
  else if(d.t==='s')applyStates(d.b);
  else if(d.t==='ev')onEv(d.e);}
const pack=o=>[o.id,+o.pos.x.toFixed(2),+o.pos.y.toFixed(2),+o.pos.z.toFixed(2),+o.yaw.toFixed(3),+o.pitch.toFixed(3),+o.roll.toFixed(2),+o.v.toFixed(2),o.cnt,o.fin==null?null:+o.fin.toFixed(2),o.hp,o.dead>0?1:0];
function applyStates(arr){if(!racing)return;for(const s of arr){const o=planes.find(p=>p.id===s[0]);if(!o||!o.remote)continue;
  if(!s.slice(1,8).every(Number.isFinite))continue;o.tgt=s;o.cnt=s[8]|0;if(s[9]!=null&&o.fin==null){o.fin=s[9];if(firstFin==null)firstFin=raceT;}o.hp=s[10];if(!s[11]&&o.dead>0)o.dead=0;}}
function netTick(){if(solo||!racing)return;const own=planes.filter(owned).map(pack);if(isHost)bcast({t:'s',b:planes.map(p=>p.tgt&&p.remote?[p.id,...p.tgt.slice(1)]:pack(p))});else if(hostConn&&hostConn.open)hostConn.send({t:'s',b:own});}

// ---------- menus ----------
function showMenu(w){$('menu').hidden=false;$('results').hidden=true;$('hud').hidden=true;['main','room'].forEach(s=>$('m-'+s).hidden=s!==w);}
function showRoom(){showMenu('room');$('rcode').textContent=code;$('rlink').value=location.origin+location.pathname+'?sala='+code;
  $('rlist').innerHTML=players.map(p=>`<li><span class="dot" style="background:#${new THREE.Color(PCOL[p.slot%8]).getHexString()}"></span>${esc(p.name)}${p.id===myId?' (tu)':''}${p.id==='h'?' · anfitrião':''}</li>`).join('');
  $('rhost').hidden=!isHost;$('rwait').hidden=isHost;$('rmode').textContent=$('smode').value==='fight'?'Combate':'Corrida';}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function pickMode(m){$('smode').value=m;document.querySelectorAll('[data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m));$('lapsrow').hidden=m!=='race';if(isHost&&!racing)sendLobby();}
document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>pickMode(b.dataset.m));
function fillBots(ps){const out=ps.slice(),n=+$('sbots').value;let k=0;for(let s=0;s<MAXP&&out.length<ps.length+n;s++)if(!out.some(p=>p.slot===s))out.push({id:'b'+s,name:BOTN[k++%8],slot:s,bot:true});return out;}
let lastPs=null;
function go(){const ps=solo?fillBots([{id:'h',name:myName(),slot:0}]):fillBots(players),m=$('smode').value,l=+$('slaps').value;lastPs=ps;if(!solo)bcast({t:'start',ps,mode:m,laps:l});startGame(ps,m,l);}
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
try{$('name').value=localStorage.getItem('regata-nome')||'';}catch(e){}
function setPause(v){paused=v&&racing;$('pause').hidden=!paused;$('pnote').textContent=solo?'Jogo em pausa.':'O jogo continua para os outros.';}

function startGame(ps,m,l){clearPlanes();mode=m==='fight'?'fight':'race';LAPS=l||3;ended=false;firstFin=null;
  ps.forEach((p,i)=>{const o=addPlane(p,i);if(p.id===myId)me=o;});
  ringObjs.forEach(r=>r.visible=mode==='race');arrow.visible=mode==='race';
  $('menu').hidden=true;$('results').hidden=true;$('hud').hidden=false;$('hp').hidden=mode!=='fight';$('cross').hidden=mode!=='fight';document.body.classList.toggle('fight',mode==='fight');
  racing=true;raceT=-3;toast(mode==='race'?'Passa pelos aros amarelos: '+LAPS+' voltas':'Derruba os outros aviões: Espaço dispara',3);}
function endGame(silent){racing=false;paused=false;$('pause').hidden=true;if(!silent)showResults();else clearPlanes();}
function showResults(){const ord=[...planes].sort((a,b)=>mode==='race'?progress(b)-progress(a):(b.kills-a.kills)||(a.deaths-b.deaths));
  $('rtitle').textContent=mode==='race'?'Resultado da corrida':'Resultado do combate';
  $('rtable').innerHTML=ord.map((o,i)=>`<tr${o===me?' class="me"':''}><td>${i+1}.º</td><td><span class="dot" style="background:#${new THREE.Color(PCOL[o.slot%8]).getHexString()}"></span>${esc(o.name)}</td><td>${mode==='race'?(o.fin!=null?fmt(o.fin):'aro '+o.cnt+'/'+LAPS*RN):o.kills+' abates · '+o.deaths+' quedas'}</td></tr>`).join('');
  $('bagain').hidden=!(solo||isHost);$('rnote').hidden=solo||isHost;$('results').hidden=false;$('hud').hidden=true;}
const fmt=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(2).padStart(5,'0');

// ---------- HUD ----------
function hud(){if(!me)return;
  if(mode==='race'){const ord=[...planes].sort((a,b)=>progress(b)-progress(a));
    $('status').innerHTML=`<small>VOLTA</small><b>${Math.min(LAPS,Math.floor(me.cnt/RN)+1)}/${LAPS}</b><small>aro ${me.cnt%RN+1}/${RN} · ${fmt(Math.max(0,raceT))}</small>`;
    $('board').innerHTML=ord.map((o,i)=>`<div class="r${o===me?' me':''}"><span>${i+1}.º</span><span class="dot" style="background:#${new THREE.Color(PCOL[o.slot%8]).getHexString()}"></span><span>${esc(o.name)}</span><span class="gap">${o.fin!=null?fmt(o.fin):Math.floor(o.cnt/RN)+1+'ª'}</span></div>`).join('');}
  else{const ord=[...planes].sort((a,b)=>(b.kills-a.kills)||(a.deaths-b.deaths)),left=Math.max(0,DUR-raceT);
    $('status').innerHTML=`<small>COMBATE</small><b>${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}</b><small>${me.kills} abates</small>`;
    $('board').innerHTML=ord.map((o,i)=>`<div class="r${o===me?' me':''}"><span>${i+1}.º</span><span class="dot" style="background:#${new THREE.Color(PCOL[o.slot%8]).getHexString()}"></span><span>${esc(o.name)}</span><span class="gap">${o.kills} ✈</span></div>`).join('');
    $('hp').innerHTML=me.dead>0?'<span>A voltar…</span>':'❤'.repeat(Math.max(0,me.hp))+'<span class="off">'+'❤'.repeat(Math.max(0,3-me.hp))+'</span>';}
  $('boostbar').style.width=(me.boost*100).toFixed(0)+'%';$('spd').textContent=(me.v*3.6).toFixed(0)+' km/h';}

// ---------- ciclo ----------
const camPos=V(),camLook=V(),tmp=V(),tmp2=V();let last=performance.now(),netT=0,hudT=0,T=0;
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
  if(racing&&!(paused&&solo))step(dt);
  if(!racing){// câmara de apresentação
    const a=T*.06;camPos.set(Math.cos(a)*9,2.4+Math.sin(T*.2)*.3,Math.sin(a)*5);cam.position.copy(camPos);cam.lookAt(0,1.2,0);}
  ringObjs.forEach((r,i)=>{const nx=me&&mode==='race'?me.cnt%RN:-1,on=i===nx,nx2=i===(nx+1)%RN&&nx>=0;r.material.color.copy(lin(on?0xffd23f:0x40d8ff));r.material.emissive.copy(r.material.color);r.material.opacity=on?.95:nx2?.55:.25;r.material.emissiveIntensity=on?1.6+Math.sin(T*6)*.5:.6;r.rotation.z+=dt*(on?1.2:.2);});
  for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.t-=dt;p.v.y-=4*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*5;p.m.material.opacity=Math.max(0,p.t/.7);if(p.t<=0){scene.remove(p.m);p.m.geometry.dispose();puffs.splice(i,1);}}
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('on');}
  draw();}
function step(dt){raceT+=dt;
  if(raceT<0){$('count').hidden=false;$('count').textContent=Math.ceil(-raceT);}else if(raceT<.8){$('count').hidden=false;$('count').textContent='Já!';}else $('count').hidden=true;
  for(const o of planes){
    if(o.remote){if(o.tgt){const s=o.tgt;tmp.set(s[1],s[2],s[3]);o.pos.lerp(tmp,1-Math.exp(-dt*10));o.yaw+=angDiff(s[4],o.yaw)*Math.min(1,dt*10);o.pitch+=(s[5]-o.pitch)*Math.min(1,dt*10);o.roll+=(s[6]-o.roll)*Math.min(1,dt*10);o.v=s[7];o.dead=s[11]?Math.max(o.dead,.1):o.dead;}}
    else if(raceT>=0&&o.fin==null&&!(o.dead>0)){let turn=0,pit=0,boost=false,fire=false;
      if(o===me){turn=inTurn();pit=inPitch();boost=!!(keys.ShiftLeft||keys.ShiftRight||keys.KeyX);fire=!!(keys.Space||keys.KeyJ);}
      else if(o.bot)[turn,pit,boost,fire]=botCtl(o,dt);
      fly(o,dt,turn,pit,boost);if(fire)shoot(o);}
    else if(o.fin!=null&&!o.remote){// depois da chegada plana devagar
      o.v=Math.max(3,o.v-dt*2);o.yr=.6;fly(o,dt,.5,0,false);}
    o.cd-=dt;
    if(o.dead>0){o.dead-=dt;if(owned(o)){o.pos.y=Math.max(.15,o.pos.y-dt*1.5);if(o.dead<=0){o.hp=3;spawn(o,Math.floor(Math.random()*SPAWNS.length));}}}
    o.obj.visible=!(o.dead>0)||Math.sin(T*20)>0;o.obj.position.copy(o.pos);o.obj.rotation.set(0,0,0);o.obj.rotateY(o.yaw);o.obj.rotateZ(o.pitch);o.obj.rotateX(o.roll+(o.bump>0?Math.sin(T*40)*.2:0));}
  if(mode==='fight')stepBalls(dt);
  // fim
  if(!ended){if(mode==='fight'&&raceT>=DUR)finish();
    if(mode==='race'&&firstFin!=null&&(planes.every(p=>p.fin!=null)||raceT-firstFin>25||me.fin!=null&&planes.filter(p=>!p.bot).every(p=>p.fin!=null)&&raceT-firstFin>6))finish();}
  // câmara
  if(me){const d=dirOf(me,tmp2);const back=camMode?.0:1.6,upk=camMode?0:.5;
    tmp.set(me.pos.x-Math.cos(me.yaw)*back,me.pos.y+upk-d.y*.5*back,me.pos.z+Math.sin(me.yaw)*back);
    for(let k=0;k<3&&blockedAt(tmp);k++)tmp.lerp(me.pos,.5);tmp.x=clamp(tmp.x,ROOM.x0+.2,ROOM.x1-.2);tmp.z=clamp(tmp.z,ROOM.z0+.2,ROOM.z1-.2);tmp.y=clamp(tmp.y,.2,ROOM.y1-.15);
    if(camMode){cam.position.copy(me.pos).addScaledVector(d,.25);cam.position.y+=.08;}else cam.position.lerp(tmp,1-Math.exp(-dt*7));
    camLook.copy(me.pos).addScaledVector(d,2.2);cam.lookAt(camLook);cam.rotateZ(-me.roll*.35);
    me.obj.visible=me.obj.visible&&!camMode;
    cam.fov+=((66+Math.max(0,me.v-6)*1.8)-cam.fov)*Math.min(1,dt*3);cam.updateProjectionMatrix();
    if(mode==='race'&&me.fin==null){const c=RINGS[me.cnt%RN];arrow.position.copy(me.pos).addScaledVector(d,.55);arrow.position.y+=.22;arrow.lookAt(c);arrow.visible=me.pos.distanceTo(c)>1.8;}else arrow.visible=false;}
  // nomes
  for(const o of planes){if(o===me){o.lb.style.display='none';continue;}tmp.copy(o.pos);tmp.y+=.25;tmp.project(cam);const vis=tmp.z<1&&Math.abs(tmp.x)<1.1&&Math.abs(tmp.y)<1.1&&o.pos.distanceTo(cam.position)<16;o.lb.style.display=vis?'block':'none';if(vis)o.lb.style.transform=`translate(${(tmp.x*.5+.5)*host.clientWidth}px,${(-tmp.y*.5+.5)*host.clientHeight}px) translate(-50%,-100%)`;}
  netT+=dt;if(netT>.066){netT=0;netTick();}
  hudT+=dt;if(hudT>.2){hudT=0;hud();}}
function finish(){ended=true;setTimeout(()=>{if(racing)endGame(false);},1500);}

// ---------- arranque ----------
pickMode(Q.get('modo')==='combate'?'fight':'race');
{const s=Q.get('sala');if(s){$('jcode').value=s.toUpperCase();}}
showMenu('main');requestAnimationFrame(frame);
window.__avioes={get planes(){return planes;},get me(){return me;},COLS,RINGS,sim(sec){for(let t=0;t<sec;t+=1/30)step(1/30);},start:(m)=>{solo=true;myId='h';pickMode(m||'race');go();}};
