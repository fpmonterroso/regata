'use strict';
// O escritório partilhado pelos jogos aviões de papel e bombas.
const Q=new URLSearchParams(location.search);
const LOW=Q.get('q')==='low'||matchMedia('(pointer:coarse)').matches;
const $=id=>document.getElementById(id);
const V=(x,y,z)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp,TAU=Math.PI*2,UP=V(0,1,0);
const lin=h=>new THREE.Color(h).convertSRGBToLinear();
const M=(c,r=.8,m=0,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:lin(c),roughness:r,metalness:m},o));
const angDiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};

// ---------- render ----------
const host=$('scr'),cv=$('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:!LOW});
renderer.setPixelRatio(+Q.get('px')||(LOW?1:Math.min(1.75,devicePixelRatio||1)));
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=!LOW;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=lin(0xd9dde0);
const cam=new THREE.PerspectiveCamera(66,16/9,.05,120);
let comp=null;
function size(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);if(comp)comp.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();}
function initPost(){if(LOW||!THREE.EffectComposer||!renderer.capabilities.isWebGL2||Q.get('bloom')==='0')return;
  try{const ds=renderer.getDrawingBufferSize(new THREE.Vector2());const rt=new THREE.WebGLMultisampleRenderTarget(ds.x,ds.y,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    const c=new THREE.EffectComposer(renderer,rt);c.addPass(new THREE.RenderPass(scene,cam));c.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(ds.x/2,ds.y/2),.35,.5,.9));c.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));comp=c;}catch(e){comp=null;}}
initPost();new ResizeObserver(size).observe(host);size();
const draw=()=>comp?comp.render():renderer.render(scene,cam);

// reflexos: uma sala de luz difusa com tiras LED
{const pm=new THREE.PMREMGenerator(renderer),es=new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(30,8,18),new THREE.MeshBasicMaterial({color:0x8d9296,side:THREE.BackSide})));
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(30,18),new THREE.MeshBasicMaterial({color:0x4b4f53}));fl.rotation.x=-Math.PI/2;fl.position.y=-3.9;es.add(fl);
  for(const z of[-5,0,5]){const s=new THREE.Mesh(new THREE.BoxGeometry(24,.15,.3),new THREE.MeshBasicMaterial({color:new THREE.Color(6,6,6)}));s.position.set(0,3.5,z);es.add(s);}
  const win=new THREE.Mesh(new THREE.PlaneGeometry(26,4),new THREE.MeshBasicMaterial({color:new THREE.Color(2.2,2.3,2.4)}));win.position.set(0,0,8.9);win.rotation.y=Math.PI;es.add(win);
  scene.environment=pm.fromScene(es,.04).texture;}
scene.add(new THREE.HemisphereLight(0xfffaf2,0x5c564e,.55));
const sunL=new THREE.DirectionalLight(0xfff3e2,1.1);sunL.position.set(3,12,4);sunL.castShadow=true;sunL.shadow.mapSize.set(2048,2048);
Object.assign(sunL.shadow.camera,{left:-20,right:20,top:12,bottom:-12,near:1,far:30});sunL.shadow.bias=-.0006;sunL.shadow.normalBias=.02;scene.add(sunL);

// ---------- texturas ----------
function ctex(w,h,fn,rx,ry){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;if(rx){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry||rx);}return t;}
const noise=(g,w,h,base,amp,n)=>{g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){const v=rnd()<.5?0:255;g.fillStyle=`rgba(${v},${v},${v},${rnd()*amp})`;g.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*2);}};
const woodT=ctex(512,128,(g,w,h)=>{g.fillStyle='#c9955c';g.fillRect(0,0,w,h);for(let i=0;i<70;i++){const y=rnd()*h;g.strokeStyle=`rgba(${110+rnd()*40|0},${62+rnd()*25|0},${25},${.08+rnd()*.16})`;g.lineWidth=.6+rnd()*2.2;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=32)g.lineTo(x,y+Math.sin(x*.02+i)*3*rnd());g.stroke();}
  for(let x=0;x<w;x+=128){g.fillStyle='rgba(60,35,15,.25)';g.fillRect(x,0,1,h);}},1,1);
const carpT=ctex(256,256,(g,w,h)=>{noise(g,w,h,'#4b4f54',.12,7000);g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=1;for(let i=0;i<=w;i+=128){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.moveTo(0,i);g.lineTo(w,i);g.stroke();}},18,10);
const ceilT=ctex(256,256,(g,w,h)=>noise(g,w,h,'#3a3c3e',.25,6000),10,6);
const wallT=ctex(128,128,(g,w,h)=>noise(g,w,h,'#ecebe7',.05,1500),6,2);
const ductT=ctex(64,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#b8bdc1');gr.addColorStop(1,'#9aa0a5');g.fillStyle=gr;g.fillRect(0,0,w,h);for(let y=0;y<h;y+=16){g.fillStyle='rgba(255,255,255,.5)';g.fillRect(0,y,w,2);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(0,y+3,w,1);}},1,20);
const trayT=ctex(128,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle='#c9ccce';g.lineWidth=3;for(let x=0;x<=w;x+=16){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}g.lineWidth=4;g.beginPath();g.moveTo(0,2);g.lineTo(w,2);g.moveTo(0,h-2);g.lineTo(w,h-2);g.stroke();},14,1);
const frostT=ctex(16,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='rgba(245,248,250,.82)';g.fillRect(0,92,w,58);g.fillStyle='rgba(245,248,250,.35)';g.fillRect(0,200,w,8);});
const wbT=ctex(512,256,(g,w,h)=>{g.fillStyle='#f7f8f8';g.fillRect(0,0,w,h);const pens=['#2a5bd7','#d23b3b','#1c1c1c','#1f8a4c'];g.lineCap='round';
  g.font='600 22px "Segoe Print",cursive';const words=['Sprint 12','ideias','voo > 30 m?','dobrar asas','retro sexta','QA ✔','deploy'];words.forEach((t,i)=>{g.fillStyle=pens[i%4];g.fillText(t,24+(i%2)*230,40+Math.floor(i/2)*44);});
  for(let i=0;i<6;i++){g.strokeStyle=pens[i%4];g.lineWidth=2;g.beginPath();let x=40+rnd()*400,y=60+rnd()*160;g.moveTo(x,y);for(let k=0;k<6;k++){x+=rnd()*40-10;y+=rnd()*16-8;g.lineTo(x,y);}g.stroke();}
  ['#ffd84d','#ff9ec4','#9fe08a'].forEach((c,i)=>{g.fillStyle=c;g.fillRect(380+i*38,150+(i%2)*20,32,32);});});
const posterT=(bg,lines)=>ctex(256,360,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='800 64px "Bricolage Grotesque",Arial';lines.forEach((t,i)=>g.fillText(t,22,96+i*62));g.font='500 18px Inter,Arial';g.fillText('escritório · 2026',22,h-26);});
const lockT=ctex(256,160,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#0c1033');gr.addColorStop(1,'#1d2a6b');g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let i=0;i<5;i++){g.strokeStyle=`rgba(${80+i*20},${90+i*15},230,.55)`;g.lineWidth=14-i*2;g.beginPath();g.arc(150+i*6,95,40+i*12,.4+i*.3,3.6+i*.2);g.stroke();}
  g.fillStyle='#fff';g.font='600 30px Inter,Arial';g.textAlign='center';g.fillText('14:18',w/2,44);g.font='500 9px Inter,Arial';g.fillText('terça-feira, 17 de novembro',w/2,58);});
const codeT=ctex(256,160,(g,w,h)=>{g.fillStyle='#1b1e24';g.fillRect(0,0,w,h);const cs=['#c678dd','#61afef','#98c379','#e5c07b','#abb2bf'];for(let y=10;y<h;y+=9){let x=8+((rnd()*4)|0)*10;while(x<w-20&&rnd()<.85){const l=10+rnd()*40;g.fillStyle=cs[(rnd()*5)|0];g.fillRect(x,y,l,4);x+=l+6;}}});
const leafT=ctex(64,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#3f7d35';g.beginPath();g.moveTo(w/2,0);g.quadraticCurveTo(w,h*.5,w/2,h);g.quadraticCurveTo(0,h*.5,w/2,0);g.fill();g.strokeStyle='#2c5a26';g.lineWidth=2;g.beginPath();g.moveTo(w/2,4);g.lineTo(w/2,h-4);g.stroke();});

// ---------- construção da sala ----------
const ROOM={x0:-18,x1:18,z0:-9,z1:9,y1:3.8},COLS=[];// caixas sólidas [x0,y0,z0,x1,y1,z1]
const world=new THREE.Group();scene.add(world);
function box(w,h,d,mat,x,y,z,o={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);if(o.ry)m.rotation.y=o.ry;m.castShadow=o.cast!==false;m.receiveShadow=true;(o.par||world).add(m);if(o.col)COLS.push([x-w/2,y-h/2,z-d/2,x+w/2,y+h/2,z+d/2]);return m;}
const mat={wood:M(0xffffff,.55,0,{map:woodT}),blk:M(0x1b1c1e,.6),blkG:M(0x0c0d0f,.18,.1),mesh:M(0x202124,.85),al:M(0xc5c9cc,.35,.85),wall:M(0xffffff,.92,0,{map:wallT}),white:M(0xf3f3f1,.7),
  glass:new THREE.MeshStandardMaterial({color:lin(0xdfeeee),roughness:.04,metalness:0,transparent:true,opacity:.14,depthWrite:false,envMapIntensity:1.6}),frost:new THREE.MeshBasicMaterial({map:frostT,transparent:true,depthWrite:false}),
  led:new THREE.MeshBasicMaterial({color:new THREE.Color(1.6,1.6,1.55)}),cloud:M(0xf6f6f4,.95),grey:M(0x8c9196,.6,.2),green:M(0x6dbb3c,.7),pot:M(0xd9d4c8,.7)};
// chão, teto, paredes
{const f=new THREE.Mesh(new THREE.PlaneGeometry(40,34),M(0xffffff,.95,0,{map:carpT}));f.rotation.x=-Math.PI/2;f.position.z=1.5;f.receiveShadow=true;world.add(f);
  const c=new THREE.Mesh(new THREE.PlaneGeometry(40,34),M(0xffffff,.95,0,{map:ceilT}));c.rotation.x=Math.PI/2;c.position.set(0,ROOM.y1,1.5);world.add(c);
  // vigas do teto
  for(const x of[-12,-4,4,12])box(.4,.45,34,M(0x45484b,.9),x,ROOM.y1-.22,1.5,{cast:false});
  box(.3,4,34,mat.wall,ROOM.x0-.15,2,1.5,{cast:false});box(.3,4,34,mat.wall,ROOM.x1+.15,2,1.5,{cast:false});
  box(40,4,.3,mat.wall,0,2,-14.15,{cast:false});box(40,4,.3,mat.wall,0,2,16.15,{cast:false});
  // rodapé e faixa branca do lado esquerdo (como na foto)
  box(36,.5,.25,mat.wall,0,ROOM.y1-.25,ROOM.z0-.1,{cast:false});}
// paredes de vidro com caixilhos e faixa fosca, uma porta em cada sala
function glassWall(z,doors){const L=ROOM.x1-ROOM.x0;const g=new THREE.Mesh(new THREE.PlaneGeometry(L,ROOM.y1-.5),mat.glass);g.position.set(0,(ROOM.y1-.5)/2,z);world.add(g);
  const fr=new THREE.Mesh(new THREE.PlaneGeometry(L,ROOM.y1-.5),mat.frost);fr.position.set(0,(ROOM.y1-.5)/2,z+(z<0?.01:-.01));if(z>0)fr.rotation.y=Math.PI;world.add(fr);
  for(let x=ROOM.x0;x<=ROOM.x1+.01;x+=1.5)box(.05,ROOM.y1-.5,.07,mat.al,x,(ROOM.y1-.5)/2,z,{cast:false});
  box(L,.06,.08,mat.al,0,ROOM.y1-.53,z,{cast:false});box(L,.08,.08,mat.al,0,.04,z,{cast:false});
  for(const d of doors||[]){box(.06,2.1,.9,mat.al,d+.45,1.05,z+(z<0?-.45:.45),{ry:0,cast:false});}
  COLS.push([ROOM.x0,0,z-.03,ROOM.x1,ROOM.y1,z+.03]);}
glassWall(ROOM.z0,[-10,4]);glassWall(ROOM.z1,[-2]);
COLS.push([ROOM.x0-1,-1,-15,ROOM.x0,5,17],[ROOM.x1,-1,-15,ROOM.x1+1,5,17],[-19,-1,-15,19,0,17],[-19,ROOM.y1,-15,19,ROOM.y1+1,17]);

// conjuntos instanciados (cadeiras, monitores...)
const tmpM=new THREE.Matrix4(),tmpQ=new THREE.Quaternion(),ONE=V(1,1,1);
function kit(parts,pl){for(const [g,m,l] of parts){const im=new THREE.InstancedMesh(g,m,pl.length);const L=new THREE.Matrix4().compose(V(l[0],l[1],l[2]),new THREE.Quaternion().setFromEuler(new THREE.Euler(l[3]||0,l[4]||0,l[5]||0)),ONE);
  pl.forEach((p,i)=>{tmpM.compose(V(p.x,p.y||0,p.z),tmpQ.setFromAxisAngle(UP,p.ry||0),ONE);im.setMatrixAt(i,tmpM.multiply(L));});im.castShadow=im.receiveShadow=true;world.add(im);}}
const BX=(w,h,d)=>new THREE.BoxGeometry(w,h,d),CY=(r1,r2,h,s)=>new THREE.CylinderGeometry(r1,r2,h,s||12);
const CHAIR=[[BX(.5,.08,.48),mat.blk,[0,.5,0]],[BX(.48,.62,.05),mat.mesh,[0,.92,-.25,-.12]],[BX(.36,.14,.05),mat.blk,[0,1.3,-.3,-.12]],[CY(.025,.025,.38),mat.al,[0,.28,0]],
  [CY(.32,.32,.035,10),mat.blk,[0,.06,0]],[BX(.05,.05,.3),mat.blk,[-.27,.7,.02]],[BX(.05,.05,.3),mat.blk,[.27,.7,.02]],[BX(.03,.2,.03),mat.blk,[-.27,.6,.02]],[BX(.03,.2,.03),mat.blk,[.27,.6,.02]]];
const MON=[[BX(.62,.37,.025),mat.blk,[0,1.08,0]],[BX(.58,.33,.005),mat.blkG,[0,1.08,.014]],[CY(.02,.02,.32,8),mat.blk,[0,.9,-.04]],[BX(.22,.012,.16),mat.blk,[0,.75,-.03]]];
const LAPT=[[BX(.32,.012,.22),mat.al,[0,.75,0]],[BX(.32,.21,.008),mat.al,[0,.86,-.12,-.3]]];
const KEYB=[[BX(.44,.018,.14),mat.blk,[0,.75,0]],[BX(.06,.02,.1),mat.blk,[.3,.75,.02]]];
const MAT=[[BX(.9,.004,.42),mat.blk,[0,.742,0]]];
const ISL=[-5.2,0,5.2],IX0=-13,IX1=9,chairs=[],mons=[],laps=[],kbs=[],mats=[],screens=[];
for(const zc of ISL){box(IX1-IX0,.04,1.6,mat.wood,(IX0+IX1)/2,.72,zc);
  for(let x=IX0+.1;x<=IX1;x+=2.75){box(.05,.7,.05,mat.blk,x,.35,zc-.7,{cast:false});box(.05,.7,.05,mat.blk,x,.35,zc+.7,{cast:false});box(.04,.04,1.4,mat.blk,x,.68,zc,{cast:false});}
  COLS.push([IX0,0,zc-.8,IX1,.76,zc+.8],[IX0+.4,.76,zc-.38,IX1-.4,1.3,zc+.38]);
  for(let x=IX0+.8;x<IX1-.4;x+=1.6)for(const s of[-1,1]){const ry=s>0?0:Math.PI;
    mons.push({x,z:zc+s*.28,ry});mats.push({x,z:zc+s*.55,ry});
    if(rnd()<.8){const cx=x+(rnd()-.5)*.25,cz=zc+s*(1.15+rnd()*.3);chairs.push({x:cx,z:cz,ry:ry+Math.PI+(rnd()-.5)*.6});COLS.push([cx-.3,0,cz-.3,cx+.3,1.15,cz+.3]);}
    if(rnd()<.55)laps.push({x:x+.32,z:zc+s*.6,ry});kbs.push({x:x-.05,z:zc+s*.62,ry});
    if(rnd()<.18)screens.push({x,z:zc+s*.28+s*.017,ry,t:rnd()<.5?lockT:codeT});}}
// salas de reunião atrás do vidro
const meet=[{x:-10,z:-11.5},{x:4,z:-11.5},{x:-2,z:12.5},{x:10,z:12.5}];
for(const r of meet){box(3.2,.05,1.4,mat.wood,r.x,.74,r.z);box(.12,.7,.12,mat.al,r.x,.37,r.z,{cast:false});
  for(const s of[-1,1])for(const dx of[-1,0,1])chairs.push({x:r.x+dx*.95,z:r.z+s*1.05,ry:s>0?Math.PI:0});}
for(const x of[-11,-3,3,11])box(.15,4,5,mat.wall,x,2,-11.5,{cast:false});
kit(CHAIR,chairs);kit(MON,mons);kit(LAPT,laps);kit(KEYB,kbs);kit(MAT,mats);
for(const s of screens){const m=new THREE.Mesh(new THREE.PlaneGeometry(.57,.32),new THREE.MeshBasicMaterial({map:s.t,toneMapped:false}));m.position.set(s.x,1.08,s.z);m.rotation.y=s.ry;world.add(m);}
// garrafas e canecas
kit([[CY(.04,.04,.24,10),M(0x6fae8f,.3,0,{transparent:true,opacity:.8}),[0,.86,0]]],mons.filter(()=>rnd()<.22).map(p=>({x:p.x-.45,z:p.z+(p.ry?-.2:.2)})));
kit([[CY(.045,.04,.2,12),M(0x1d1d1f,.4,.3),[0,.84,0]],[BX(.03,.1,.05),M(0x1d1d1f,.4,.3),[.06,.85,0]]],mons.filter(()=>rnd()<.25).map(p=>({x:p.x+.5,z:p.z+(p.ry?-.3:.3)})));

// teto: condutas, calhas, luzes LED e nuvens acústicas
function duct(z,y,r){const g=new THREE.Mesh(new THREE.CylinderGeometry(r,r,36,20,1,true),M(0xffffff,.35,.85,{map:ductT}));g.rotation.z=Math.PI/2;g.position.set(0,y,z);world.add(g);COLS.push([ROOM.x0,y-r,z-r,ROOM.x1,y+r,z+r]);
  for(let x=-16;x<=16;x+=3)box(.02,ROOM.y1-y-r,.02,mat.al,x,(ROOM.y1+y+r)/2,z,{cast:false});}
duct(-7.9,3.3,.3);duct(7.7,3.4,.22);
for(const z of[-2.8,2.8]){const t=new THREE.Mesh(new THREE.PlaneGeometry(36,.4),new THREE.MeshStandardMaterial({map:trayT,alphaTest:.5,side:THREE.DoubleSide,metalness:.7,roughness:.4}));t.rotation.x=-Math.PI/2;t.position.set(0,3.58,z);world.add(t);}
for(const z of ISL)for(let x=-12;x<=8;x+=4.2){box(3.4,.05,.07,mat.al,x,3.08,z,{cast:false});box(3.3,.012,.05,mat.led,x,3.052,z,{cast:false});
  box(.008,.7,.008,mat.blk,x-1.4,3.45,z,{cast:false});box(.008,.7,.008,mat.blk,x+1.4,3.45,z,{cast:false});COLS.push([x-1.7,3.03,z-.05,x+1.7,3.12,z+.05]);}
const cloudGeo=(()=>{const s=new THREE.Shape(),cs=[[-1.1,-.15,.55],[-.45,.3,.7],[.35,.35,.75],[1.05,0,.6],[.5,-.45,.55],[-.4,-.45,.55]];
  // contorno aproximado da união dos círculos
  const pts=[];for(let i=0;i<96;i++){const a=i/96*TAU,dx=Math.cos(a),dy=Math.sin(a);let best=0;for(const [cx,cy,r] of cs){const b=cx*dx+cy*dy,c=cx*cx+cy*cy-r*r,dd=b*b-c;if(dd>=0)best=Math.max(best,b+Math.sqrt(dd));}pts.push(new THREE.Vector2(dx*best*1.15,dy*best*1.15));}
  s.setFromPoints(pts);const g=new THREE.ExtrudeGeometry(s,{depth:.09,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:1});g.rotateX(Math.PI/2);return g;})();
for(const [x,z,ry] of[[-7,-4.6,.3],[2,2.1,-.2],[-12,4.4,.9],[13,-3.4,0],[8,-6.6,.5]]){const c=new THREE.Mesh(cloudGeo,mat.cloud);c.position.set(x,3.0,z);c.rotation.y=ry;c.castShadow=c.receiveShadow=true;world.add(c);
  for(const [dx,dz] of[[-.8,0],[.8,0]])box(.006,.7,.006,mat.blk,x+dx*Math.cos(ry),3.45,z-dx*Math.sin(ry),{cast:false});
  const bb=new THREE.Box3().setFromObject(c);COLS.push([bb.min.x+.15,bb.min.y,bb.min.z+.15,bb.max.x-.15,bb.max.y,bb.max.z-.15]);}

// parede do fundo: televisão, cartazes, quadro de avisos, balcão
box(.06,.95,1.65,mat.blk,ROOM.x1-.04,1.95,0,{col:true});{const s=new THREE.Mesh(new THREE.PlaneGeometry(1.58,.88),mat.blkG);s.rotation.y=-Math.PI/2;s.position.set(ROOM.x1-.075,1.95,0);world.add(s);}
[['#5b2a86',['voa','mais','alto']],['#1f63c9',['dobra','bem','o papel']],['#c9303a',['sem','medo','de cair']],['#1a9a8a',['ideias','no','ar']]].forEach(([c,l],i)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(.7,.98),M(0xffffff,.6,0,{map:posterT(c,l)}));p.rotation.y=-Math.PI/2;p.position.set(ROOM.x1-.02,i<2?2.2:1.15,-1.9-(i%2)*.85-(i<2?0:0));world.add(p);});
{const nb=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.1),M(0x7cc242,.8));nb.rotation.y=-Math.PI/2;nb.position.set(ROOM.x1-.02,1.4,3.4);world.add(nb);}
box(.65,.9,6,mat.white,ROOM.x1-.33,.45,-1.5,{col:true});box(.68,.03,6.04,M(0xdedcd6,.4),ROOM.x1-.33,.915,-1.5,{cast:false});
box(.3,.25,.4,M(0xe8892b,.6),ROOM.x1-.35,1.05,-3.6);{const h=new THREE.Mesh(new THREE.SphereGeometry(.14,16,10,0,TAU,0,Math.PI/1.8),M(0x111111,.2,.3));h.position.set(ROOM.x1-.35,.93,-.4);world.add(h);}
// quadro branco encostado ao vidro
{const wb=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.25),M(0xffffff,.25,0,{map:wbT}));wb.position.set(-14.2,1.45,ROOM.z0+.06);world.add(wb);box(2.66,1.31,.03,mat.al,-14.2,1.45,ROOM.z0+.035,{col:true,cast:false});}
// colunas
for(const z of[-6.3,6.3])box(.5,ROOM.y1,.5,mat.wall,12.5,ROOM.y1/2,z,{col:true});
// plantas
const leafMat=new THREE.MeshStandardMaterial({map:leafT,alphaTest:.5,side:THREE.DoubleSide,roughness:.8});
function plant(x,z,h){const g=new THREE.Group();const pot=new THREE.Mesh(CY(.22,.17,.4,14),mat.pot);pot.position.y=.2;pot.castShadow=true;g.add(pot);
  const lg=new THREE.PlaneGeometry(.12,.26);const n=Math.round(h*26),im=new THREE.InstancedMesh(lg,leafMat,n);
  for(let i=0;i<n;i++){const t=i/n,a=rnd()*TAU,r=.05+rnd()*.25*(1-t*.4);tmpM.compose(V(Math.cos(a)*r,.45+t*h,Math.sin(a)*r),tmpQ.setFromEuler(new THREE.Euler((rnd()-.5)*1.4,a,(rnd()-.5)*1.4)),ONE);im.setMatrixAt(i,tmpM);}
  im.castShadow=true;g.add(im);for(let k=0;k<3;k++){const s=new THREE.Mesh(CY(.012,.015,h,5),M(0x6f8f3a,.8));s.position.set((rnd()-.5)*.12,.4+h/2,(rnd()-.5)*.12);g.add(s);}
  g.position.set(x,0,z);world.add(g);COLS.push([x-.3,0,z-.3,x+.3,.45+h,z+.3]);}
plant(-16.6,-8.3,1.6);plant(16.9,6.8,1.3);plant(16.9,-7.8,1.8);plant(-16.8,8.2,1.4);plant(-1,-8.4,1.2);plant(10.5,8.4,1.5);
// porta de entrada e cabide
box(.08,2.2,1.2,M(0x9a9fa3,.4,.6),ROOM.x0+.05,1.1,0,{cast:false});
{const p=new THREE.Mesh(CY(.02,.02,1.8,8),mat.blk);p.position.set(15.9,.9,-7.6);world.add(p);const c=box(.45,.8,.18,M(0x3b2e2a,.9),15.9,1.25,-7.55);c.rotation.y=.4;COLS.push([15.6,0,-7.9,16.2,1.8,-7.3]);}

