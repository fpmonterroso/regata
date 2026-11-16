(function(){
const LOW=new URLSearchParams(location.search).get('q')==='low'||matchMedia('(pointer:coarse)').matches;
const HOUSES=[],TREES=[];
const host=document.getElementById('scr'),cv=document.getElementById('cv');
if(!window.THREE||!THREE.Water||!THREE.Sky){document.getElementById('err').hidden=false;document.getElementById('menu').hidden=true;return;}
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const sm=THREE.MathUtils.smoothstep, clamp=THREE.MathUtils.clamp, V=(x,y,z)=>new THREE.Vector3(x,y,z);
const lin=h=>new THREE.Color(h).convertSRGBToLinear();
const M=(c,r=.85,m=0,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:lin(c),roughness:r,metalness:m},o));

const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
renderer.setPixelRatio(LOW?1:Math.min(2,devicePixelRatio||1));
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.8;
renderer.shadowMap.enabled=!LOW;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xc4d8e4,900,5200);
const cam=new THREE.PerspectiveCamera(56,16/9,0.5,20000);
function size(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
new ResizeObserver(size).observe(host);size();

const sunDir=V(0,1,0);
const sky=new THREE.Sky();sky.scale.setScalar(10000);scene.add(sky);
const su=sky.material.uniforms;su.turbidity.value=4;su.rayleigh.value=1.3;su.mieCoefficient.value=0.005;su.mieDirectionalG.value=0.85;
const pmrem=new THREE.PMREMGenerator(renderer);let envRT=null;
const sun=new THREE.DirectionalLight(0xffe6c8,2.6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-220,right:220,top:220,bottom:-220,far:1400});sun.shadow.bias=-0.0006;sun.shadow.normalBias=.6;scene.add(sun);scene.add(sun.target);
scene.add(new THREE.HemisphereLight(0xcfe4ff,0x4a5a48,0.75));

/* ---------- texturas geradas ---------- */
function canvasTex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=4;return t;}
function normalMap(N){
  const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');const img=g.createImageData(N,N);
  const waves=[];for(let i=0;i<40;i++){const kx=Math.round((rnd()*2-1)*14),ky=Math.round((rnd()*2-1)*14);if(!kx&&!ky)continue;waves.push([kx,ky,rnd()*6.28,1/Math.hypot(kx,ky)]);}
  const H=new Float32Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){let h=0;for(const w of waves)h+=Math.sin(6.2832*(w[0]*x+w[1]*y)/N+w[2])*w[3];H[y*N+x]=h;}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const dx=H[y*N+(x+1)%N]-H[y*N+(x-1+N)%N],dy=H[((y+1)%N)*N+x]-H[((y-1+N)%N)*N+x];let nx=-dx*3,ny=-dy*3,nz=1;const l=Math.hypot(nx,ny,nz);const o=(y*N+x)*4;img.data[o]=(nx/l*.5+.5)*255;img.data[o+1]=(ny/l*.5+.5)*255;img.data[o+2]=(nz/l*.5+.5)*255;img.data[o+3]=255;}
  g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
const winTex=(cols,rows,arc)=>canvasTex(128,128,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.06)';g.fillRect(0,h-6,w,6);
  const cw=w/cols,rh=h/rows;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=c*cw+cw*.33,y=r*rh+rh*.26,ww=cw*.34,hh=rh*.5;
    if(arc&&r===rows-1){g.fillStyle='#2a2f38';g.beginPath();g.moveTo(c*cw+cw*.18,h);g.lineTo(c*cw+cw*.18,y+hh*.5);g.arc(c*cw+cw*.5,y+hh*.5,cw*.32,Math.PI,0);g.lineTo(c*cw+cw*.82,h);g.fill();continue;}
    g.fillStyle='#e9e6de';g.fillRect(x-2,y-2,ww+4,hh+4);g.fillStyle=(r*3+c)%5?'#56687a':'#8296a6';g.fillRect(x,y,ww,hh);}},false);
const wallTex=winTex(3,2),tallTex=winTex(3,5),arcTex=winTex(5,2,true),blockTex=winTex(6,6);
const roofTex=canvasTex(64,64,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);g.strokeStyle='rgba(0,0,0,.22)';for(let y=0;y<h;y+=8){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}g.strokeStyle='rgba(0,0,0,.08)';for(let x=0;x<w;x+=6){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}},true);
const groundTex=canvasTex(256,256,(g,w,h)=>{const im=g.createImageData(w,h);for(let i=0;i<w*h;i++){const v=200+rnd()*55;im.data[i*4]=im.data[i*4+1]=im.data[i*4+2]=v;im.data[i*4+3]=255;}g.putImageData(im,0,0);g.globalAlpha=.25;for(let i=0;i<300;i++){g.fillStyle=rnd()>.5?'#fff':'#999';g.beginPath();g.arc(rnd()*w,rnd()*h,2+rnd()*7,0,7);g.fill();}},true);

/* ---------- água ---------- */
const water=new THREE.Water(new THREE.PlaneGeometry(14000,14000),{textureWidth:LOW?256:1024,textureHeight:LOW?256:1024,waterNormals:normalMap(256),sunDirection:sunDir.clone(),sunColor:0xfff0d8,waterColor:0x0b4f66,distortionScale:3,fog:true});
water.rotation.x=-Math.PI/2;water.material.uniforms.size.value=2.4;scene.add(water);

/* ---------- peças de construção ---------- */
let world=null,H=()=>0,anims=[];
function box(w,h,d,mat,x,y,z,ry,par){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);if(ry)m.rotation.y=ry;m.castShadow=m.receiveShadow=true;(par||world).add(m);return m;}
function cyl(rt,rb,h,mat,x,y,z,seg,par){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||16),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;(par||world).add(m);return m;}
function tube(pts,r,mat,par){const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*3,r,6),mat);m.castShadow=true;(par||world).add(m);return m;}
function lines(arr,col){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:lin(col)}));world.add(l);return l;}
function scatter(n,fn){const out=[];let guard=0;while(out.length<n&&guard++<n*25){const o=fn();if(o)out.push(o);}return out;}
const slope=(x,z)=>Math.hypot(H(x+5,z)-H(x-5,z),H(x,z+5)-H(x,z-5))/10;
const unitBox=new THREE.BoxGeometry(1,1,1);unitBox.translate(0,.5,0);
const prism=(()=>{const s=new THREE.Shape();s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(0,1);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:1,bevelEnabled:false});g.translate(0,0,-.5);return g;})();
const PASTEL=[0xffffff,0xf6f1e4,0xf3e2c0,0xf0cfa8,0xe9eef0,0xf2dc8f,0xe8b9aa,0xbcd0df];
function houses(list,tex,flatRoof){
  list.forEach((o,i)=>HOUSES.push({x:o.x,z:o.z,w:o.w,d:o.d,rot:o.rot||0,c:o.c!=null?o.c:PASTEL[i%PASTEL.length]}));
  const n=list.length;if(!n)return;const walls=new THREE.InstancedMesh(unitBox,new THREE.MeshStandardMaterial({map:tex||wallTex,roughness:.85}),n);
  const roofs=new THREE.InstancedMesh(flatRoof?unitBox:prism,new THREE.MeshStandardMaterial({map:roofTex,roughness:.8}),n);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=V(),p=V(),up=V(0,1,0);
  list.forEach((o,i)=>{const y=o.y!=null?o.y:H(o.x,o.z);q.setFromAxisAngle(up,o.rot||0);
    m.compose(p.set(o.x,y-4,o.z),q,s.set(o.w,o.h+4,o.d));walls.setMatrixAt(i,m);walls.setColorAt(i,lin(o.c!=null?o.c:PASTEL[i%PASTEL.length]));
    m.compose(p.set(o.x,y+o.h,o.z),q,flatRoof?s.set(o.w*1.03,.8,o.d*1.03):s.set(o.w*1.14,o.rh||Math.min(o.w,o.d)*.42,o.d*1.14));roofs.setMatrixAt(i,m);
    roofs.setColorAt(i,lin(o.rc!=null?o.rc:[0xb9552f,0xa94a2a,0xc2623a,0x9c4426][i%4]));});
  walls.castShadow=roofs.castShadow=walls.receiveShadow=true;world.add(walls,roofs);}
function trees(list){list.forEach((o,i)=>TREES.push({x:o.x,z:o.z,r:o.r,c:[0x244f27,0x2d5f2c,0x1f4423,0x38692f][i%4]}));const n=list.length;const t=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),M(0xffffff,.95),n);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=V(),p=V();
  list.forEach((o,i)=>{m.compose(p.set(o.x,H(o.x,o.z)+o.r*.7,o.z),q,s.set(o.r,o.r*1.35,o.r));t.setMatrixAt(i,m);t.setColorAt(i,lin([0x244f27,0x2d5f2c,0x1f4423,0x38692f][i%4]));});t.castShadow=true;world.add(t);}
function terrain(L){const [w,d,cx,cz,sx,sz]=L.terr;const geo=new THREE.PlaneGeometry(w,d,sx,sz);geo.rotateX(-Math.PI/2);geo.translate(cx,0,cz);const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setY(i,L.h(pos.getX(i),pos.getZ(i)));geo.computeVertexNormals();const nor=geo.attributes.normal,col=new Float32Array(pos.count*3),c=new THREE.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);L.color(x,z,pos.getY(i),nor.getY(i),c);c.convertSRGBToLinear();const n=.9+.2*(Math.sin(x*.13+z*.07)*Math.cos(z*.11-x*.05)*.5+.5);col[i*3]=c.r*n;col[i*3+1]=c.g*n;col[i*3+2]=c.b*n;}
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));const tex=groundTex.clone();tex.needsUpdate=true;tex.repeat.set(w/50,d/50);
  const t=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,map:tex,roughness:.96}));t.receiveShadow=true;world.add(t);}
function clouds(n,fn){const cm=M(0xffffff,1,0,{transparent:true,opacity:.93});for(let i=0;i<n;i++){const [cx,cy,cz]=fn(i);const g=new THREE.Group();for(let k=0;k<6;k++){const s=new THREE.Mesh(new THREE.SphereGeometry(40+rnd()*55,10,8),cm);s.position.set((rnd()-.5)*220,(rnd()-.5)*30,(rnd()-.5)*100);s.scale.y=.5;g.add(s);}g.position.set(cx,cy,cz);world.add(g);}}
function mooredBoats(n,fn){const hull=new THREE.InstancedMesh(new THREE.BoxGeometry(7,1.2,2.2),M(0xf4f4f0,.4),n),mast=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.08,9,5),M(0xcfd4d8,.3,.8),n);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=V(1,1,1),p=V();
  for(let i=0;i<n;i++){const [x,z,r]=fn(i);q.setFromAxisAngle(V(0,1,0),r);m.compose(p.set(x,.4,z),q,s);hull.setMatrixAt(i,m);m.compose(p.set(x,5,z),q,s);mast.setMatrixAt(i,m);}world.add(hull,mast);}
function statueFigure(par,x,y,z,sc,mat){const g=new THREE.Group();cyl(1.2,2,9,mat,0,4.5,0,10,g);box(11,1.3,1.3,mat,0,7.6,0,0,g);const hd=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),mat);hd.position.y=9.8;g.add(hd);g.position.set(x,y,z);g.scale.setScalar(sc);par.add(g);return g;}
/* ================= FUNCHAL ================= */
const zsF=x=>-320+250*sm(Math.abs(x),350,1300)+22*Math.sin(x*.011);
const MXA={x:760,d:185,a:270,b:150},inMX=(x,z)=>((x-MXA.x)/MXA.a)**2+((zsF(x)-z-MXA.d)/MXA.b)**2;
function hF(x,z){const h=hF0(x,z),e=inMX(x,z);return e>=1||zsF(x)-z<0?h:h+(32+2.5*Math.sin(x*.035)*Math.cos(z*.04)-h)*sm(1-e,0,.3);}
function hF0(x,z){const d=zsF(x)-z;if(d<0)return Math.max(-12,d*.35);
  const rav=1-.32*sm(d,40,260)*(1-sm(d,500,1100))*(Math.exp(-(((x+430)/50)**2))+Math.exp(-(((x-70)/42)**2))+Math.exp(-(((x-520)/50)**2)));
  let h=Math.min(d*.2,60)+sm(d,150,700)*110+sm(d,450,2000)*560+(Math.sin(x*.0042+1)*.5+.5)*sm(d,350,1300)*120+sm(Math.abs(x),850,1250)*sm(d,0,60)*120;
  h+=(Math.sin(x*.021+z*.017)*8+Math.sin(x*.047-z*.031)*4)*sm(d,60,400);return h*rav+Math.min(d,12)*.25;}
function buildFunchal(){
  const stone=M(0xa9a294,.9),fortM=M(0xd9ccb0,.85);
  houses(scatter(2300,()=>{const x=(rnd()*2-1)*1050;const d=22+Math.pow(rnd(),1.7)*760;if(rnd()<d/1100)return null;const z=zsF(x)-d;if(slope(x,z)>.75||nearTrail(x,z,23))return null;const low=d<130&&Math.abs(x)<500;
    return {x,z,w:7+rnd()*7,d:7+rnd()*6,h:low?9+rnd()*12:5+rnd()*6,rot:(rnd()-.5)*.6,c:PASTEL[Math.floor(rnd()*5)]};}));
  houses(scatter(26,()=>{const x=-1250+rnd()*500;const d=30+rnd()*150;const z=zsF(x)-d;return {x,z,w:26+rnd()*14,d:13,h:22+rnd()*18,rot:(rnd()-.5)*.3,c:0xf7f6f2,rc:0xd8d8d4};}),blockTex,true);
  trees(scatter(4200,()=>{const x=(rnd()*2-1)*2300;const d=120+rnd()*1500;const z=zsF(x)-d;if(H(x,z)>560||nearTrail(x,z,18))return null;return {x,z,r:4+rnd()*5};}));
  // avenida à beira-mar com palmeiras
  const pt=new THREE.InstancedMesh(new THREE.CylinderGeometry(.35,.5,8,6),M(0x7a5a3a),60),pc=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3,1),M(0x2f7a34,.8),60);const mm=new THREE.Matrix4();
  for(let i=0;i<60;i++){const x=-330+i*14,z=zsF(x)-14,y=H(x,z);mm.makeTranslation(x,y+4,z);pt.setMatrixAt(i,mm);mm.makeScale(1,.45,1).setPosition(x,y+8.5,z);pc.setMatrixAt(i,mm);if(i%3===0)box(42,3,3,stone,x,2,zsF(x)-3,Math.atan2(-(zsF(x+7)-zsF(x-7)),14));}
  world.add(pt,pc);
  // porto: molhe, forte no ilhéu, navio
  const bx=-560,bz=zsF(-560)+20,ang=-.1;
  box(640,9,20,stone,bx+310,1.5,bz+48,ang);box(640,5,5,stone,bx+310,7,bz+56,ang);
  for(let i=0;i<42;i++){const k=new THREE.Mesh(new THREE.DodecahedronGeometry(5+rnd()*3,0),M(0x6a665f,.95,0,{flatShading:true}));k.position.set(bx+10+i*15,-1,bz+60-i*1.5);world.add(k);}
  const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(30,1),M(0x5b534a,.95,0,{flatShading:true}));rk.scale.set(1.2,.85,1);rk.position.set(bx,3,bz+30);world.add(rk);
  cyl(21,23,14,fortM,bx,25,bz+30,18);for(let i=0;i<16;i++){const a=i/16*6.28;box(3,3,3,fortM,bx+Math.cos(a)*21,33.5,bz+30+Math.sin(a)*21);}box(10,12,10,fortM,bx+4,37,bz+27);
  const ship=new THREE.Group(),navy=M(0x1b2b47,.5,.2),white=M(0xffffff,.45);box(240,22,34,navy,0,8,0,0,ship);
  const bow=new THREE.Mesh(new THREE.CylinderGeometry(17,17,22,3,1,false,0,Math.PI),navy);bow.rotation.y=-Math.PI/2;bow.position.set(120,8,0);bow.scale.set(1,1,2.2);ship.add(bow);
  for(let i=0;i<5;i++){box(210-i*22,7,30-i*1.5,white,-8-i*4,22+i*7,0,0,ship);box(206-i*22,1.5,30.4-i*1.5,M(0x22364a,.2,.6),-8-i*4,22.5+i*7,0,0,ship);}
  box(16,14,10,M(0xc8302c,.5),-60,64,0,0,ship);ship.position.set(bx+330,0,bz+20);ship.rotation.y=ang;world.add(ship);
  // marina e Forte de São Tiago
  box(150,6,8,stone,250,1,zsF(250)+70,.05);box(8,6,70,stone,328,1,zsF(328)+36);
  mooredBoats(30,i=>[170+(i%10)*15,zsF(250)+22+Math.floor(i/10)*15,Math.PI/2]);
  const yel=M(0xe6b53a,.8);box(46,13,30,yel,640,H(640,zsF(640)-6)+5,zsF(640)-6,-.2);cyl(6,6,17,yel,618,H(640,zsF(640)-6)+8,zsF(640)+6,12);
  // moinho no promontório
  {const x=1080,z=zsF(1080)-40,h=H(x,z);const mill=new THREE.Group();cyl(7,9,22,M(0xf6f3ec,.85),0,11,0,20,mill);const cap=new THREE.Mesh(new THREE.ConeGeometry(8.2,8,20),M(0x5c3b26,.8));cap.position.y=26;mill.add(cap);
    const ms=new THREE.Group();for(let i=0;i<8;i++){const sp=new THREE.Group();cyl(.18,.18,16,M(0x4a3020),0,8,0,5,sp);const tri=new THREE.Shape();tri.moveTo(0,2);tri.lineTo(4.5,15);tri.lineTo(0,15.5);tri.closePath();sp.add(new THREE.Mesh(new THREE.ShapeGeometry(tri),M(0xf3ede0,.9,0,{side:THREE.DoubleSide})));sp.rotation.z=i/8*6.28;ms.add(sp);}
    ms.position.set(0,22,11.5);mill.add(ms);mill.position.set(x,h-1,z);mill.rotation.y=-.4;world.add(mill);anims.push((dt,g)=>ms.rotation.z-=dt*.6*g);}
  // torres eólicas
  for(let i=0;i<7;i++){const x=-300+i*180+(rnd()-.5)*40,z=zsF(x)-1500-(i%2)*60,h=H(x,z);const g=new THREE.Group(),wm=M(0xf2f4f5,.5);cyl(1.4,2.6,90,wm,0,45,0,12,g);box(5,4,10,wm,0,91,1,0,g);
    const rot=new THREE.Group();for(let b=0;b<3;b++){const arm=new THREE.Group();box(2.4,46,.6,wm,0,23,0,0,arm);arm.rotation.z=b/3*6.28;rot.add(arm);}rot.position.set(0,91,6.5);rot.rotation.z=rnd()*6;g.add(rot);g.position.set(x,h,z);g.rotation.y=.6;world.add(g);anims.push((dt,gu)=>rot.rotation.z-=dt*1.1*gu);}
  clouds(16,()=>{const x=(rnd()*2-1)*2200,z=zsF(x)-1300-rnd()*700;return [x,H(x,z)+60+rnd()*80,z];});
}
/* ================= TEJO e DOURO ================= */
function hT(x,z){const dn=-200-z,ds=z-300;
  if(dn>0)return 3.5+sm(dn,70,520)*(55+35*Math.sin(x*.0052+.5)+28*Math.sin(x*.011+2))+75*Math.exp(-((x-760)**2+(z+560)**2)/150**2)+95*Math.exp(-((x+520)**2+(z+820)**2)/320**2)+Math.sin(x*.03+z*.02)*3*sm(dn,70,300);
  if(ds>0)return (sm(ds,0,45)*64+sm(ds,45,500)*28+Math.sin(x*.02)*5*sm(ds,10,60))*(1-.6*sm(x,450,900));
  if(dn>-8)return -12+(dn+8)/8*15.5;if(ds>-8)return -12+(ds+8)/8*12;return -12;}
function buildTejo(){
  const lioz=M(0xe6dfcf,.8),red=M(0xa8392b,.55,.3),conc=M(0xb9b6ad,.9),yel=new THREE.MeshStandardMaterial({map:arcTex,color:lin(0xe8c24a),roughness:.85});
  // Ponte 25 de Abril
  const X=-150,cy=z=>z<-110?50+82*Math.pow((z+230)/120,1.6):z>170?50+82*Math.pow((330-z)/160,1.6):58+74*((z-30)/140)**2;
  box(18,2.5,1100,red,X,50,-220);box(14,7,560,M(0x7d2c22,.6,.3),X,45,50);
  for(const zt of [-110,170]){for(const s of [-9,9])box(4,134,6,red,X+s,67,zt);for(const y of [30,72,102,131])box(22,4,5,red,X,y,zt);box(32,12,18,conc,X,2,zt);}
  const seg=[];for(const s of [-9,9]){const pts=[];for(let z=-230;z<=330;z+=10){pts.push(V(X+s,cy(z),z));if(z>-225&&z<325)seg.push(X+s,cy(z),z,X+s,51,z);}tube(pts,.55,red);}
  lines(seg,0x8a3024);for(let z=-300;z>=-760;z-=90)box(6,50,6,conc,X,25,z);
  // Cristo Rei
  {const g=new THREE.Group(),x=-40,z=372,y=H(x,z);for(const sx of[-5,5])for(const sz of[-5,5])box(3,64,3,lioz,sx,32,sz,0,g);box(14,5,14,lioz,0,64,0,0,g);box(8,10,8,lioz,0,8,0,0,g);statueFigure(g,0,66.5,0,1.9,lioz).rotation.y=0;g.position.set(x,y,z);world.add(g);}
  // Padrão dos Descobrimentos
  {const g=new THREE.Group();const s=new THREE.Shape();[[-12,0],[12,0],[16,10],[5,46],[-3,50],[-12,50]].forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));
    const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:6,bevelEnabled:false}).translate(0,0,-3),lioz);slab.castShadow=true;g.add(slab);
    const r=new THREE.Shape();[[-11,0],[14,0],[14,15],[-11,3]].forEach((p,i)=>i?r.lineTo(p[0],p[1]):r.moveTo(p[0],p[1]));
    for(const sz of[-1,1]){const ramp=new THREE.Mesh(new THREE.ExtrudeGeometry(r,{depth:3,bevelEnabled:false}).translate(0,0,-1.5),lioz);ramp.position.z=sz*5;ramp.castShadow=true;g.add(ramp);
      for(let i=0;i<9;i++){const f=cyl(.7,.9,4.5,M(0xd6cdb8,.8),-8+i*2.6,5+i*1.35,sz*5.2,6,g);}
      const wing=box(15,32,1.2,lioz,-2,30,sz*4.2,0,g);wing.rotation.z=-.2;}
    box(2,22,1,M(0x8c8576,.7),15.5,26,0,0,g).rotation.z=-.24;
    g.position.set(-640,3.5,-204);g.rotation.y=-Math.PI/2;world.add(g);
    const rose=new THREE.Mesh(new THREE.CircleGeometry(24,40),M(0xd9c7a0,.9));rose.rotation.x=-Math.PI/2;rose.position.set(-640,3.7,-238);world.add(rose);}
  // Torre de Belém
  {const g=new THREE.Group(),m=M(0xdcd3bd,.85);cyl(15,16,11,m,0,5,6,6,g);for(let i=0;i<6;i++){const a=i/6*6.28+.52;cyl(2,2,5,m,Math.cos(a)*15,12,6+Math.sin(a)*15,8,g);}
    box(11,30,11,m,0,15,-8,0,g);box(13,2,13,m,0,22,-8,0,g);box(8,7,8,m,0,33.5,-8,0,g);for(const sx of[-5,5])for(const sz of[-13,-3]){cyl(1.4,1.4,6,m,sx,32,sz,8,g);const d=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,6),m);d.position.set(sx,35.5,sz);g.add(d);}
    g.position.set(-900,0,-194);world.add(g);}
  // Mosteiro dos Jerónimos
  {const m=M(0xe9e2d0,.85);box(230,15,22,new THREE.MeshStandardMaterial({map:arcTex,color:lin(0xe9e2d0),roughness:.85}),-700,11,-345);houses([{x:-700,z:-345,w:22,d:232,h:15,rot:Math.PI/2,c:0xe9e2d0,rh:7}]);
    box(42,26,30,m,-565,16.5,-345);cyl(7,8,22,m,-592,40,-345,10);const dome=new THREE.Mesh(new THREE.SphereGeometry(7.5,14,10,0,6.28,0,1.57),m);dome.position.set(-592,51,-345);world.add(dome);}
  // MAAT
  {const s=new THREE.Mesh(new THREE.SphereGeometry(1,24,12,0,6.28,0,1.57),M(0xf5f5f1,.25));s.scale.set(75,11,20);s.position.set(-400,3.5,-222);s.castShadow=true;world.add(s);}
  // Praça do Comércio
  {const px=650,z0=-212,stoneD=M(0xe9e4d6,.85);const pav=new THREE.Mesh(new THREE.PlaneGeometry(150,120),M(0xe7dcc0,.9));pav.rotation.x=-Math.PI/2;pav.position.set(px,3.7,z0-60);pav.receiveShadow=true;world.add(pav);
    for(const s of[-1,1]){box(15,18,120,yel,px+s*75,12.5,z0-60);box(18,27,18,yel,px+s*75,17,z0-8);const r=new THREE.Mesh(new THREE.ConeGeometry(13,9,4),M(0x8a8f96,.6));r.rotation.y=Math.PI/4;r.position.set(px+s*75,35,z0-8);world.add(r);}
    box(165,18,15,yel,px,12.5,z0-127);houses([{x:px-75,z:z0-66,w:16,d:102,h:18,c:0xe8c24a,rh:5,y:3.5},{x:px+75,z:z0-66,w:16,d:102,h:18,c:0xe8c24a,rh:5,y:3.5},{x:px,z:z0-127,w:16,d:166,h:18,rot:Math.PI/2,c:0xe8c24a,rh:5,y:3.5}]);
    box(24,36,16,stoneD,px,21.5,z0-127);box(11,22,16.6,M(0x2a2f38,.9),px,14.5,z0-127);box(12,7,8,stoneD,px,43,z0-127);
    box(7,11,7,stoneD,px,9,z0-58);box(6,4.5,2.2,M(0x3f6b58,.5,.4),px,16.5,z0-58);const hd=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,6),M(0x3f6b58,.5,.4));hd.position.set(px,20,z0-58);world.add(hd);
    for(const s of[-9,9])cyl(1,1.1,9,stoneD,px+s,4,z0+14,10);box(40,2,10,stoneD,px,2.4,z0+6);}
  // Castelo de São Jorge
  {const cx=760,cz=-560,y=H(cx,cz),m=M(0xb7a47f,.9);for(const[a,b,w,d]of[[0,-32,70,5],[0,32,70,5],[-35,0,5,70],[35,0,5,70]])box(w,12,d,m,cx+a,y+3,cz+b);for(const sx of[-35,0,35])for(const sz of[-32,32])box(9,18,9,m,cx+sx,y+6,cz+sz);}
  // cidade
  houses(scatter(2700,()=>{const x=-1250+rnd()*2500;const dn=80+Math.pow(rnd(),1.4)*720;const z=-200-dn;if(x>-830&&x<-540&&dn<190)return null;if(x>555&&x<745&&dn<150)return null;if(Math.abs(x+150)<16)return null;if(x<-250&&dn>430&&rnd()<.85)return null;if(Math.hypot(x-760,z+560)<55)return null;
    const baixa=x>520&&x<800&&dn<420;return {x:baixa?Math.round(x/18)*18:x,z:baixa?Math.round(z/20)*20:z,w:baixa?13:7+rnd()*7,d:baixa?15:7+rnd()*6,h:baixa?16:8+rnd()*10,rot:baixa?0:(rnd()-.5)*.5,c:PASTEL[Math.floor(rnd()*8)]};}),tallTex);
  houses(scatter(360,()=>{const x=-1200+rnd()*2300,ds=70+rnd()*380;const z=300+ds;if(Math.hypot(x+40,z-372)<40)return null;return {x,z,w:7+rnd()*6,d:7+rnd()*6,h:6+rnd()*7,rot:rnd(),c:PASTEL[Math.floor(rnd()*5)]};}));
  trees(scatter(1500,()=>{const x=-1300+rnd()*2500;const south=rnd()<.4;const z=south?300+15+rnd()*380:-200-(x<-200?120+rnd()*800:60+rnd()*700);if(!south&&x>-200&&rnd()<.7)return null;return {x,z,r:5+rnd()*6};}));
  // cacilheiro
  {const g=new THREE.Group();box(34,5,10,M(0xf2f2ee,.5),0,2.5,0,0,g);box(26,4,8,M(0xe8892b,.5),0,7,0,0,g);box(8,3,6,M(0xf2f2ee,.5),6,10.5,0,0,g);g.position.set(320,0,170);g.rotation.y=.5;world.add(g);anims.push((dt,gu,T)=>{g.position.y=Math.sin(T*1.2)*.25;});}
  clouds(7,i=>[-1400+i*450,330+rnd()*80,-1500-rnd()*500]);
}

/* ================= DOURO ================= */
const zcD=x=>110*Math.sin(x/430+.4),wD=x=>75+sm(-x,650,1150)*420;
function hD(x,z){const s=z<zcD(x)?0:1,dist=Math.abs(z-zcD(x))-wD(x),sea=sm(x,-1320,-1080);if(dist<0||sea<=0)return Math.max(-12,dist*.5);
  const low=.22+.78*sm(x,-1000,-450);
  const h=(x>-350?Math.min(dist*.6,3.5):Math.min(dist*.3,3.5))+sm(dist,20,170)*(92+26*Math.sin(x*.007+s*2))*low+sm(dist,170,700)*45*low+Math.sin(x*.025+z*.02)*4*sm(dist,30,200);
  return h*sea-(1-sea)*12;}
function buildDouro(){
  const iron=M(0x56636e,.5,.6),conc=M(0xd2cdc2,.85),gran=M(0x8d8a82,.9);
  const riverAng=x=>Math.atan2(-(zcD(x+10)-zcD(x-10)),20);
  // Ponte Dom Luís I
  {const X=520,c=zcD(X),half=92;box(9,2.2,360,iron,X,79,c);box(9,1.6,196,iron,X,12,c);box(9.5,1,360,M(0x39424a,.6,.5),X,81,c);
    const seg=[];for(const ox of[-4,4]){const a=[],b=[];for(let i=0;i<=24;i++){const t=i/12-1,z=c+t*half;a.push(V(X+ox,10+68*(1-t*t),z));b.push(V(X+ox,2+60*(1-t*t),z+0));}
      tube(a,.9,iron);tube(b,.8,iron);for(let i=0;i<24;i++){seg.push(a[i].x,a[i].y,a[i].z,b[i+1].x,b[i+1].y,b[i+1].z,b[i].x,b[i].y,b[i].z,a[i+1].x,a[i+1].y,a[i+1].z);
        if(i%2===0){seg.push(a[i].x,a[i].y,a[i].z,a[i].x,79,a[i].z);if(b[i].y>13)seg.push(b[i].x,b[i].y,b[i].z,b[i].x,12,b[i].z);}}}
    lines(seg,0x56636e);for(const s of[-1,1]){box(13,84,10,gran,X,40,c+s*(half+6));for(const k of[1,2,3])box(4,80-k*4,4,iron,X,40,c+s*(half+6+k*26));}}
  // Ponte da Arrábida
  {const X=-430,c=zcD(X),half=112;box(15,3,460,conc,X,73,c);for(const ox of[-5,5]){const a=[];for(let i=0;i<=20;i++){const t=i/10-1;a.push(V(X+ox,6+58*(1-t*t),c+t*half));}const tb=tube(a,2.2,conc);
      for(let i=1;i<20;i++){if(i>7&&i<13)continue;const p=a[i];box(1.6,72-p.y,1.6,conc,p.x,(72+p.y)/2,p.z);}}
    for(const s of[-1,1])box(13,74,9,conc,X,36,c+s*(half+4));}
  // Ponte do Infante, a montante
  {const X=830,c=zcD(X);box(11,3,330,M(0xe8e6e0,.7),X,74,c);const a=[];for(let i=0;i<=16;i++){const t=i/8-1;a.push(V(X,22+46*(1-t*t),c+t*120));}tube(a,1.6,M(0xe8e6e0,.7));}
  // Ribeira: casas altas e estreitas
  const RIB=[0xe6cf8e,0xc98a78,0xa9bfd0,0xf7f4ec,0xf1e3c4,0xb9c9b6,0xe2b596,0xdfe5e8,0xf7f4ec,0xe9dcc2];
  houses(scatter(430,()=>{const x=120+rnd()*700;if(Math.abs(x-520)<14)return null;const dist=6+Math.pow(rnd(),1.3)*150;const z=zcD(x)-wD(x)-dist;return {x,z,w:5+rnd()*2.5,d:8,h:11+rnd()*9,rot:riverAng(x),c:RIB[Math.floor(rnd()*RIB.length)],rh:2.4};}),tallTex);
  houses(scatter(1500,()=>{const x=-1050+rnd()*2200;const north=rnd()<.6;const dist=(north?150:190)+Math.pow(rnd(),1.3)*520;const z=zcD(x)+(north?-1:1)*(wD(x)+dist);if(x<-600&&rnd()<.5)return null;return {x,z,w:7+rnd()*6,d:7+rnd()*6,h:7+rnd()*9,rot:rnd(),c:PASTEL[Math.floor(rnd()*8)]};}));
  // Gaia: caves do vinho do Porto
  houses(scatter(170,()=>{const x=120+rnd()*380;const dist=26+rnd()*150;const z=zcD(x)+wD(x)+dist;return {x,z,w:9+rnd()*3,d:22+rnd()*10,h:5+rnd()*2,rot:riverAng(x)+Math.PI/2+(rnd()-.5)*.2,c:0xf2efe6,rh:3};}));
  // rabelos
  for(let i=0;i<9;i++){const x=230+i*30,z=zcD(x)+wD(x)-10-(i%2)*7,g=new THREE.Group(),dk=M(0x2e2118,.8);box(13,1.3,3.2,dk,0,.5,0,0,g);box(3,1.2,1.2,dk,-7,1.6,0,0,g).rotation.z=-.5;box(3,1.2,1.2,dk,7,1.4,0,0,g).rotation.z=.4;
    for(let b=0;b<3;b++){const br=cyl(.8,.8,1.8,M(0x6b4424,.8),-2+b*2,1.9,0,8,g);br.rotation.x=Math.PI/2;}cyl(.12,.12,8,dk,1,5,0,5,g);const sl=new THREE.Mesh(new THREE.PlaneGeometry(5.5,5),M(0xefe6d2,.9,0,{side:THREE.DoubleSide}));sl.position.set(1,6,0);sl.rotation.y=Math.PI/2;g.add(sl);
    g.position.set(x,0,z);g.rotation.y=riverAng(x);world.add(g);}
  // Clérigos, Sé e Serra do Pilar
  {const x=300,z=zcD(300)-wD(300)-330,y=H(x,z);box(9,62,9,gran,x,y+31,z);box(6.5,14,6.5,gran,x,y+69,z);const d=new THREE.Mesh(new THREE.SphereGeometry(3.6,10,8),gran);d.position.set(x,y+78,z);world.add(d);box(14,20,34,gran,x,y+10,z+22);}
  {const x=575,z=zcD(575)-wD(575)-150,y=H(x,z),m=M(0xa9a59b,.9);box(26,22,40,m,x,y+11,z);for(const s of[-9,9]){box(8,34,8,m,x+s,y+17,z+18);const d=new THREE.Mesh(new THREE.SphereGeometry(4,10,8,0,6.28,0,1.57),m);d.position.set(x+s,y+34,z+18);world.add(d);}box(60,20,18,M(0xf2efe8,.8),x-60,y+10,z+10);}
  {const x=560,z=zcD(560)+wD(560)+135,y=H(x,z),m=M(0xf4f1e8,.8);cyl(21,21,15,m,x,y+7.5,z,24);const d=new THREE.Mesh(new THREE.SphereGeometry(20,24,12,0,6.28,0,1.57),M(0xc9b28a,.7));d.scale.y=.6;d.position.set(x,y+15,z);world.add(d);box(40,10,16,m,x+38,y+5,z);}
  // foz: molhe e farol
  {const z=zcD(-1150)-wD(-1150)+20,gm=M(0x9a968c,.9);box(190,6,9,gm,-1215,1,z+40,.35);cyl(3.4,4.2,13,gm,-1300,10,z+72,6);cyl(2.2,2.2,4,M(0xc23a2e,.5),-1300,18.5,z+72,10);const cap=new THREE.Mesh(new THREE.ConeGeometry(2.6,2.4,10),M(0xc23a2e,.5));cap.position.set(-1300,21.7,z+72);world.add(cap);}
  trees(scatter(2200,()=>{const x=-1050+rnd()*2300;const north=rnd()<.5;const dist=25+rnd()*(x>100?420:300);if(x>100&&x<840&&dist<170)return null;const z=zcD(x)+(north?-1:1)*(wD(x)+dist);return {x,z,r:5+rnd()*6};}));
  clouds(6,i=>[-1500+i*500,340+rnd()*90,-1300-rnd()*400]);
}

function sailGeo(Hs,Lc,rows=12,cols=8){const pos=[],uv=[],idx=[],meta=[];
  for(let i=0;i<=rows;i++){const t=i/rows,chord=Lc*(1-t*.94);for(let j=0;j<=cols;j++){const s=j/cols;pos.push(-chord*s,t*Hs,0);uv.push(s*(1-t*.94),t);meta.push(s,chord,t);}}
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.userData.meta=meta;return g;}
// forma da vela em cada instante: barriga para sotavento, respiração com as rajadas e bater quando orça demais
function shapeSail(mesh,camber,t,luff,ph){const p=mesh.geometry.attributes.position,m=mesh.geometry.userData.meta;
  for(let i=0;i<p.count;i++){const s=m[i*3],chord=m[i*3+1],v=m[i*3+2];
    const belly=camber*Math.sin(Math.PI*s)*chord*(1+.14*Math.sin(t*1.6+v*3+ph));
    const flut=Math.sin(t*(7+luff*11)+v*9-s*6+ph)*chord*s*(.012+.085*luff)+Math.sin(t*3.1+v*5+ph)*chord*s*.012;
    p.array[i*3+2]=belly*(1-.6*luff)+flut;}
  p.needsUpdate=true;mesh.geometry.computeVertexNormals();}
function sailTex(hex,n){return canvasTex(256,512,(g)=>{g.fillStyle=hex;g.fillRect(0,0,256,512);g.strokeStyle='rgba(0,0,0,.13)';g.lineWidth=3;for(let y=40;y<512;y+=56){g.beginPath();g.moveTo(0,y);g.lineTo(256,y-30);g.stroke();}
  g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.arc(70,300,48,0,7);g.fill();g.fillStyle='#111';g.font='bold 70px Arial, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(n,70,304);});}
function makeSailboat(hex,n){
  const outer=new THREE.Group(),g=new THREE.Group();outer.add(g);
  const sh=new THREE.Shape();sh.moveTo(-4.6,-1.25);sh.lineTo(1.6,-1.45);sh.bezierCurveTo(3.6,-1.2,5.2,-.5,5.8,0);sh.bezierCurveTo(5.2,.5,3.6,1.2,1.6,1.45);sh.lineTo(-4.6,1.25);sh.closePath();
  const ext=(d,b)=>{const geo=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:24});geo.rotateX(-Math.PI/2);return geo;};
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
  add(ext(1.2,.25),M(0xf7f7f5,.25,.05),0,-.5,0);add(ext(.18,.27),M(hex,.35,.2),0,.35,0);add(ext(.05,.05),M(0xb98a54,.6),0,.95,0).scale.set(.95,1,.9);
  add(new THREE.BoxGeometry(2.6,.7,1.8),M(0xf2f2ef,.4),.4,1.35,0);add(new THREE.BoxGeometry(2.3,.25,1.85),M(0x1b2836,.15,.6),.4,1.4,0);
  const alu=M(0xd8dde2,.25,.9);add(new THREE.CylinderGeometry(.09,.14,15,8),alu,.9,8.4,0);
  const vane=add(new THREE.BoxGeometry(1.2,.12,.12),M(0xd0342c,.5),.9,16.1,0);
  const crew=new THREE.Group();for(let i=0;i<2;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,.9,8),M(i?0x1f4e8c:0xc23a2e,.8));b.position.set(-2.4-i*1.1,1.6,0);crew.add(b);const hd=new THREE.Mesh(new THREE.SphereGeometry(.24,8,6),M(0xe0b08a,.8));hd.position.set(-2.4-i*1.1,2.3,0);crew.add(hd);}g.add(crew);
  const rig=new THREE.Group();rig.position.set(.9,1.9,0);g.add(rig);const boom=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,5.6,6),alu);boom.rotation.z=Math.PI/2;boom.position.set(-2.8,0,0);rig.add(boom);
  const sail=new THREE.Mesh(sailGeo(13.4,5.6),new THREE.MeshStandardMaterial({map:sailTex('#'+new THREE.Color(hex).getHexString(),n),side:THREE.DoubleSide,roughness:.75}));sail.castShadow=true;rig.add(sail);
  const jibRig=new THREE.Group();jibRig.position.set(5.4,1.4,0);jibRig.rotation.z=.32;g.add(jibRig);const jib=new THREE.Mesh(sailGeo(12.6,3.6,10,6),M(0xf8f8f4,.8,0,{side:THREE.DoubleSide}));jib.castShadow=true;jibRig.add(jib);
  g.scale.setScalar(1.15);scene.add(outer);return {outer,rig,jibRig,sail,jib,vane,crew};
}
const MAXP=2600,pg=new THREE.BufferGeometry(),pPos=new Float32Array(MAXP*3),pA=new Float32Array(MAXP),pS=new Float32Array(MAXP),pV=new Float32Array(MAXP*3),pL=new Float32Array(MAXP),pT=new Uint8Array(MAXP);
pg.setAttribute('position',new THREE.BufferAttribute(pPos,3));pg.setAttribute('alpha',new THREE.BufferAttribute(pA,1));pg.setAttribute('psize',new THREE.BufferAttribute(pS,1));
const points=new THREE.Points(pg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  vertexShader:'attribute float alpha;attribute float psize;varying float vA;void main(){vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(psize*(300.0/-mv.z),40.0);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'varying float vA;void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.1,d)*vA;if(a<0.01)discard;gl_FragColor=vec4(0.96,0.98,1.0,a);}'}));
points.frustumCulled=false;scene.add(points);let pi=0;
function emit(x,y,z,vx,vy,vz,life,sz,type){const i=pi;pi=(pi+1)%MAXP;pPos.set([x,y,z],i*3);pV.set([vx,vy,vz],i*3);pL[i]=life;pS[i]=sz;pT[i]=type;pA[i]=1;}
function stepParticles(dt){for(let i=0;i<MAXP;i++){if(pL[i]<=0){pA[i]=0;continue;}pL[i]-=dt;pPos[i*3]+=pV[i*3]*dt;pPos[i*3+2]+=pV[i*3+2]*dt;
  if(pT[i]===0){pV[i*3+1]-=18*dt;pPos[i*3+1]+=pV[i*3+1]*dt;if(pPos[i*3+1]<0)pL[i]=0;pA[i]=Math.min(1,pL[i]*2)*.8;}else if(pT[i]===1){pS[i]+=dt*.45;pA[i]=Math.min(1,pL[i]/3)*.3;}else pA[i]=Math.min(1,pL[i])*Math.min(1,(2.5-pL[i])*2)*.26;}
  pg.attributes.position.needsUpdate=pg.attributes.alpha.needsUpdate=pg.attributes.psize.needsUpdate=true;}

/* ================= JOGO ================= */
const deg=THREE.MathUtils.degToRad, TAU=Math.PI*2;
const angDiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
function polar(twa){if(twa<0.61)return 0.05+0.51*(twa/0.61)**2;return 0.45+0.55*Math.sin((twa-0.61)/(Math.PI-0.61)*Math.PI*0.85+0.2);}
const idealSheet=twa=>clamp((twa/Math.PI)*1.25/1.23,0,1);

// trilho de motocross: da praia, pelo vale, até ao moinho no promontório
const TRAIL=new THREE.CatmullRomCurve3([[620,95],[760,90],[900,100],[965,150],[930,215],[840,205],[770,170],[700,200],[690,265],[600,270],[545,210],[555,130]].map(([x,d])=>V(x,0,zsF(x)-d)),true,'centripetal').getSpacedPoints(256).slice(0,256).map(p=>({x:p.x,z:p.z})),TN=TRAIL.length,TSTEP=Math.hypot(TRAIL[1].x-TRAIL[0].x,TRAIL[1].z-TRAIL[0].z),TW=i=>TRAIL[((i%TN)+TN)%TN];
TRAIL.forEach((p,i)=>{const a=TW(i-1),b=TW(i+1),l=Math.hypot(b.x-a.x,b.z-a.z);p.tx=(b.x-a.x)/l;p.tz=(b.z-a.z)/l;p.nx=-p.tz;p.nz=p.tx;});
// rampas: sobem 2,6 m em 9 m e caem em 3 m; ficam nos troços mais direitos
const RAMPS=[];for(let j=38;j<TN-30;j+=72){let k=j;while(k<j+30&&TRAIL[k].tx*TW(k+5).tx+TRAIL[k].tz*TW(k+5).tz<.985)k++;RAMPS.push(k);}
const rampProf=s=>s<=0||s>=12?0:s<9?2.6*s/9:2.6*(12-s)/3;
// twists: lombas seguidas, lama e tapetes de turbo
const WH=[88,91,94,97,100],MUD=[150,170],PADS=[18,128,205],whProf=s=>s<=0||s>=5?0:s<3.5?.9*s/3.5:.9*(5-s)/1.5;
function rampH(x,z){for(const j of RAMPS){const p=TRAIL[j],dx=x-p.x,dz=z-p.z;if(dx*dx+dz*dz>200)continue;const sd=dx*p.tx+dz*p.tz;if(sd>0&&sd<12&&Math.abs(dx*p.nx+dz*p.nz)<9)return rampProf(sd);}
  for(const j of WH){const p=TRAIL[j],dx=x-p.x,dz=z-p.z;if(dx*dx+dz*dz>180)continue;const sd=dx*p.tx+dz*p.tz;if(sd>0&&sd<5&&Math.abs(dx*p.nx+dz*p.nz)<12)return whProf(sd);}return 0;}
const GY=(x,z)=>HM(x,z)+.45+rampH(x,z);
function nearTrail(x,z,r){if(inMX(x,z)<1.08)return true;for(const p of TRAIL)if((p.x-x)**2+(p.z-z)**2<r*r)return true;return false;}
// altura da malha do terreno tal como é desenhada (triângulos), para a mota assentar no chão
const TG={w:5200,d:2500,cx:0,cz:-1150,sx:300,sz:150};
function HM(x,z){const cw=TG.w/TG.sx,cd=TG.d/TG.sz,x0=TG.cx-TG.w/2,z0=TG.cz-TG.d/2,gx=(x-x0)/cw,gz=(z-z0)/cd,ix=Math.floor(gx),iz=Math.floor(gz);if(ix<0||iz<0||ix>=TG.sx||iz>=TG.sz)return hF(x,z);
  const u=gx-ix,v=gz-iz,ha=hF(x0+ix*cw,z0+iz*cd),hb=hF(x0+ix*cw,z0+(iz+1)*cd),hc=hF(x0+(ix+1)*cw,z0+(iz+1)*cd),hd=hF(x0+(ix+1)*cw,z0+iz*cd);
  return u+v<=1?ha+u*(hd-ha)+v*(hb-ha):hc+(1-u)*(hb-hc)+(1-v)*(hd-hc);}
let cfg={mode:'sea',veh:'sail',lveh:'bike'};

// mundo: Baía do Funchal
H=hF;world=new THREE.Group();scene.add(world);const worldF=world;
terrain({terr:[5200,2500,0,-1150,300,150],h:hF,color(x,z,h,ny,c){const d=zsF(x)-z;if(inMX(x,z)<.95)c.set(0x8f7a55);else if(h<2.5)c.set(0x6f6a60);else if(ny<.74)c.set(0x6a5f52);else if(h>520)c.set(0x6f7a52);else if(d<430&&Math.abs(x)<1050)c.set(0x8a9274);else c.set(0x3f7436);}});
buildFunchal();
sunDir.setFromSphericalCoords(1,deg(70),deg(215));su.sunPosition.value.copy(sunDir);
water.material.uniforms.sunDirection.value.copy(sunDir);water.material.uniforms.waterColor.value.copy(lin(0x0b4f66));
scene.environment=pmrem.fromScene(sky).texture;scene.fog.color.set(0xc4d8e4);scene.fog.near=900;scene.fog.far=5600;

// trilho: faixa de terra batida, estacas e arcos
function arch(x,y,z,tx,tz,w){const tex=canvasTex(512,64,g=>{for(let i=0;i<32;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*16,j*16,16,16);}}),gt=new THREE.Group(),bm=new THREE.MeshStandardMaterial({map:tex}),k=M(0x111111);
  for(const s of[-1,1])cyl(.35,.45,13,M(0xff4d5e,.5),s*w/2,6.5,0,10,gt);const ban=new THREE.Mesh(new THREE.BoxGeometry(w,1.8,.3),[k,k,k,k,bm,bm]);ban.position.y=12.5;gt.add(ban);gt.position.set(x,y,z);gt.lookAt(x+tx,y,z+tz);world.add(gt);}
{const pos=[],uv=[],idx=[];TRAIL.forEach((p,i)=>{for(let k=-2;k<=2;k++){const x=p.x+p.nx*k*5.5,z=p.z+p.nz*k*5.5;pos.push(x,HM(x,z)+.45,z);uv.push((k+2)/2,i/3);}
    for(let k=0;k<4;k++){const q=i*5+k,r=((i+1)%TN)*5+k;idx.push(q,r,q+1,q+1,r,r+1);}});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const tex=groundTex.clone();tex.needsUpdate=true;const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:lin(0xa9824f),map:tex,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));m.receiveShadow=true;world.add(m);
  const n=Math.ceil(TN/4)*2,st=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.22,2.2,6),M(0xffffff,.6),n),mm=new THREE.Matrix4();let c=0;
  for(let i=0;i<TN;i+=4)for(const sd of[-1,1]){const p=TRAIL[i],x=p.x+p.nx*sd*12,z=p.z+p.nz*sd*12;mm.makeTranslation(x,HM(x,z)+1.1,z);st.setMatrixAt(c,mm);st.setColorAt(c,lin((i/4)%2?0xffffff:0xe8384f));c++;}
  st.count=c;world.add(st);
  for(const i of[3]){const p=TRAIL[i];arch(p.x,HM(p.x,p.z),p.z,p.tx,p.tz,25);}
  const rt=canvasTex(128,128,g=>{g.fillStyle='#ffd23f';g.fillRect(0,0,128,128);g.fillStyle='#1a1a1a';for(let i=-128;i<256;i+=48){g.beginPath();g.moveTo(i,128);g.lineTo(i+24,128);g.lineTo(i+88,0);g.lineTo(i+64,0);g.fill();}},true),rm=new THREE.MeshStandardMaterial({map:rt,roughness:.7,side:THREE.DoubleSide});
  for(const j of WH){const p=TRAIL[j],m=new THREE.Mesh(prism,M(0x8a6a3c,1));m.scale.set(5,.9,24);m.position.set(p.x+p.tx*2.5,HM(p.x,p.z)+.45,p.z+p.tz*2.5);m.rotation.y=Math.atan2(-p.tz,p.tx);m.receiveShadow=true;world.add(m);}
  {const pos=[],idx=[];for(let i=MUD[0];i<=MUD[1];i++){const p=TRAIL[i];for(const k of[-10,10]){const x=p.x+p.nx*k,z=p.z+p.nz*k;pos.push(x,HM(x,z)+.56,z);}if(i<MUD[1]){const q=(i-MUD[0])*2;idx.push(q,q+2,q+1,q+1,q+2,q+3);}}
    const g3=new THREE.BufferGeometry();g3.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g3.setIndex(idx);g3.computeVertexNormals();const mm=new THREE.Mesh(g3,M(0x3d2a17,.35,0,{side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5}));mm.receiveShadow=true;world.add(mm);}
  {const pt=canvasTex(64,64,g=>{g.fillStyle='#10202c';g.fillRect(0,0,64,64);g.fillStyle='#3fe0ff';for(const y of[4,26,48]){g.beginPath();g.moveTo(8,y+14);g.lineTo(32,y);g.lineTo(56,y+14);g.lineTo(56,y+20);g.lineTo(32,y+6);g.lineTo(8,y+20);g.fill();}}),pm=new THREE.MeshBasicMaterial({map:pt,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6});
    for(const j of PADS){const p=TRAIL[j],m=new THREE.Mesh(new THREE.PlaneGeometry(8,8),pm);m.rotation.set(-Math.PI/2,0,Math.atan2(-p.tz,p.tx)-Math.PI/2,'YXZ');m.rotation.order='YXZ';m.rotation.set(-Math.PI/2,Math.atan2(-p.tz,p.tx)-Math.PI/2,0);m.position.set(p.x,HM(p.x,p.z)+.6,p.z);world.add(m);}}
  {const p=TRAIL[10],cols=[0xd0342c,0xf2c230,0x2f6fd0,0xffffff];for(let k=0;k<4;k++){const o=-(22+k*5),x=p.x+p.nx*o+p.tx*30,z=p.z+p.nz*o+p.tz*30;box(110,3+k*2.5,5,M(cols[k],.8),x,HM(x,z)+(3+k*2.5)/2-1,z,Math.atan2(-p.tz,p.tx));}}
  for(const j of RAMPS){const p=TRAIL[j],v=[],uvs=[];for(const sd of[0,9,12])for(const l of[-9,9]){const x=p.x+p.tx*sd+p.nx*l,z=p.z+p.tz*sd+p.nz*l;v.push(x,HM(x,z)+.5+rampProf(sd===12?0:sd),z);uvs.push(l>0?2:0,sd/6);}
    const g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g2.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g2.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,2,4,1,3,5]);g2.computeVertexNormals();const rmesh=new THREE.Mesh(g2,rm);rmesh.castShadow=rmesh.receiveShadow=true;world.add(rmesh);}}

// obstáculos fora do terreno: molhe, ilhéu com forte, navio, marina
let COL=[];const addSeg=(cx,cz,len,ang,r)=>{const dx=Math.cos(ang),dz=-Math.sin(ang);for(let s=-len/2;s<=len/2;s+=r*.8)COL.push([cx+dx*s,cz+dz*s,r]);};
{const bx=-560,bz=zsF(-560)+20,ang=-.1;addSeg(bx+310,bz+48,640,ang,12);COL.push([bx,bz+30,40]);addSeg(bx+330,bz+20,270,ang,19);for(let i=0;i<42;i++)COL.push([bx+10+i*15,bz+60-i*1.5,7]);
 addSeg(250,zsF(250)+70,150,.05,6);addSeg(328,zsF(328)+36,70,Math.PI/2,6);}
const blocked=(x,z)=>H(x,z)>-1.5||COL.some(c=>(x-c[0])**2+(z-c[1])**2<c[2]*c[2]);const COLF=COL;

// percurso: 3 boias e a linha de partida/chegada
let MARKS=[V(420,0,-60),V(-250,0,-80),V(-300,0,300),V(700,0,150),V(-650,0,150),V(250,0,550),V(-50,0,-150)],GATE=V(60,0,260);const R_MARK=28,LET='ABCDEFG';
// cada volta tem o seu percurso; todas acabam na linha de partida/chegada
let LAPS=[[0,1,2],[3,5,4],[6,0,5]],LAPNAME=['Baía','Volta larga','Junto à cidade'];
const LANDPT=V(520,0,zsF(520)+24);
const route=l=>[...LAPS[l%LAPS.length].map(i=>MARKS[i]),cfg.mode==='both'&&l===laps-1?LANDPT:GATE],tgt=b=>route(b.lap)[Math.min(b.mark,route(b.lap).length-1)],markId=b=>LAPS[b.lap%LAPS.length][b.mark];
const numTex=n=>canvasTex(128,128,g=>{g.fillStyle='rgba(6,18,28,.75)';g.beginPath();g.arc(64,64,58,0,7);g.fill();g.fillStyle='#fff';g.font='bold 80px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(n,64,68);});
let markObjs=[];
function buildMarks(T){T.markObjs=T.MARKS.map((p,i)=>{const b=new THREE.Group();cyl(2.6,3.6,7,M(0xff6a1f,.4),0,1.5,0,16,b);cyl(3,3.1,1.2,M(0xffffff,.4),0,3.6,0,16,b);cyl(.15,.15,6,M(0x333333),0,8,0,6,b);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:numTex(LET[i]),depthTest:false}));sp.scale.set(9,9,1);sp.position.y=16;b.add(sp);b.position.copy(p);world.add(b);return b;});
  const tex=canvasTex(512,64,g=>{for(let i=0;i<32;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*16,j*16,16,16);}});const R=T.LAPS[0],t=T.GATE.clone().sub(T.MARKS[R[R.length-1]]).normalize(),gate=new THREE.Group(),bm=new THREE.MeshStandardMaterial({map:tex}),k=M(0x111111);
  for(const s of[-1,1])cyl(.6,.8,22,M(0xff4d5e,.5),s*25,11,0,10,gate);const ban=new THREE.Mesh(new THREE.BoxGeometry(50,3.4,.3),[k,k,k,k,bm,bm]);ban.position.y=21;gate.add(ban);gate.position.copy(T.GATE);gate.lookAt(T.GATE.clone().add(t));world.add(gate);}
const beacon=new THREE.Group();{const c=new THREE.Mesh(new THREE.CylinderGeometry(3,3,70,16,1,true),new THREE.MeshBasicMaterial({color:0xffe14a,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));c.position.y=35;beacon.add(c);
  const a=new THREE.Mesh(new THREE.ConeGeometry(3,6,12),new THREE.MeshBasicMaterial({color:0xffe14a}));a.rotation.x=Math.PI;a.name='arrow';beacon.add(a);scene.add(beacon);}

// vento: de nordeste, com rodas e rajadas iguais em todos os jogadores (dependem do tempo de corrida)
let W0=Math.atan2(1,1);const windFrom=V(1,0,0),windTo=V(-1,0,0);let wAng=W0,gust=1;
function setWind(t){wAng=W0+.1*Math.sin(t*.045)+.05*Math.sin(t*.13+1);gust=1+.15*Math.sin(t*.37)+.08*Math.sin(t*1.13+1);windFrom.set(Math.cos(wAng),0,-Math.sin(wAng));windTo.copy(windFrom).negate();}

/* ---------- mota de água, lancha e mota de motocross ---------- */
function makeMotor(hex,kind){const outer=new THREE.Group(),g=new THREE.Group();outer.add(g);
  const sh=new THREE.Shape();sh.moveTo(-4.6,-1.25);sh.lineTo(1.6,-1.45);sh.bezierCurveTo(3.6,-1.2,5.2,-.5,5.8,0);sh.bezierCurveTo(5.2,.5,3.6,1.2,1.6,1.45);sh.lineTo(-4.6,1.25);sh.closePath();
  const ext=(d,b)=>{const geo=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:16});geo.rotateX(-Math.PI/2);return geo;};
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;};
  const col=M(hex,.35,.2),wh=M(0xf7f7f5,.25,.05),dk=M(0x1b2836,.2,.6),skin=M(0xe0b08a,.8);
  const person=(x,y,z,c)=>{cyl(.28,.32,.9,M(c,.8),x,y,z,8,g);const hd=new THREE.Mesh(new THREE.SphereGeometry(.26,8,6),skin);hd.position.set(x,y+.72,z);g.add(hd);};
  if(kind==='jet'){add(ext(.8,.2),col,0,-.25,0).scale.set(.55,1,.62);add(ext(.25,.1),wh,0,.6,0).scale.set(.4,1,.4);box(1.7,.4,.7,dk,-.9,1,0,0,g);box(.5,.8,.6,col,.6,1.15,0,0,g);box(.1,.1,1.4,dk,.6,1.65,0,0,g);person(-.6,1.75,0,hex);}
  else{add(ext(1.3,.25),wh,0,-.5,0);add(ext(.2,.27),col,0,.45,0);add(ext(.05,.05),M(0xb98a54,.6),0,1,0).scale.set(.93,1,.88);box(.15,1,2.3,dk,1.3,1.6,0,0,g).rotation.z=.35;box(1.3,.6,2.1,col,-1.2,1.3,0,0,g);box(.8,1.6,.7,dk,-5.2,.9,0,0,g);person(.2,1.9,-.6,hex);person(.2,1.9,.6,0x1f4e8c);}
  g.scale.setScalar(1.15);scene.add(outer);return {outer};}
function makeBike(hex){const bike=new THREE.Group(),g=new THREE.Group();bike.add(g);const blk=M(0x1a1a1a,.8),col=M(hex,.4,.2),al=M(0xcfd4d8,.3,.8);
  const bw=[1.25,-1.15].map(x=>{const w=new THREE.Mesh(new THREE.TorusGeometry(.62,.2,8,16),blk);w.position.set(x,.82,0);w.castShadow=true;g.add(w);return w;});
  box(1.9,.5,.42,col,.05,1.5,0,0,g).rotation.z=.18;box(1,.3,.5,blk,-.55,1.85,0,0,g);box(.8,.2,.55,col,-1.25,1.75,0,0,g).rotation.z=-.25;box(.8,.2,.55,col,1.25,1.6,0,0,g).rotation.z=.2;
  box(.12,1.5,.12,al,1.05,1.5,0,0,g).rotation.z=-.4;box(.1,.1,1.3,blk,.72,2.25,0,0,g);box(.7,.6,.5,M(0x555555,.5,.6),0,1.1,0,0,g);
  const torso=cyl(.27,.3,1,M(hex,.8),-.35,2.5,0,8,g);torso.rotation.z=-.3;const hd=new THREE.Mesh(new THREE.SphereGeometry(.34,10,8),M(hex,.3,.3));hd.position.set(-.1,3.25,0);g.add(hd);box(.9,.14,.14,M(hex,.8),.25,2.55,.3,0,g);box(.9,.14,.14,M(hex,.8),.25,2.55,-.3,0,g);
  g.scale.setScalar(1.6);bike.visible=false;scene.add(bike);return {bike,bw};}

function makeBuggy(hex){const bike=new THREE.Group(),g=new THREE.Group();bike.add(g);const blk=M(0x1a1a1a,.8),col=M(hex,.4,.2),al=M(0x9aa3aa,.3,.8),bw=[];
  for(const x of[1.5,-1.4])for(const z of[-1.2,1.2]){const w=new THREE.Mesh(new THREE.TorusGeometry(.5,.27,8,14),blk);w.position.set(x,.77,z);w.castShadow=true;g.add(w);bw.push(w);}
  box(3.6,.35,1.8,col,0,.95,0,0,g);box(1.3,.45,1.6,col,1.3,1.3,0,0,g).rotation.z=-.25;box(.9,.6,1.4,M(0x555555,.5,.6),-1.4,1.4,0,0,g);box(.6,.5,.12,col,-1.9,2.3,0,0,g);
  for(const z of[-.8,.8]){box(.1,1.5,.1,al,.5,1.9,z,0,g).rotation.z=.35;box(.1,1.45,.1,al,-.9,1.85,z,0,g).rotation.z=-.2;box(1.6,.1,.1,al,-.15,2.6,z,0,g);}
  box(.1,.1,1.7,al,.6,2.6,0,0,g);box(.1,.1,1.7,al,-.9,2.6,0,0,g);cyl(.27,.3,.9,M(hex,.8),-.3,1.7,0,8,g);const hd=new THREE.Mesh(new THREE.SphereGeometry(.32,10,8),M(hex,.3,.3));hd.position.set(-.3,2.35,0);g.add(hd);
  g.scale.setScalar(1.5);bike.visible=false;scene.add(bike);return {bike,bw};}

/* ---------- barcos ---------- */
const MAXB=15,COLORS=[0xffc928,0xe8384f,0x22b37a,0x6a55f0,0xff8a1f,0x1fa3e8,0xf05ac8,0x8bd13a,0x8a5a3a,0xffffff,0x1d2b3a,0x3fd6c6,0xb39ddb,0xc0392b,0x9e9e2e],BASE=24,KN=9.5/BASE;
const lbBox=document.getElementById('labels');let boats=[],me=null,laps=2;
function addBoat(p){const b=Object.assign(cfg.veh==='sail'?makeSailboat(COLORS[p.slot],String(p.slot+1)):makeMotor(COLORS[p.slot],cfg.veh),cfg.mode==='hide'?makeMan():cfg.mode!=='sea'?(cfg.lveh==='buggy'?makeBuggy:makeBike)(COLORS[p.slot]):{},{land:0,ti:0,tp:0,ll:0,y:0,vy:0,gy0:0,air:false,lean:0,pitch:0,rudIn:0,id:p.id,name:p.name,slot:p.slot,bot:!!p.bot,hex:COLORS[p.slot],x:0,z:0,hd:0,v:0,s:.3,mark:0,lap:0,fin:null,lee:1,luff:0,eff:0,twa:0,tx:0,tz:0,thd:0,seen:false,skill:p.bot?.88+Math.random()*.07:1,tack:1,fwd:V(1,0,0)});
  b.lb=document.createElement('div');b.lb.className='nm'+(p.id===myId?' me':'');b.lb.textContent=p.name;lbBox.appendChild(b.lb);boats.push(b);return b;}
function removeBoat(id){const b=boats.find(x=>x.id===id);if(!b)return;scene.remove(b.outer);if(b.bike)scene.remove(b.bike);if(b.man)scene.remove(b.man);b.lb.remove();boats=boats.filter(x=>x!==b);}
function clearBoats(){capQ.length=0;boats.slice().forEach(b=>removeBoat(b.id));me=null;}
const progress=b=>{if(b.fin!=null)return 1e9-b.fin;if(b.land)return 1e6+b.tp*10;const t=tgt(b);return (b.lap*10+b.mark)*1e4-Math.hypot(t.x-b.x,t.z-b.z);};

function physics(b,dt,rud,inp,drift){ // inp: vela (+ folga, - caça) ou acelerador (- acelera, + trava)
  if(b.foot){footPhysics(b,dt,rud,inp);return;}
  for(const k of['boost','fav','stun'])if(b[k]>0)b[k]-=dt;
  if(b.land){landPhysics(b,dt,rud,inp,drift);return;}
  const fx=Math.cos(b.hd),fz=-Math.sin(b.hd),twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1)),ideal=idealSheet(twa);b.twa=twa;b.ideal=ideal;
  let target,acc,turn,drag=.12;
  if(cfg.veh==='sail'){
    if(b.bot)b.s+=(ideal-b.s)*Math.min(1,dt*2);else b.s=clamp(b.s+inp*dt*.55,0,1);
    const err=Math.abs(b.s-ideal),trim=twa<.61?1:Math.max(.3,1-(err/.38)**2);b.eff=polar(twa)*trim;if(b.fav>0)b.eff=Math.max(b.eff,.95);
    target=b.fin!=null?0:BASE*b.eff*gust*b.skill;acc=target>b.v?.45:.8;turn=.25+.55*Math.min(1,b.v/12);
  }else{const jet=cfg.veh==='jet',top=BASE*(jet?1.12:1.3),thr=b.fin!=null?0:b.bot?1:inp<0?1:inp>0?-1:0;b.s=.3;
    target=thr>0?top*b.skill*(b.fav>0?1.15:1):0;acc=thr>0?(jet?.9:.5):thr<0?1.5:.3;turn=(jet?1.05:.6)*Math.min(1,.3+b.v/10);drag=jet?.05:.1;b.eff=b.v/top;}
  if(b.boost>0){target=Math.max(target,BASE*1.35)*(cfg.veh==='sail'?1:1.2);acc=2.5;}
  if(b.stun>0){target=BASE*.08;acc=3;rud=0;b.hd+=7*dt;}
  b.rudIn=rud;b.v+=(target-b.v)*Math.min(1,dt*acc);b.v*=1-Math.abs(rud)*drag*dt;
  b.hd+=turn*rud*dt;
  const nx=b.x+fx*b.v*dt,nz=b.z+fz*b.v*dt;
  if(blocked(nx,nz)){b.v*=.2;b.x-=fx*1.2;b.z-=fz*1.2;if(b===me)toast('Cuidado com a costa!');}else{b.x=nx;b.z=nz;}
  if(TK.cur){const c=TK.cur(b.x,b.z),cx=b.x+c[0]*dt,cz=b.z+c[1]*dt;if(!blocked(cx,cz)){b.x=cx;b.z=cz;}}
  for(const m of TK.mov){const dx=b.x-m.x,dz=b.z-m.z,d=Math.hypot(dx,dz);if(d<TK.movR&&d>.01){b.x=m.x+dx/d*TK.movR;b.z=m.z+dz/d*TK.movR;b.v*=.9;if(b===me)toast('Cuidado com '+TK.movName+'!');}}
  for(const o of boats){if(o===b||o.land)continue;const dx=b.x-o.x,dz=b.z-o.z,d=Math.hypot(dx,dz);if(d<8&&d>.01){b.x+=dx/d*(8-d)*.5;b.z+=dz/d*(8-d)*.5;b.v*=.98;}}
  if(b.fin==null){const t=tgt(b),NM=route(b.lap).length;if((b.x-t.x)**2+(b.z-t.z)**2<R_MARK*R_MARK){
    if(b.mark===NM-1){if(cfg.mode==='both'&&b.lap===laps-1){enterLand(b);if(b===me)toast('Agora em terra! Duas voltas à pista de motocross',3);}
      else{b.lap++;if(b.lap>=laps){b.fin=raceT;if(b===me)onFinish();}else{b.mark=0;if(b===me)toast('Volta '+(b.lap+1)+' de '+laps+': '+LAPNAME[b.lap%LAPS.length]);}}}
    else{if(b===me)toast('Boia '+LET[markId(b)]+' ✓');b.mark++;}}}
}
function enterLand(b,i){const p=TRAIL[i||0];b.land=1;b.on=true;b.ti=b.tp=i||0;b.ll=0;b.v=0;b.x=p.x;b.z=p.z;b.hd=b.va=Math.atan2(-p.tz,p.tx);b.y=b.gy0=GY(p.x,p.z);b.vy=0;b.tx=b.x;b.tz=b.z;b.thd=b.hd;}
function landPhysics(b,dt,rud,inp,drift){
  if(dt<=0)return;
  let bi=0,bd=1e9;for(let j=-8;j<=8;j++){const p=TW(b.ti+j),d=(p.x-b.x)**2+(p.z-b.z)**2;if(d<bd){bd=d;bi=j;}}
  bd=Math.sqrt(bd);if(bd<34){b.ti=((b.ti+bi)%TN+TN)%TN;b.tp+=bi;}const on=bd<12.5;b.on=on;
  const thr=b.fin!=null?0:b.bot?1:inp<0?1:inp>0?-1:0,fx=Math.cos(b.hd),fz=-Math.sin(b.hd),grade=(HM(b.x+fx*2,b.z+fz*2)-HM(b.x,b.z))/2;
  const bg=cfg.lveh==='buggy';let top=(on?(bg?31:34):(bg?21:13))*b.skill*(1-clamp(grade*.9,-.15,.45)),acc=thr>0?1.1:thr<0?2.5:.5,target=thr>0?top:0;
  const mud=on&&b.ti>=MUD[0]&&b.ti<=MUD[1];b.mud=mud;if(mud)top*=.62;if(mud&&thr>0)target=top;
  if(on&&!b.air&&PADS.includes(b.ti)&&b.fin==null){if(!(b.boost>.9)&&b===me)toast('Turbo!',1);b.boost=1.3;}
  if(b.air&&drift&&!b.bot)b.flip=Math.min(TAU,(b.flip||0)+dt*7.5);
  else if(!b.air&&b.flip){if(b.flip>5.3){b.boost=1.6;if(b===me)toast('Mortal completo! Turbo',1.5);}else if(b.flip>1.2){b.stun=.9;if(b===me)toast('Caíste do mortal!',1.5);}b.flip=0;}
  if(b.boost>0||b.fav>0){target=Math.max(target,on?44:20);acc=2.5;}
  if(b.stun>0){target=2;acc=3;rud=0;b.hd+=7*dt;}
  b.rudIn=rud;const dr=drift&&b.v>8&&!b.air,slip=angDiff(b.hd,b.va);b.slip=slip;b.dr=dr;
  if(!b.air){b.v+=(target-b.v)*Math.min(1,dt*acc);b.v*=1-Math.min(1,Math.abs(slip))*(dr?.3:.6)*dt;
    b.hd+=rud*(bg?1.3:1.6)*(dr?1.7:1)*(1-.44*Math.min(1,b.v/34))*Math.min(1,.3+b.v/4)*dt;b.va+=slip*Math.min(1,dt*(dr?1.4:mud?1.8:bg?5:7));}
  const mx=Math.cos(b.va),mz=-Math.sin(b.va),nx=b.x+mx*b.v*dt,nz=b.z+mz*b.v*dt;if(hF(nx,nz)<.3){b.v=0;b.x-=mx*.5;b.z-=mz*.5;}else{b.x=nx;b.z=nz;}
  for(const o of boats){if(o===b||!o.land)continue;const dx=b.x-o.x,dz=b.z-o.z,d=Math.hypot(dx,dz);const cr=bg?4.5:3;if(d<cr&&d>.01){b.x+=dx/d*(cr-d)*.5;b.z+=dz/d*(cr-d)*.5;}}
  const gy=GY(b.x,b.z);b.vy-=32*dt;b.y+=b.vy*dt;if(b.y<=gy){b.y=gy;b.vy=clamp((gy-b.gy0)/dt,-40,16);}b.air=b.y>gy+.35;b.gy0=gy;
  if(b.fin==null){
    if(b.tp>=(b.ll+1)*TN+3){b.ll++;const need=cfg.mode==='both'?2:laps;if(b.ll>=need){b.fin=raceT;if(b===me)onFinish();}else{b.lap=b.ll;if(b===me)toast('Volta '+(b.ll+1)+' de '+laps);}}}
}
function botCtl(b){if(b.foot)return 0;if(b.land){const p=TW(b.ti+5),o=(b.slot%5-2)*2.6;return clamp(angDiff(Math.atan2(-(p.z+p.nz*o-b.z),p.x+p.nx*o-b.x),b.hd)*3,-1,1);}
  const t=tgt(b),tb=Math.atan2(-(t.z-b.z),t.x-b.x),d=angDiff(tb,wAng);let want;
  if(cfg.veh!=='sail'||Math.abs(d)>.85)want=tb;else{if(Math.abs(d)>.3)b.tack=Math.sign(d);want=wAng+b.tack*.82;
    if(blocked(b.x+Math.cos(want)*45,b.z-Math.sin(want)*45)){b.tack=-b.tack;want=wAng+b.tack*.82;}}
  return clamp(angDiff(want,b.hd)*2.5,-1,1);}
function visualLand(b,dt){const o=b.bike,fx=Math.cos(b.hd),fz=-Math.sin(b.hd);o.visible=true;
  if(b.remote){b.y=GY(b.x,b.z);b.rudIn=clamp(angDiff(b.thd,b.hd)*4,-1,1);}
  if(!b.air)b.pitch+=(Math.atan2(HM(b.x+fx*1.6,b.z+fz*1.6)-HM(b.x-fx*1.6,b.z-fz*1.6),3.2)-b.pitch)*Math.min(1,dt*10||1);
  b.lean+=(-b.rudIn*(cfg.lveh==='buggy'?.07:.4)*Math.min(1,b.v/15)-b.lean)*Math.min(1,dt*6);
  o.position.set(b.x,b.y,b.z);o.rotation.set(0,b.hd,0);o.rotateZ(b.pitch+(b.flip||0));o.rotateX(b.lean);b.bw.forEach(w=>w.rotation.z-=b.v*dt);b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce&&!b.air&&b.v>6)for(let j=Math.abs(b.slip||0)>.15?4:Math.random()<.6?1:0;j>0;j--)emit(b.x-fx*2.5,b.y+.4,b.z-fz*2.5,-fx*3+(Math.random()-.5)*4,0,-fz*3+(Math.random()-.5)*4,1.6,1.1,1);}
function visualMotor(b,dt){const o=b.outer,fx=Math.cos(b.hd),fz=-Math.sin(b.hd),k=Math.min(1,b.v/(BASE*1.2));
  if(b.remote){b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.eff=k;b.rudIn=clamp(angDiff(b.thd,b.hd)*4,-1,1);}
  b.lean+=(-b.rudIn*.35*k-b.lean)*Math.min(1,dt*5);
  o.position.set(b.x,.25+Math.sin(T*2.2+b.slot)*.12+k*.3,b.z);o.rotation.set(0,b.hd,0);o.rotateZ(k*.1);o.rotateX(b.lean);b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce&&k>.08){const sx=-fz,sz=fx;for(let j=0;j<2;j++){const sd=j?1:-1;if(Math.random()<k)emit(b.x+fx*3+sx*sd,.3,b.z+fz*3+sz*sd,sx*sd*(5+Math.random()*5),3+Math.random()*4*k,sz*sd*(5+Math.random()*5),.7,.5,0);emit(b.x-fx*5+sx*sd*.8,.12,b.z-fz*5+sz*sd*.8,sx*sd*2,0,sz*sd*2,4,.9,1);}
    if(b.boost>0)for(let j=0;j<4;j++)emit(b.x-fx*5,.5,b.z-fz*5,-fx*10+(Math.random()-.5)*6,4+Math.random()*5,-fz*10+(Math.random()-.5)*6,.8,.7,0);}}
function visual(b,dt){
  if(b.foot){visualFoot(b,dt);return;}
  if(b.land){visualLand(b,dt);return;}
  if(cfg.veh!=='sail'){visualMotor(b,dt);return;}
  const fx=Math.cos(b.hd),fz=-Math.sin(b.hd);if(b.remote){b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.ideal=idealSheet(b.twa);b.eff=b.v/BASE;}
  const cross=fx*windTo.z-fz*windTo.x,leeT=cross>0?-1:1;b.lee+=(leeT-b.lee)*Math.min(1,dt*2.5||1);
  const luffT=Math.max(b.twa<.7?1:0,clamp((b.s-b.ideal-.15)*3,0,1));b.luff+=(luffT-b.luff)*Math.min(1,dt*2||1);
  const o=b.outer,heel=b.lee*(.07+.3*Math.min(1,b.eff)*Math.sin(b.twa))*gust;
  o.position.set(b.x,.2+Math.sin(T*2.2+b.slot)*.14,b.z);o.rotation.set(0,b.hd,0);o.rotateX(-heel);o.rotateZ(Math.sin(T*1.7+b.slot)*.035);
  const sheet=.12+b.s*1.23;b.rig.rotation.y=-b.lee*sheet;b.jibRig.rotation.y=-b.lee*sheet*.75;
  shapeSail(b.sail,-b.lee*.11*gust,T,b.luff,b.slot);shapeSail(b.jib,-b.lee*.1*gust,T,b.luff,b.slot+2);
  b.vane.rotation.y=Math.atan2(-windTo.z,windTo.x)-b.hd;b.crew.position.z=b.lee*-.95;b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce){const f=b.fwd,sx=-f.z,sz=f.x,bow=o.position.clone().addScaledVector(f,6),st=o.position.clone().addScaledVector(f,-5),k=b.v/BASE;
    if(b.boost>0)for(let j=0;j<4;j++)emit(st.x+(Math.random()-.5)*3,.5,st.z+(Math.random()-.5)*3,-f.x*10+(Math.random()-.5)*6,4+Math.random()*5,-f.z*10+(Math.random()-.5)*6,.8,.7,0);
    if(Math.random()<k)for(let j=0;j<2;j++){const s=j?1:-1;emit(bow.x+sx*s*1.2,.3,bow.z+sz*s*1.2,sx*s*(4+Math.random()*4)+f.x*3,3+Math.random()*3*k,sz*s*(4+Math.random()*4)+f.z*3,.7,.4+Math.random()*.3,0);}
    if(k>.05)for(let j=0;j<2;j++){const s=j?1:-1;emit(st.x+sx*s*.9,.12,st.z+sz*s*.9,sx*s*1.6,0,sz*s*1.6,4,.7,1);}}
}

/* ---------- objetos: caixas na água com turbo, vento de feição, balão de água e algas ---------- */
const ITEMS={boost:{ic:'🚀',nm:'Turbo'},fav:{ic:'🌬️',nm:'Vento de feição'},ball:{ic:'💧',nm:'Balão de água'},weed:{ic:'🌿',nm:'Algas'}};
let itemsOn=true,boxes=[],mines=[],shots=[],mineSeq=0;
const boxTex=canvasTex(128,128,g=>{const gr=g.createLinearGradient(0,0,128,128);gr.addColorStop(0,'#ffd23f');gr.addColorStop(.5,'#ff5fa2');gr.addColorStop(1,'#4ac6ff');g.fillStyle=gr;g.fillRect(0,0,128,128);g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=8;g.strokeRect(6,6,116,116);g.fillStyle='#fff';g.font='bold 84px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('?',64,70);});
const boxGeo=new THREE.BoxGeometry(4,4,4),boxMat=new THREE.MeshStandardMaterial({map:boxTex,emissive:0xffffff,emissiveMap:boxTex,emissiveIntensity:.35,transparent:true,opacity:.92,roughness:.4});
{ for(const j of RAMPS.filter((_,i)=>i%2===0)){const p=TW(j+22);for(const o of[-7,0,7]){const x=p.x+p.nx*o,z=p.z+p.nz*o,y=HM(x,z)+3,m=new THREE.Mesh(boxGeo,boxMat);m.scale.setScalar(.7);m.position.set(x,y,z);scene.add(m);boxes.push({m,x,z,y,land:1,t:0});}}}
const weedMat=M(0x2f5a1c,.95),ballMat=M(0x3fb6ff,.2,0,{transparent:true,opacity:.85});
function rollItem(b){const ord=[...boats].sort((a,c)=>progress(c)-progress(a)),r=boats.length>1?ord.indexOf(b)/(boats.length-1):.5;
  const w=[['boost',.2+.35*r],['fav',.15+.2*r],['ball',.3],['weed',.35-.25*r]];let s=Math.random()*w.reduce((a,x)=>a+x[1],0);for(const [k,v] of w){if((s-=v)<=0)return k;}return 'boost';}
function stepItems(dt){
  if(!itemsOn)return;
  for(const bx of boxes){if(bx.land?cfg.mode==='sea':cfg.mode==='land')continue;if(bx.t>0){bx.t-=dt;bx.m.visible=bx.t<=0;continue;}bx.m.rotation.y+=dt*1.5;bx.m.rotation.x=Math.sin(T+bx.x)*.3;bx.m.position.y=bx.y+Math.sin(T*2+bx.z)*.5;
    for(const b of boats){if(b.fin!=null||!b.land!==!bx.land||(b.x-bx.x)**2+(b.z-bx.z)**2>(bx.land?20:49))continue;bx.t=6;bx.m.visible=false;
      if(!b.remote&&!b.item){b.item=rollItem(b);b.useAt=raceT+1+Math.random()*3;if(b===me)toast('Apanhaste: '+ITEMS[b.item].ic+' '+ITEMS[b.item].nm);}break;}}
  for(const m of mines){m.o.rotation.y+=dt*.3;for(const b of boats){if(b.remote||b.stun>0||m.by===b.id&&m.age<2)continue;if((b.x-m.x)**2+(b.z-m.z)**2<64){hitBoat(b,'algas');sendEv({k:'gone',id:m.id});removeMine(m.id);break;}}m.age+=dt;}
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.t+=dt/.7;const a=s.from,b=s.to;if(!a||!b||s.t>=1){if(b){for(let j=0;j<24;j++)emit(b.x,1.5,b.z,(Math.random()-.5)*14,4+Math.random()*8,(Math.random()-.5)*14,.9,.6,0);}scene.remove(s.o);shots.splice(i,1);continue;}
    s.o.position.set(a.x+(b.x-a.x)*s.t,(a.land?a.y:0)*(1-s.t)+(b.land?b.y:0)*s.t+4+Math.sin(s.t*Math.PI)*22,a.z+(b.z-a.z)*s.t);}
  for(const b of boats){if(b.remote||!b.item||b.fin!=null)continue;if(b.bot&&raceT>b.useAt)useItem(b);}
}
function useItem(b){const k=b.item;if(!k)return;
  if(k==='ball'){const tg=pickTarget(b);if(!tg){if(b===me)toast('Ninguém à frente para acertar');else b.useAt=raceT+2;return;}b.item=null;fireBall(b,tg);sendEv({k:'ball',by:b.id,to:tg.id});}
  else if(k==='weed'){b.item=null;const id=myId+'-'+(mineSeq++),x=b.x-b.fwd.x*10,z=b.z-b.fwd.z*10;addMine(id,x,z,b.id);sendEv({k:'weed',id,x,z,by:b.id});}
  else{b.item=null;b[k]=k==='boost'?3:6;}
  if(b===me&&!b.item)toast(ITEMS[k].ic+' '+ITEMS[k].nm+'!');}
function pickTarget(b){let best=null,bd=1e9;for(const o of boats){if(o===b||o.fin!=null)continue;const dx=o.x-b.x,dz=o.z-b.z,d=Math.hypot(dx,dz);if(d>160||d<4)continue;if((dx*b.fwd.x+dz*b.fwd.z)/d<.5)continue;if(d<bd){bd=d;best=o;}}
  if(!best){const ord=[...boats].sort((a,c)=>progress(c)-progress(a)),i=ord.indexOf(b);if(i>0&&Math.hypot(ord[i-1].x-b.x,ord[i-1].z-b.z)<220)best=ord[i-1];}return best;}
function fireBall(a,t){const o=new THREE.Mesh(new THREE.SphereGeometry(1.4,12,10),ballMat);scene.add(o);shots.push({o,from:a,to:t,t:0});
  if(!t.remote)setTimeout(()=>{if(racing&&boats.includes(t))hitBoat(t,a.name);},700);}
function hitBoat(b,by){b.stun=1.6;b.boost=0;if(b===me)toast(by==='algas'?'Ficaste preso nas algas!':/^(um|uma|o) /.test(by)?'Atacado por '+by+'!':'Atingido por '+by+'!',2);}
function addMine(id,x,z,by){const o=new THREE.Group();const d=new THREE.Mesh(new THREE.CylinderGeometry(6,6,.3,18),weedMat);o.add(d);for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(.5,3+Math.random()*2,5),weedMat);s.position.set((Math.random()-.5)*8,1.5,(Math.random()-.5)*8);o.add(s);}
  o.position.set(x,hF(x,z)>0?HM(x,z)+.6:.1,z);scene.add(o);mines.push({id,x,z,by,o,age:0});}
function removeMine(id){const m=mines.find(x=>x.id===id);if(!m)return;scene.remove(m.o);mines=mines.filter(x=>x!==m);}
function clearItems(){mines.slice().forEach(m=>removeMine(m.id));shots.forEach(s=>scene.remove(s.o));shots=[];boxes.forEach(b=>{b.t=0;b.m.visible=itemsOn&&(b.land?cfg.mode!=='sea':cfg.mode!=='land');});}
function onEv(e){if(!racing)return;const by=boats.find(b=>b.id===e.by);
  if(e.k==='ball'){const t=boats.find(b=>b.id===e.to);if(by&&t)fireBall(by,t);}
  else if(e.k==='weed'){if(!mines.some(m=>m.id===e.id))addMine(e.id,e.x,e.z,e.by);}
  else if(e.k==='gone')removeMine(e.id);
  else if(e.k==='tex'){if(by&&by.ctx&&by!==me&&typeof e.d==='string'&&e.d.length<60000&&e.d.startsWith('data:image/png;base64,')){const im=new Image();im.onload=()=>{if(by.role)return;by.ctx.drawImage(im,0,0,48,80);by.tex.needsUpdate=true;by.hasTex=true;setUnlit(by,e.u);};im.src=e.d;}}
  else if(e.k==='tag')onTag(e);}
function sendEv(e,except){if(solo)return;const m={t:'ev',e};if(isHost)conns.forEach(c=>{if(c!==except&&c.open)c.send(m);});else if(hostConn&&hostConn.open)hostConn.send(m);}

function seaBoxes(){boxes.filter(b=>!b.land).forEach(b=>scene.remove(b.m));boxes=boxes.filter(b=>b.land);const legs=new Set();LAPS.forEach((L,li)=>{const r=route(li),from=[li?GATE:GATE,...r];for(let i=0;i<r.length;i++){const a=from[i],b=r[i],k=[a.x,a.z,b.x,b.z].join();if(legs.has(k))continue;legs.add(k);
  const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),px=-dz/l,pz=dx/l;
  for(const o of[-18,0,18]){const x=mx+px*o,z=mz+pz*o;if(blocked(x,z))continue;const m=new THREE.Mesh(boxGeo,boxMat);m.position.set(x,2.5,z);m.castShadow=true;scene.add(m);boxes.push({m,x,z,y:2.5,t:0});}}});}
seaBoxes();
/* ---------- pistas: Funchal, Tejo e Douro ---------- */
const zcp=x=>110/430*Math.cos(x/430+.4);
const TRK={
 funchal:{name:'Baía do Funchal',world:worldF,h:hF,COL:COLF,MARKS,GATE,LAPS,LAPNAME,W0,wl:'NE',wk:18,sun:[70,215],fog:[0xc4d8e4,900,5600],wc:0x0b4f66,cur:null,mov:[]},
 tejo:{name:'Rio Tejo',h:hT,terr:[2900,1750,0,-150,290,175],build:buildTejo,wl:'NO',wk:16,W0:Math.atan2(1,-1),sun:[66,205],fog:[0xcbd9e2,1100,6000],wc:0x2c4f4a,MX:[-1000,900],mzc:50,
  color(x,z,h,ny,c){const dn=-200-z;if(dn>0){if(h<5)c.set(0xc9c2b0);else if(x<-200&&dn>430)c.set(0x3f6f38);else c.set(0x9c9a88);}else{if(h<1)c.set(0x8a7f68);else if(ny<.8)c.set(0xa38a63);else c.set(0x6f8a4a);}},
  MARKS:[V(-480,0,110),V(-150,0,30),V(250,0,-70),V(650,0,-60),V(450,0,190),V(-520,0,-60)],GATE:V(-800,0,40),LAPS:[[1,3,4,1],[0,1,2,4,1],[5,1,2,1]],LAPNAME:['Terreiro do Paço','Margem sul','Belém'],
  COL:[[-150,-110,15],[-150,170,15],[320,170,19]],
  cur:(x,z)=>[-2.2*clamp(1-((z-50)/240)**2,0,1),0],
  mov:[{x0:120,ph:0},{x0:430,ph:2.4}],movAt(m,t){const a=t*.05+m.ph;m.x=m.x0;m.z=50+175*Math.sin(a);m.ry=Math.cos(a)>0?-Math.PI/2:Math.PI/2;},movR:20,movName:'um cacilheiro'},
 douro:{name:'Rio Douro',h:hD,terr:[2900,1600,-100,0,290,160],build:buildDouro,wl:'O',wk:15,W0:Math.atan2(.2,-1),sun:[68,195],fog:[0xcfdbe2,900,5200],wc:0x1f423a,MX:[-1300,800],mzc:0,
  color(x,z,h,ny,c){const dist=Math.abs(z-zcD(x))-wD(x);if(x<-1000&&h<5)c.set(0xd9c9a0);else if(h<4.5)c.set(0x9a958a);else if(ny<.76)c.set(0x77736b);else if(dist>170&&x>-700)c.set(0x8f927e);else c.set(0x55784a);},
  MARKS:[250,-150,-470,-820].map(x=>V(x,0,zcD(x))),GATE:V(640,0,zcD(640)),LAPS:[[0,1,2,3,2,1,0],[0,1,2,1,0]],LAPNAME:['Até à Foz','Arrábida e volta'],
  COL:Array.from({length:9},(_,i)=>{const x=230+i*30;return [x,zcD(x)+wD(x)-10-(i%2)*7,9];}),
  cur:(x,z)=>{const k=2.6*clamp(1-((z-zcD(x))/wD(x))**2,0,1)*(1-sm(-x,700,1100)*.7),sl=zcp(x),l=Math.hypot(1,sl);return [-k/l,-k*sl/l];},mov:[]}};
let trk='funchal',TK=TRK.funchal;TK.markObjs=[];buildMarks(TK);markObjs=TK.markObjs;
function makeFerry(){const g=new THREE.Group();box(34,5,10,M(0xf2f2ee,.5),0,2.5,0,0,g);box(26,4,8,M(0xe8892b,.5),0,7,0,0,g);box(8,3,6,M(0xf2f2ee,.5),6,10.5,0,0,g);world.add(g);return g;}
function mapBg(T){const c=document.createElement('canvas'),w=c.width=mapC.width,h=c.height=mapC.height,g=c.getContext('2d'),hz=(T.MX[1]-T.MX[0])*h/w/2;T.MZ=[T.mzc-hz,T.mzc+hz];
  g.fillStyle='rgba(11,79,102,.55)';g.fillRect(0,0,w,h);g.fillStyle='rgba(70,110,60,.9)';const n=3;for(let i=0;i<w;i+=n)for(let j=0;j<h;j+=n)if(T.h(T.MX[0]+(i+n/2)/w*(T.MX[1]-T.MX[0]),T.MZ[0]+(j+n/2)/h*(T.MZ[1]-T.MZ[0]))>-1.5)g.fillRect(i,j,n,n);T.bg=c;}
function setTrack(k){if(!TRK[k])k='funchal';if(k===trk)return;TK.world.visible=false;trk=k;const T=TK=TRK[k];H=T.h;
  if(!T.world){world=T.world=new THREE.Group();scene.add(world);seed=11;terrain({terr:T.terr,h:T.h,color:T.color});T.build();buildMarks(T);T.mov.forEach(m=>m.g=makeFerry());mapBg(T);}
  world=T.world;world.visible=true;MARKS=T.MARKS;GATE=T.GATE;LAPS=T.LAPS;LAPNAME=T.LAPNAME;COL=T.COL;W0=T.W0;markObjs=T.markObjs;
  sunDir.setFromSphericalCoords(1,deg(T.sun[0]),deg(T.sun[1]));su.sunPosition.value.copy(sunDir);water.material.uniforms.sunDirection.value.copy(sunDir);water.material.uniforms.waterColor.value.copy(lin(T.wc));
  if(envRT)envRT.dispose();envRT=pmrem.fromScene(sky);scene.environment=envRT.texture;scene.fog.color.set(T.fog[0]);scene.fog.near=T.fog[1];scene.fog.far=T.fog[2];seaBoxes();}
function stepMov(t){for(const m of TK.mov){TK.movAt(m,t);m.g.position.set(m.x,Math.sin(t*1.2+m.ph)*.25,m.z);m.g.rotation.y=m.ry;}}

/* ---------- animais marinhos: a posição depende só do tempo de corrida, por isso é igual em todos os jogadores ---------- */
const fauna=(()=>{const dk=M(0x4a5560,.6),wh=M(0x2e3d4d,.5),mo=M(0x2f4a3a,.6),belly=M(0xd8d2c0,.7);
  const ell=(mat,sx,sy,sz,par,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),mat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.castShadow=true;par.add(m);return m;};
  const sharks=[[120,40,80,.16,0],[-280,180,90,-.14,2],[450,330,100,.13,4]].map(([cx,cz,r,w,ph])=>{const g=new THREE.Group();ell(dk,4.5,1,1.1,g,0,-.9,0);
    const fin=new THREE.Mesh(new THREE.ConeGeometry(1,2.8,4),dk);fin.scale.set(1.2,1,.25);fin.position.set(-.3,1,0);g.add(fin);const tl=new THREE.Mesh(new THREE.ConeGeometry(.7,1.8,4),dk);tl.scale.set(1,1,.25);tl.position.set(-4.6,.2,0);g.add(tl);
    return {g,cx,cz,r,w,ph,x:0,z:0,R:7,name:'um tubarão',stun:1.6};});
  const wg=new THREE.Group();ell(wh,13,3.2,3.6,wg);ell(wh,2,.8,.6,wg,-4,3,0);box(4,.5,7.5,wh,-14,.5,0,0,wg);ell(belly,9,1.6,2.6,wg,2,-1.9,0);
  const mg2=new THREE.Group();ell(mo,13,2,2.2,mg2);ell(mo,4.2,1.5,1.6,mg2,14,.5,0);box(5.5,.5,2.2,belly,15,-.9,0,0,mg2).rotation.z=-.3;for(let i=0;i<6;i++){const t=new THREE.Mesh(new THREE.ConeGeometry(.22,.8,5),belly);t.position.set(13.5+i*.8,-.2-i*.1,i%2?.7:-.7);t.rotation.x=Math.PI;mg2.add(t);}
  for(const [x,z] of[[5,2.8],[5,-2.8],[-6,2.3],[-6,-2.3]])ell(mo,2.6,.3,1.3,mg2,x,-1,z);ell(mo,8,1.2,.5,mg2,-19,.3,0);
  const whale={g:wg,x:0,z:0,R:14,name:'uma baleia',stun:1.8},mosa={g:mg2,x:0,z:0,R:17,name:'o mosassauro',stun:2.6},all=[...sharks,whale,mosa];
  all.forEach(c=>{c.g.visible=false;scene.add(c.g);});return {sharks,whale,mosa,all};})();
const MSPOTS=[[240,100],[90,-70],[-250,110],[-120,280],[380,350],[-450,150],[150,420],[330,-10]],rr=()=>Math.random()-.5;
function stepFauna(dt){const on=!!cfg.fauna&&trk==='funchal'&&(cfg.mode==='sea'||cfg.mode==='both')&&racing;if(!on){fauna.all.forEach(c=>{c.g.visible=false;c.act=false;});return;}
  const t=Math.max(0,raceT),fx=dt>0&&!reduce;
  for(const s of fauna.sharks){const a=s.ph+t*s.w,sg=Math.sign(s.w);s.x=s.cx+Math.cos(a)*s.r;s.z=s.cz+Math.sin(a)*s.r;s.act=true;s.g.visible=true;s.g.position.set(s.x,Math.sin(t*1.3+s.ph)*.25,s.z);s.g.rotation.y=Math.atan2(-Math.cos(a)*sg,-Math.sin(a)*sg);
    if(fx&&Math.random()<.4)emit(s.x,.15,s.z,rr()*2,0,rr()*2,2.5,.6,1);}
  const w=fauna.whale,a=t*.02,up=Math.sin(t*.22);w.x=80+520*Math.sin(a);w.z=260+170*Math.sin(a*1.55+1);w.act=up>.2;w.g.visible=true;
  w.g.position.set(w.x,-6+clamp(up+.3,0,1)*4.8,w.z);w.g.rotation.y=Math.atan2(-170*1.55*Math.cos(a*1.55+1),520*Math.cos(a));
  if(fx&&up>.85)for(let i=0;i<3;i++)emit(w.x+Math.cos(w.g.rotation.y)*7,3,w.z-Math.sin(w.g.rotation.y)*7,rr()*3,11+Math.random()*6,rr()*3,1.3,.6,0);
  const m=fauna.mosa,k=Math.floor(t/32),ph=t-k*32,sp=MSPOTS[(k*5+3)%8],ang=k*2.4;m.x=sp[0];m.z=sp[1];m.act=false;m.g.visible=false;
  if(ph>=22&&ph<26){if(fx)for(let i=0;i<4;i++)emit(m.x+rr()*26,.2,m.z+rr()*26,0,2+Math.random()*3,0,.9,.8,0);if(me&&!me.land&&(me.x-m.x)**2+(me.z-m.z)**2<8100)toast('Algo se mexe debaixo de água…');}
  else if(ph>=26&&ph<29.5){const u=(ph-26)/3.5,dx=Math.cos(ang),dz=-Math.sin(ang);m.x=sp[0]+dx*(u-.5)*36;m.z=sp[1]+dz*(u-.5)*36;m.g.visible=true;m.g.position.set(m.x,-4+Math.sin(u*Math.PI)*9.5,m.z);m.g.rotation.set(0,ang,0);m.g.rotateZ((.5-u)*1.7);m.act=u>.12&&u<.88;
    if(fx&&(u<.25||u>.75))for(let i=0;i<10;i++)emit(m.x+rr()*10,.5,m.z+rr()*10,rr()*16,5+Math.random()*10,rr()*16,1,.8,0);}
  for(const b of boats){if(b.remote||b.land||b.fin!=null||b.stun>0||raceT<b.cdC)continue;for(const c of fauna.all){if(c.act&&(b.x-c.x)**2+(b.z-c.z)**2<c.R*c.R){b.cdC=raceT+5;hitBoat(b,c.name);b.stun=c.stun;break;}}}
}

/* ================= ESCONDIDAS: a pé na cidade, pintar-se com as cores do sítio, um caçador ================= */
const ARENA={x:100,z:zsF(100)-200,r:210},HIDE_T=40,SEEK_T=150,SEEKC=0xe8232a;let hideWin='';
const AH=HOUSES.filter(o=>Math.hypot(o.x-ARENA.x,o.z-ARENA.z)<ARENA.r+30).map(o=>Object.assign({cs:Math.cos(o.rot),sn:Math.sin(o.rot)},o)),AT=TREES.filter(o=>Math.hypot(o.x-ARENA.x,o.z-ARENA.z)<ARENA.r+10);
const ring=new THREE.Mesh(new THREE.CylinderGeometry(ARENA.r,ARENA.r,260,64,1,true),new THREE.MeshBasicMaterial({color:0x4ad6ff,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}));ring.position.set(ARENA.x,100,ARENA.z);ring.visible=false;scene.add(ring);
function houseAt(x,z,pad){for(const o of AH){const dx=x-o.x,dz=z-o.z;if(dx>30||dx<-30||dz>30||dz<-30)continue;if(Math.abs(dx*o.cs-dz*o.sn)<o.w/2+pad&&Math.abs(dx*o.sn+dz*o.cs)<o.d/2+pad)return o;}return null;}
function sampleAt(x,z){for(const p of PROPS)if((p.x-x)**2+(p.z-z)**2<(p.r+2.2)**2)return p.c;const h=houseAt(x,z,3.5);if(h)return h.c;for(const t of AT)if((t.x-x)**2+(t.z-z)**2<(t.r+2.5)**2)return t.c;if(nearTrail(x,z,11))return 0xa9824f;return hF(x,z)<2.5?0x6f6a60:slope(x,z)>.75?0x6a5f52:0x8a9274;}
const footOk=(x,z)=>!houseAt(x,z,.7)&&!PROPS.some(p=>p.solid&&(p.x-x)**2+(p.z-z)**2<(p.r+.5)**2)&&hF(x,z)>.6&&(x-ARENA.x)**2+(z-ARENA.z)**2<ARENA.r*ARENA.r;
function rndSpot(r,cx,cz){for(let i=0;i<60;i++){const a=Math.random()*TAU,d=Math.sqrt(Math.random())*(r||ARENA.r*.9),x=(cx==null?ARENA.x:cx)+Math.cos(a)*d,z=(cz==null?ARENA.z:cz)+Math.sin(a)*d;if(footOk(x,z))return [x,z];}return [ARENA.x,ARENA.z];}
function hideSpot(av){for(let i=0;i<40;i++){const o=AH[Math.floor(Math.random()*AH.length)];if(!o||av&&Math.hypot(o.x-av.x,o.z-av.z)<70)continue;const sd=Math.random()<.5?1:-1,ax=Math.random()<.5;
    const lx=ax?sd*(o.w/2+1.3):(Math.random()-.5)*o.w*.8,lz=ax?(Math.random()-.5)*o.d*.8:sd*(o.d/2+1.3),x=o.x+lx*o.cs+lz*o.sn,z=o.z-lx*o.sn+lz*o.cs;if(footOk(x,z))return [x,z,o];}return rndSpot();}
const PN=['','um caixote','um barril','um vaso','um arbusto'];
function propMesh(t,c){const g=new THREE.Group(),m=M(c,.75);
  if(t===1)box(2.2,2.2,2.2,m,0,1.1,0,0,g);
  else if(t===2){cyl(.9,.9,2.2,m,0,1.1,0,14,g);for(const y of[.5,1.7])cyl(.94,.94,.14,M(0x333333,.6),0,y,0,14,g);}
  else if(t===3){cyl(.95,.6,1.2,m,0,.6,0,12,g);const l=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,1),M(0x2f7a34,.9));l.position.y=1.9;l.castShadow=true;g.add(l);}
  else{const l=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),m);l.scale.set(1.6,1.25,1.6);l.position.y=1;l.castShadow=true;g.add(l);}
  return g;}
function makeMan(){const man=new THREE.Group(),body=new THREE.Group(),cv=document.createElement('canvas');man.add(body);cv.width=48;cv.height=80;const ctx=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.magFilter=THREE.NearestFilter;
  const mmat=new THREE.MeshStandardMaterial({map:tex,roughness:.85}),umat=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});
  box(.6,2.35,1.2,mmat,0,2.8,0,0,body);
  const limb=(y,z,w,l)=>{const g=new THREE.Group();g.position.set(0,y,z);box(w,l,w,mmat,0,-l/2,0,0,g);body.add(g);return g;},legs=[limb(1.65,.3,.44,1.65),limb(1.65,-.3,.44,1.65)];
  // UV por projeção de frente: o desenho da tela cai sobre o corpo como num boneco de papel
  man.updateMatrixWorld(true);const v=V();body.traverse(m=>{if(!m.isMesh)return;m.castShadow=false;const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);uv.setXY(i,clamp((v.z+1.1)/2.2,0,1),clamp(v.y/4,0,1));}uv.needsUpdate=true;});
  const hat=new THREE.Mesh(new THREE.ConeGeometry(.55,1,12),new THREE.MeshStandardMaterial({color:0xffd23f,emissive:0xffd23f,emissiveIntensity:.4}));hat.position.y=4.5;man.add(hat);man.visible=false;scene.add(man);return {man,body,mmat,umat,legs,hat,cv,ctx,tex,wp:0,form:0,pose:0};}
function setUnlit(b,u){b.unlit=!!u;b.body.traverse(m=>{if(m.isMesh)m.material=u?b.umat:b.mmat;});}
function setForm(b,f){b.form=f;if(f){b.pose=0;let p=null,bd=1e9;for(const q of PROPS){if(q.type!==f)continue;const d=(q.x-b.x)**2+(q.z-b.z)**2;if(d<bd){bd=d;p=q;}}b.col=p?p.c:PROPC[0];}else avgCol(b);}
// copiar o fundo: fotografa o que está atrás do boneco (com a luz do sítio) e cola-o na tela; o boneco passa a não receber luz nem fazer sombra
const capQ=[],capCam=new THREE.OrthographicCamera(-1,1,1,-1,.1,80);
function capture(b){const o=b.man,el=renderer.domElement,W=el.width,Hh=el.height,asp=W/Hh,sy=o.scale.y,ax=V(1,0,0).applyQuaternion(o.quaternion),ay=V(0,1,0).applyQuaternion(o.quaternion),Hf=Math.max(4*sy,2.4/asp),c=o.position.clone().addScaledVector(ay,2*sy);
  capCam.top=Hf/2;capCam.bottom=-Hf/2;capCam.right=Hf*asp/2;capCam.left=-Hf*asp/2;capCam.updateProjectionMatrix();capCam.position.copy(c).addScaledVector(ax,.4);capCam.up.copy(ay);capCam.lookAt(c.clone().addScaledVector(ax,-1));
  const rv=ring.visible;o.visible=false;ring.visible=false;renderer.render(scene,capCam);o.visible=true;ring.visible=rv;
  const pw=2.2/(Hf*asp)*W,ph=4*sy/Hf*Hh;b.ctx.save();b.ctx.translate(48,0);b.ctx.scale(-1,1);b.ctx.drawImage(el,(W-pw)/2,(Hh-ph)/2,pw,ph,0,0,48,80);b.ctx.restore();b.tex.needsUpdate=true;b.hasTex=true;setUnlit(b,true);sendTex(b);}
function copyBg(){if(!me||!me.foot||me.role||me.fin!=null||raceT<0)return;if(me.form)setForm(me,0);if(!capQ.includes(me))capQ.push(me);toast('Fundo copiado. Fica quieto!',1.5);}
function cycleForm(){if(!me||!me.foot||me.role||me.fin!=null||raceT<0)return;closePaint();setForm(me,((me.form|0)+1)%5);toast(me.form?'Agora és '+PN[me.form]:'Voltaste a ser boneco',1.5);}
function cyclePose(){if(!me||!me.foot||me.role||me.fin!=null||raceT<0||me.form)return;me.pose=((me.pose|0)+1)%3;toast(['De pé','Agachado','Deitado'][me.pose],1);}
function caught(b){b.role=1;b.form=0;b.pose=0;b.frz=raceT+3;setCol(b,SEEKC);toast(b===me?'Foste apanhado! Agora também caças':b.name+' foi apanhado!',2.5);}
function onTag(e){for(const b of boats)if(!b.remote&&!b.role&&b.fin==null&&(b.x-e.x)**2+(b.z-e.z)**2<14)caught(b);}
function doTag(s){if(!s.role||raceT<HIDE_T||raceT<s.frz||raceT<s.tagT||s.fin!=null)return;s.tagT=raceT+.6;const x=s.x+Math.cos(s.hd)*1.5,z=s.z-Math.sin(s.hd)*1.5,e={k:'tag',by:s.id,x,z};
  const hit=boats.some(h=>!h.role&&(h.x-x)**2+(h.z-z)**2<14);onTag(e);sendEv(e);if(hit)return;
  const d=PROPS.find(p=>p.type&&(p.x-x)**2+(p.z-z)**2<(p.r+2)**2);if(d){s.frz=raceT+2.5;if(s===me)toast('Era só '+PN[d.type]+'! Ficas 2,5 s parado',2.5);}else if(s===me)toast('Aqui não há ninguém',.8);}
function setCol(b,hex){b.col=hex;b.hasTex=false;setUnlit(b,false);fillMan(b,hex);if(b===me&&hex===SEEKC)closePaint(true);}
function paint(b){if(b.role||b.fin!=null||raceT<0)return;setCol(b,sampleAt(b.x,b.z));if(b.bot&&!b.remote&&!capQ.includes(b))capQ.push(b);}
function camo(h){if(h.form||h.unlit)return .92;if(!(raceT<h.cT)){h.cT=raceT+.5;const a=new THREE.Color(h.col),c=new THREE.Color(sampleAt(h.x,h.z));h.cq=1-Math.hypot(a.r-c.r,a.g-c.g,a.b-c.b)/1.2;}return h.cq;}
function botFoot(b,seek){
  const go=(gx,gz)=>{if(b.blk>.3){b.det=raceT+1;b.blk=0;b.side=b.side||(Math.random()<.5?1:-1);b.stk=(b.stk||0)+1;}return [clamp(angDiff(Math.atan2(-(gz-b.z),gx-b.x)+(raceT<b.det?1.3*b.side:0),b.hd)*4,-1,1),1];};
  if(b.role){if(!seek)return [0,0];let tg=null,bd=1e9;for(const h of boats){if(h.role)continue;const d=Math.hypot(h.x-b.x,h.z-b.z),hard=camo(h)>.9;if(d<bd&&(d<18&&Math.abs(h.v)>1||(hard?d<5&&Math.random()<.02:d<5||d<18&&camo(h)<.8))){bd=d;tg=h;}}
    if(tg){b.lock=tg;b.lockT=raceT+4;}else if(b.lock&&!b.lock.role&&raceT<b.lockT&&boats.includes(b.lock))tg=b.lock;
    if(tg){if(Math.hypot(tg.x-b.x,tg.z-b.z)<3)doTag(b);return go(tg.x,tg.z);}if(!b.goal||Math.hypot(b.goal[0]-b.x,b.goal[1]-b.z)<6||raceT>b.goalT||b.stk>8){b.goal=rndSpot();b.goalT=raceT+20;b.stk=0;}return go(b.goal[0],b.goal[1]);}
  let dg=null;if(seek)for(const s of boats)if(s.role&&Math.hypot(s.x-b.x,s.z-b.z)<11)dg=s;
  if(b.objF==null)b.objF=Math.random()<.4?1+Math.floor(Math.random()*4):0;
  if(dg&&!(raceT<b.fleeT)){b.goal=b.objF?rndSpot():hideSpot(dg);b.fleeT=raceT+4;b.hid=false;b.stk=0;b.form=0;b.pose=0;}
  if(!b.goal)b.goal=b.objF?rndSpot():hideSpot();
  if(Math.hypot(b.goal[0]-b.x,b.goal[1]-b.z)<1.6||b.stk>7){if(!b.hid){b.hid=true;b.v=0;if(b.objF)setForm(b,b.objF);else{const o=b.goal[2];if(o)b.hd=Math.atan2(-(b.z-o.z),b.x-o.x);b.pose=Math.random()<.35?1:0;b.man.rotation.set(0,b.hd,0);b.man.scale.y=b.pose?.5:1;b.man.position.set(b.x,b.y,b.z);b.man.updateMatrixWorld(true);paint(b);}}return [0,0];}
  return go(b.goal[0],b.goal[1]);}
function footPhysics(b,dt,rud,inp){
  if(b.fin!=null||dt<=0){b.v=0;return;}
  const seek=raceT>=HIDE_T;let fwd=-inp;if(b.bot)[rud,fwd]=botFoot(b,seek);
  if(b.role&&!seek||raceT<b.frz){b.v=0;return;}
  if(fwd&&b.pose===2)b.pose=0;b.hd+=rud*2.8*dt;b.v+=((b.role?10.5:b.form?5:b.pose?4.5:9)*(fwd>0?1:fwd<0?-.5:0)-b.v)*Math.min(1,dt*8);
  const nx=b.x+Math.cos(b.hd)*b.v*dt,nz=b.z-Math.sin(b.hd)*b.v*dt;
  if(footOk(nx,nz)){b.x=nx;b.z=nz;b.blk=0;}else if(footOk(nx,b.z)){b.x=nx;b.blk=(b.blk||0)+dt*.5;}else if(footOk(b.x,nz)){b.z=nz;b.blk=(b.blk||0)+dt*.5;}else{b.v=0;b.blk=(b.blk||0)+dt;}
  b.y=HM(b.x,b.z);
}
function visualFoot(b,dt){const o=b.man;o.visible=true;if(b.remote)b.y=HM(b.x,b.z);if(b.remote){if(b.role){if(!b.red){b.red=1;fillMan(b,SEEKC);}}else if(b.colS!==b.col){b.colS=b.col;if(!b.hasTex)fillMan(b,b.col);}}b.hat.visible=!!b.role;
  const f=b.role?0:b.form|0,ps=b.role||f?0:b.pose|0;if(f!==b.fS||f&&b.col!==b.fC){if(b.fg)o.remove(b.fg);b.fg=f?propMesh(f,b.col):null;if(b.fg)o.add(b.fg);b.fS=f;b.fC=b.col;}b.body.visible=!f;
  o.position.set(b.x,b.y+(ps===2?.3:0),b.z);o.rotation.set(0,b.hd,ps===2?Math.PI/2:0);o.scale.y=ps===1?.5:1;b.wp+=Math.abs(b.v)*dt*1.1;const sw=Math.sin(b.wp)*.75*Math.min(1,Math.abs(b.v)/5);b.legs[0].rotation.z=sw;b.legs[1].rotation.z=-sw;b.fwd.set(Math.cos(b.hd),0,-Math.sin(b.hd));}
const css=h=>'#'+new THREE.Color(h).getHexString();
function hudHide(){const seek=raceT>=HIDE_T,left=boats.filter(b=>!b.role).length,rem=HIDE_T+SEEK_T-raceT;
  $('clock').textContent=me.fin!=null?(hideWin==='h'?'GANHARAM OS ESCONDIDOS':'GANHARAM OS CAÇADORES'):raceT<0?'ESCONDIDAS':!seek?'ESCONDAM-SE · '+Math.ceil(HIDE_T-raceT)+' s':'À PROCURA · '+fmt(Math.max(0,rem)).slice(0,5);
  $('blind').hidden=!(me.role0&&raceT>=0&&!seek&&me.fin==null);if(!$('blind').hidden)$('blindn').textContent=Math.ceil(HIDE_T-raceT);
  $('rank').innerHTML=`<div>Escondidos: ${left} · Caçadores: ${boats.length-left}</div>`+boats.filter(b=>b.role).map(b=>`<div class="r${b===me?' me':''}"><span>🔎</span><span class="dot" style="background:${css(SEEKC)}"></span><span>${esc(b.name)}</span><span></span></div>`).join('');
  $('hrole').textContent=me.role?'És CAÇADOR':'Estás ESCONDIDO';$('htip').textContent=me.role?(seek?'Espaço (★) toca no que está à tua frente. Há quem esteja pintado como a parede e quem se tenha feito objeto. Se tocares num objeto verdadeiro, ficas 2,5 s parado.':'Espera: os outros estão a esconder-se.'):'V copia o fundo para o boneco · F vira objeto · Q muda a pose · Espaço abre as tintas. Depois fica quieto!';$('hbtn').hidden=!!me.role;
  $('swme').style.background=css(me.col);$('swhere').style.background=css(sampleAt(me.x,me.z));$('hsw').hidden=!!me.role;
  if(me.fin==null&&raceT>HIDE_T&&(rem<=0||left===0)){hideWin=left>0?'h':'s';for(const b of boats)if(!b.remote)b.fin=raceT;toast(hideWin==='h'?'Fim! Ganharam os escondidos':'Fim! Todos apanhados',3);}
  if(me.fin!=null&&!finShown&&raceT-me.fin>2.5){finShown=true;$('results').hidden=false;}if(finShown)renderResults();}
function mapHide(){const w=mapC.width,h=mapC.height,k=h/(ARENA.r*2.2),sx=x=>w/2+(x-ARENA.x)*k,sz=z=>h/2+(z-ARENA.z)*k;mg.clearRect(0,0,w,h);mg.fillStyle='rgba(70,90,70,.75)';mg.fillRect(0,0,w,h);
  for(const p of PROPS){mg.fillStyle=css(p.c);mg.beginPath();mg.arc(sx(p.x),sz(p.z),Math.max(2,p.r*k),0,7);mg.fill();}
  mg.fillStyle='rgba(230,225,210,.8)';for(const o of AH)if(!o.mural)mg.fillRect(sx(o.x)-o.w*k/2,sz(o.z)-o.d*k/2,o.w*k,o.d*k);mg.strokeStyle='#4ad6ff';mg.lineWidth=2;mg.beginPath();mg.arc(sx(ARENA.x),sz(ARENA.z),ARENA.r*k,0,7);mg.stroke();mg.lineWidth=1;
  for(const b of boats){if(b!==me&&!(b.role&&me.role))continue;mg.save();mg.translate(sx(b.x),sz(b.z));mg.rotate(-b.hd);mg.fillStyle=b===me?'#ffd23f':css(SEEKC);mg.beginPath();mg.moveTo(7,0);mg.lineTo(-4,4);mg.lineTo(-4,-4);mg.fill();mg.restore();}}

/* ---------- objetos coloridos na zona das escondidas (iguais em todos os jogadores: gerador com semente fixa) ---------- */
const PROPC=[0x2f6fd0,0xd0342c,0xf2c230,0x2a9d58,0xe67e22,0x8e44ad,0xff5fa2,0x19b5b0],PROPS=[];
{let ps=4711;const pr=()=>{ps=(ps*16807)%2147483647;return ps/2147483647;},spot=()=>{for(let i=0;i<80;i++){const a=pr()*TAU,d=Math.sqrt(pr())*ARENA.r*.92,x=ARENA.x+Math.cos(a)*d,z=ARENA.z+Math.sin(a)*d;if(footOk(x,z)&&!nearTrail(x,z,17)&&!houseAt(x,z,3)&&!PROPS.some(p=>(p.x-x)**2+(p.z-z)**2<100))return [x,z];}return null;};
  const add=(n,fn)=>{for(let i=0;i<n;i++){const s=spot();if(s)fn(s[0],s[1],HM(s[0],s[1]),PROPC[Math.floor(pr()*PROPC.length)],pr);}};
  add(18,(x,z,y,c,pr)=>{const m=M(c,.7),g=new THREE.Group();box(2.4,2.4,2.4,m,-1.3,1.2,0,pr(),g);box(2.4,2.4,2.4,m,1.3,1.2,.3,pr(),g);box(2.2,2.2,2.2,m,0,3.5,.1,pr(),g);g.position.set(x,y-.2,z);worldF.add(g);PROPS.push({x,z,r:2.9,c,solid:1});});
  add(16,(x,z,y,c)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,2.4,24),M(c,.9));m.position.set(x,y-.9,z);m.receiveShadow=true;worldF.add(m);PROPS.push({x,z,r:5.5,c,solid:0});});
  add(10,(x,z,y,c)=>{const g=new THREE.Group(),m=M(c,.8);const t=new THREE.Mesh(new THREE.ConeGeometry(4,3,4),m);t.position.y=5.4;t.rotation.y=Math.PI/4;t.castShadow=true;g.add(t);box(5.2,3,.3,m,0,2.3,-2.6,0,g);for(const [a,b] of[[-2.6,2.6],[2.6,2.6]])cyl(.12,.12,4,M(0xdddddd,.4),a,2,b,6,g);g.position.set(x,y-.2,z);worldF.add(g);PROPS.push({x,z:z,r:3.4,c,solid:0});});
  add(14,(x,z,y,c,pr)=>{const rot=pr()*Math.PI;box(9,4.6,.7,M(c,.85),x,y+1.6,z,rot,worldF);AH.push({x,z,w:9,d:.7,rot,c,cs:Math.cos(rot),sn:Math.sin(rot),mural:1});PROPS.push({x,z,r:1,c,solid:0});});
  const dec=(n,t,r,cf)=>{for(let i=0;i<n;i++){const s=spot();if(!s)continue;const c=cf||PROPC[Math.floor(pr()*PROPC.length)],g=propMesh(t,c);g.position.set(s[0],HM(s[0],s[1])-.1,s[1]);g.rotation.y=pr()*3;worldF.add(g);PROPS.push({x:s[0],z:s[1],r,c,solid:1,type:t});}};
  dec(16,1,1.5);dec(14,2,1.1);dec(12,3,1.1,0xb5562f);dec(16,4,1.6,0x2d5f2c);}

/* ---------- pintura à mão: cada boneco tem uma tela de 48x80 projetada de frente sobre o corpo ---------- */
const PAL=[0xffffff,0xf6f1e4,0xf3e2c0,0xf0cfa8,0xe9eef0,0xf2dc8f,0xe8b9aa,0xbcd0df,0xb9552f,0x9c4426,0x56687a,0x2a2f38,0x244f27,0x38692f,0x8a9274,0x6a5f52,0xa9824f,0x7a5a3a,...PROPC];
let pOpen=false,pCol=PAL[0],pSize=3,pLast=null,pSent=0;
function fillMan(b,hex){b.ctx.fillStyle=css(hex);b.ctx.fillRect(0,0,48,80);b.tex.needsUpdate=true;}
function avgCol(b){if(b.form)return;const d=b.ctx.getImageData(8,16,32,56).data;let r=0,g=0,l=0,n=0;for(let i=0;i<d.length;i+=16){r+=d[i];g+=d[i+1];l+=d[i+2];n++;}b.col=(Math.round(r/n)<<16)|(Math.round(g/n)<<8)|Math.round(l/n);}
function sendTex(b){b=b||me;if(!b||!b.cv)return;if(b===me)pSent=performance.now();avgCol(b);sendEv({k:'tex',by:b.id,d:b.cv.toDataURL('image/png'),u:b.unlit?1:0});}
function pickCol(c){pCol=c;document.querySelectorAll('#ppal button').forEach(x=>x.setAttribute('aria-pressed',+x.dataset.c===c));document.getElementById('pcur').style.background=css(c);}
function openPaint(){if(!me||!me.foot||me.role||me.fin!=null||raceT<0)return;if(me.form)setForm(me,0);pOpen=true;$('paint').hidden=false;$('pwrap').prepend(me.cv);const h=sampleAt(me.x,me.z);$('phere').style.background=css(h);$('phere').dataset.c=h;}
function closePaint(silent){if(!pOpen)return;pOpen=false;pLast=null;$('paint').hidden=true;if(!silent)sendTex();}
function togglePaint(){pOpen?closePaint():openPaint();}
{const pal=document.getElementById('ppal');PAL.forEach(c=>{const b=document.createElement('button');b.type='button';b.dataset.c=c;b.style.background=css(c);b.setAttribute('aria-label','Cor '+css(c));b.onclick=()=>pickCol(c);pal.appendChild(b);});
  const W=document.getElementById('pwrap'),xy=e=>{const r=me.cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*48,(e.clientY-r.top)/r.height*80];},dab=(x,y)=>{me.ctx.beginPath();me.ctx.arc(x,y,pSize,0,7);me.ctx.fill();};
  W.addEventListener('pointerdown',e=>{if(!pOpen||!me)return;e.preventDefault();W.setPointerCapture(e.pointerId);me.ctx.fillStyle=css(pCol);pLast=xy(e);dab(pLast[0],pLast[1]);me.tex.needsUpdate=true;});
  W.addEventListener('pointermove',e=>{if(!pLast||!pOpen)return;const p=xy(e),n=Math.ceil(Math.hypot(p[0]-pLast[0],p[1]-pLast[1]));for(let i=1;i<=n;i++)dab(pLast[0]+(p[0]-pLast[0])*i/n,pLast[1]+(p[1]-pLast[1])*i/n);pLast=p;me.tex.needsUpdate=true;});
  const up=()=>{if(!pLast)return;pLast=null;if(performance.now()-pSent>1500)sendTex();else avgCol(me);};W.addEventListener('pointerup',up);W.addEventListener('pointercancel',up);
  document.querySelectorAll('[data-ps]').forEach(b=>b.onclick=()=>{pSize=+b.dataset.ps;document.querySelectorAll('[data-ps]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  document.getElementById('pfill').onclick=()=>{if(me&&pOpen){setUnlit(me,false);fillMan(me,pCol);avgCol(me);}};
  for(const [id,f] of[['pcopy',copyBg],['hcopy',copyBg],['hform',cycleForm],['hpose',cyclePose]])document.getElementById(id).addEventListener('click',e=>{e.preventDefault();f();e.currentTarget.blur();});
  document.getElementById('phere').onclick=e=>pickCol(+e.currentTarget.dataset.c);
  document.getElementById('pclose').onclick=()=>closePaint();pickCol(PAL[0]);}

/* ---------- entrada ---------- */
const keys={},touch={};
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=1;if(e.code==='Escape'&&pOpen){closePaint();return;}if((e.code==='Escape'||e.code==='KeyP')&&racing&&$('results').hidden)setPause(!paused);if((e.code==='Space'||e.code==='KeyE')&&racing&&me&&raceT>0&&!paused){e.preventDefault();cfg.mode==='hide'?(me.role?doTag(me):togglePaint()):useItem(me);}if(cfg.mode==='hide'&&racing&&!paused){if(e.code==='KeyV')copyBg();if(e.code==='KeyF')cycleForm();if(e.code==='KeyQ')cyclePose();}if(e.code==='KeyC'&&racing)camMode=(camMode+1)%3;if(/Arrow/.test(e.code)&&racing)e.preventDefault();});
addEventListener('keyup',e=>{keys[e.code]=0;});
document.getElementById('bitem').addEventListener('pointerdown',e=>{e.preventDefault();if(racing&&me&&raceT>0)cfg.mode==='hide'?(me.role?doTag(me):togglePaint()):useItem(me);});
document.querySelectorAll('[data-t]').forEach(el=>{const k=el.dataset.t,on=e=>{e.preventDefault();touch[k]=1;},off=()=>{touch[k]=0;};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointerleave',off);el.addEventListener('pointercancel',off);});
if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
const inRud=()=>((keys.ArrowLeft||keys.KeyA||touch.l)?1:0)-((keys.ArrowRight||keys.KeyD||touch.r)?1:0);
const inDrift=()=>!!(keys.ShiftLeft||keys.ShiftRight||keys.KeyX||touch.x);
const inSheet=()=>((keys.ArrowDown||keys.KeyS||touch.d)?1:0)-((keys.ArrowUp||keys.KeyW||touch.u)?1:0);

/* ---------- rede (PeerJS, P2P, o anfitrião reencaminha) ---------- */
const PQ=new URLSearchParams(location.search).get('peer'),PCFG=PQ?{host:PQ.split(':')[0],port:+PQ.split(':')[1]||9000,path:'/',secure:false}:{};
const PFX='regata-fnc-',$=id=>document.getElementById(id);
let peer=null,conns=[],hostConn=null,isHost=false,solo=false,myId='h',players=[],code='',racing=false,leaving=false;
const bcast=m=>conns.forEach(c=>{if(c.open)c.send(m);});
const myName=()=>($('name').value.trim()||'Jogador').slice(0,14);
const rc=()=>Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random()*24)]).join('');
function netErr(e){const t=e&&e.type;$('merr').textContent=t==='peer-unavailable'?'Sala não encontrada. Confirma o código.':t==='network'||t==='server-error'||t==='socket-error'?'Sem ligação ao servidor de salas. Tenta outra vez.':'Erro de ligação: '+(t||e);showMenu('main');}
function resetNet(){leaving=true;conns.forEach(c=>c.close());conns=[];if(hostConn)hostConn.close();hostConn=null;if(peer)peer.destroy();peer=null;leaving=false;}
function hostRoom(){if(!window.Peer)return netErr({type:'PeerJS não carregou'});resetNet();isHost=true;solo=false;code=rc();$('merr').textContent='A criar sala…';
  peer=new Peer(PFX+code,PCFG);
  peer.on('open',()=>{$('merr').textContent='';myId='h';players=[{id:'h',name:myName(),slot:0}];showRoom();});
  peer.on('connection',c=>{c.on('data',d=>hostData(c,d));c.on('close',()=>dropConn(c));});
  peer.on('error',e=>{if(e.type==='unavailable-id')hostRoom();else if(e.type!=='peer-unavailable')netErr(e);});}
function hostData(c,d){
  if(d.t==='hello'){if(racing||players.length>=MAXB){c.send({t:'full'});setTimeout(()=>c.close(),400);return;}
    const used=players.map(p=>p.slot),slot=[...Array(MAXB).keys()].find(s=>!used.includes(s));players.push({id:c.peer,name:String(d.name||'Jogador').slice(0,14),slot});conns.push(c);c.send({t:'welcome',id:c.peer});sendLobby();}
  else if(d.t==='s')applyStates(d.b);
  else if(d.t==='ev'){onEv(d.e);sendEv(d.e,c);}}
function dropConn(c){if(!conns.includes(c))return;conns=conns.filter(x=>x!==c);players=players.filter(p=>p.id!==c.peer);removeBoat(c.peer);if(!racing)sendLobby();}
function sendLobby(){bcast({t:'lobby',players,laps});if(!racing)showRoom();}
function joinRoom(c){if(!window.Peer)return netErr({type:'PeerJS não carregou'});resetNet();isHost=false;solo=false;code=c.toUpperCase();$('merr').textContent='A ligar…';
  peer=new Peer(PCFG);
  peer.on('open',()=>{hostConn=peer.connect(PFX+code,{reliable:true});
    hostConn.on('open',()=>hostConn.send({t:'hello',name:myName()}));hostConn.on('data',clientData);
    hostConn.on('close',()=>{if(leaving)return;endRace();$('merr').textContent='A ligação ao anfitrião caiu.';showMenu('main');});});
  peer.on('error',netErr);}
function clientData(d){
  if(d.t==='welcome')myId=d.id;
  else if(d.t==='lobby'){$('merr').textContent='';players=d.players;laps=d.laps;endRace();showRoom();}
  else if(d.t==='full'){$('merr').textContent='Sala cheia ou corrida já a decorrer.';resetNet();showMenu('main');}
  else if(d.t==='start')startRace(d.players,d.laps,d.items,d.mode,d.veh,d.lveh,d.fauna,d.sk,d.trk);
  else if(d.t==='s')applyStates(d.b);
  else if(d.t==='ev')onEv(d.e);}
const pack=b=>[b.id,+b.x.toFixed(1),+b.z.toFixed(1),+b.hd.toFixed(3),+b.v.toFixed(2),+b.s.toFixed(2),b.mark,b.lap,b.fin,b.land,b.ti,b.tp,b.col,b.role,b.form|0,b.pose|0];
function applyStates(arr){if(!racing)return;for(const p of arr){if(p[0]===myId)continue;const b=boats.find(x=>x.id===p[0]);if(!b||!b.remote)continue;
  const wl=b.land,wr=b.role;[,b.tx,b.tz,b.thd,b.v,b.s,b.mark,b.lap,b.fin,b.land,b.ti,b.tp,b.col,b.role,b.form,b.pose]=p;if(b.foot&&b.role&&!wr&&b.seen)toast(b.name+' foi apanhado!',2);if(!b.seen||b.land&&!wl){b.x=b.tx;b.z=b.tz;b.hd=b.thd;b.seen=true;}}}

/* ---------- menus ---------- */
function showMenu(w){$('menu').hidden=false;$('results').hidden=true;['main','room'].forEach(s=>$('m-'+s).hidden=s!==w);}
function showRoom(){showMenu('room');$('rcode').textContent=code;const url=location.origin+location.pathname+'?sala='+code;$('rlink').value=url;
  const nb=Math.min(+$('nboats').value,MAXB-players.length);
  $('rlist').innerHTML=players.map(p=>`<li><span class="dot" style="background:#${new THREE.Color(COLORS[p.slot]).getHexString()}"></span>${esc(p.name)}${p.id===myId?' (tu)':''}</li>`).join('')+(isHost&&nb?`<li><i>+ ${nb} bot${nb>1?'s':''}</i></li>`:'');
  $('rcount').textContent=players.length+' de '+MAXB+' jogadores';
  $('rhost').hidden=!isHost;$('rwait').hidden=isHost;$('laps').value=laps;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
$('bhost').onclick=()=>{saveName();hostRoom();};
$('bjoin').onclick=()=>{saveName();const c=$('jcode').value.trim();if(c.length<4){$('merr').textContent='Escreve o código da sala (4 letras).';return;}joinRoom(c);};
$('bsolo').onclick=()=>{saveName();resetNet();isHost=true;solo=true;myId='h';laps=+$('slaps').value;lastPs=fillBots([{id:'h',name:myName(),slot:0}],1+(+$('sboats').value));startRace(lastPs,laps,$('sitems').checked,$('smode').value,$('sveh').value,$('slveh').value,$('sfauna').checked,pickSk(lastPs),$('strack').value);};
$('bstart').onclick=()=>{laps=+$('laps').value;const ps=fillBots(players,players.length+(+$('nboats').value));itemsOn=$('ritems').checked;cfg={mode:$('rmode').value,veh:$('rveh').value,lveh:$('rlveh').value,fauna:$('rfauna').checked,trk:$('rtrack').value};bcast({t:'start',players:ps,laps,items:itemsOn,mode:cfg.mode,veh:cfg.veh,lveh:cfg.lveh,fauna:cfg.fauna,sk:cfg.sk=pickSk(ps),trk:cfg.trk});startRace(ps,laps,itemsOn,cfg.mode,cfg.veh,cfg.lveh,cfg.fauna,cfg.sk,cfg.trk);};
$('bleave').onclick=()=>{resetNet();showMenu('main');};
$('bcopy').onclick=()=>{$('rlink').select();navigator.clipboard&&navigator.clipboard.writeText($('rlink').value);$('bcopy').textContent='Copiado';setTimeout(()=>$('bcopy').textContent='Copiar',1500);};
$('nboats').onchange=()=>showRoom();$('laps').onchange=()=>{laps=+$('laps').value;if(isHost)bcast({t:'lobby',players,laps});};
$('bagain').onclick=()=>{if(solo)restart();else if(isHost){endRace();sendLobby();}};
const pickSk=ps=>(ps.find(p=>p.id===window.__regata.forceSk)||ps[Math.floor(Math.random()*ps.length)]).id;
function restart(){if(!lastPs)return;const sk=pickSk(lastPs);if(!solo&&isHost)bcast({t:'start',players:lastPs,laps,items:itemsOn,mode:cfg.mode,veh:cfg.veh,lveh:cfg.lveh,fauna:cfg.fauna,sk,trk:cfg.trk});startRace(lastPs,laps,itemsOn,cfg.mode,cfg.veh,cfg.lveh,cfg.fauna,sk,cfg.trk);}
function setPause(v){paused=v;$('pause').hidden=!v;if(!v)return;
  $('pnote').textContent=solo?'Corrida em pausa.':'No multijogador a corrida continua enquanto este menu está aberto.';
  $('prestart').hidden=!(solo||isHost);$('plobby').hidden=!(isHost&&!solo);$('prestart').textContent=solo?'Recomeçar':'Recomeçar para todos';}
$('bpause').onclick=()=>setPause(true);$('presume').onclick=()=>setPause(false);$('prestart').onclick=()=>restart();
$('phome').onclick=()=>{endRace();resetNet();showMenu('main');};
$('plobby').onclick=()=>{if(isHost&&!solo){endRace();sendLobby();}};
$('bmenu').onclick=()=>{endRace();resetNet();showMenu('main');};
function fillBots(ps,total){const out=ps.slice(),names=['Marta','Rui','Inês','Tiago','Sofia','Duarte','Beatriz','Miguel','Carolina','João','Leonor','Pedro','Mariana','Tomás'];let k=0;for(let s=0;s<MAXB&&out.length<total;s++)if(!out.some(p=>p.slot===s))out.push({id:'bot'+s,name:names[k++%names.length],slot:s,bot:true});return out;}
function saveName(){try{localStorage.setItem('regata-nome',myName());}catch(e){}}
for(const k of['s','r']){const f=()=>{const m=$(k+'mode').value;$(k+'track').disabled=m!=='sea';$(k+'veh').disabled=m==='land'||m==='hide';$(k+'lveh').disabled=m==='sea'||m==='hide';};$(k+'mode').onchange=f;f();}
try{$('name').value=localStorage.getItem('regata-nome')||'';}catch(e){}
{const q=new URLSearchParams(location.search).get('sala');if(q)$('jcode').value=q.toUpperCase();}

/* ---------- corrida ---------- */
let lastPs=null,paused=false,raceT=-99,t0=0,camMode=0,netT=0,hudT=0,mapT=0,snap=true,finShown=false;
function startRace(ps,lp,it,mode,veh,lveh,fa,sk,tk){
  clearBoats();cfg={mode:mode||'sea',veh:veh||'sail',lveh:lveh||'bike',fauna:fa!==false,sk,trk:mode==='sea'||!mode?tk||'funchal':'funchal'};setTrack(cfg.trk);document.getElementById('locn').textContent=TK.name.toUpperCase();laps=lp;itemsOn=it!==false&&mode!=='hide';const hide=mode==='hide';hideWin='';closePaint(true);ring.visible=hide;$('spdp').hidden=hide;$('hidep').hidden=!hide;$('blind').hidden=true;document.body.classList.remove('land');
  if(hide){$('windw').hidden=true;$('next').hidden=true;$('item').hidden=true;$('keys').textContent='A/D virar · W/S andar · V copiar fundo · F objeto · Q pose · Espaço tintas (caçador: tocar) · C câmara · Esc menu';}clearItems();racing=true;finShown=false;lastPs=ps;setPause(false);
  const dir=MARKS[LAPS[0][0]].clone().sub(GATE).normalize(),perp=V(-dir.z,0,dir.x),brg=Math.atan2(-dir.z,dir.x);
  for(const p of ps){const b=addBoat(p);b.remote=!(p.id===myId||(isHost&&p.bot));
    const gi=ps.indexOf(p),row=Math.floor(gi/5),col=gi%5-2;b.x=GATE.x-dir.x*(45+row*20)+perp.x*col*14;b.z=GATE.z-dir.z*(45+row*20)+perp.z*col*14;
    b.hd=Math.abs(angDiff(W0+.85,brg))<Math.abs(angDiff(W0-.85,brg))?W0+.85:W0-.85;b.tx=b.x;b.tz=b.z;b.thd=b.hd;b.tack=b.hd>W0?1:-1;
    if(cfg.mode==='land'){const row=Math.floor(gi/4),s=TRAIL[5+row*2];enterLand(b,5+row*2);b.x+=s.nx*(gi%4-1.5)*4.5;b.z+=s.nz*(gi%4-1.5)*4.5;b.tx=b.x;b.tz=b.z;b.outer.visible=false;}
    if(hide){b.foot=1;b.outer.visible=false;b.role=b.role0=p.id===sk?1:0;const sp=b.role?rndSpot(25):rndSpot();b.x=b.tx=sp[0];b.z=b.tz=sp[1];b.hd=b.thd=Math.random()*TAU;b.y=HM(b.x,b.z);b.v=0;setCol(b,b.role?SEEKC:COLORS[p.slot]);}
    if(p.id===myId)me=b;}
  t0=performance.now()+4000;raceT=-4;snap=true;pL.fill(0);
  $('menu').hidden=true;$('results').hidden=true;$('hud').hidden=false;}
function endRace(){racing=false;closePaint(true);ring.visible=false;$('blind').hidden=true;stepFauna(0);clearItems();setPause(false);clearBoats();$('hud').hidden=true;$('results').hidden=true;$('cd').textContent='';}
const fmt=t=>t==null?'—':String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(2).padStart(5,'0');
function onFinish(){const pos=[...boats].sort((a,c)=>progress(c)-progress(a)).indexOf(me)+1;toast('Chegada! '+pos+'.º lugar',3);}
function renderResults(){if(cfg.mode==='hide'){$('rtable').innerHTML=`<tr class="me"><td colspan="3">${hideWin==='h'?'Ganharam os escondidos':'Ganharam os caçadores'}</td></tr>`+boats.map(b=>`<tr${b===me?' class="me"':''}><td>${b.role0?'🔎':b.role?'✖':'✔'}</td><td>${esc(b.name)}</td><td>${b.role0?'Caçador':b.role?'Apanhado':'Sobreviveu'}</td></tr>`).join('');$('bagain').hidden=!(solo||isHost);$('rwait2').hidden=solo||isHost;$('bagain').textContent=solo?'Repetir':'Nova corrida';return;}
  const ord=[...boats].sort((a,c)=>progress(c)-progress(a));
  $('rtable').innerHTML=ord.map((b,i)=>`<tr${b===me?' class="me"':''}><td>${i+1}.º</td><td><span class="dot" style="background:#${new THREE.Color(b.hex).getHexString()}"></span>${esc(b.name)}</td><td>${b.fin!=null?fmt(b.fin):'a navegar…'}</td></tr>`).join('');
  $('bagain').hidden=!(solo||isHost);$('rwait2').hidden=solo||isHost;$('bagain').textContent=solo?'Repetir':'Nova corrida';}
let toastT=0;function toast(s,dur){const e=$('toast');if(e.textContent===s&&toastT>0)return;e.textContent=s;e.classList.add('on');toastT=dur||1.6;}

/* ---------- HUD ---------- */
const pointName=d=>d<40?'Contra o vento':d<70?'Bolina':d<120?'Través':d<155?'Largo':'Popa';
const mapC=$('map'),mg=mapC.getContext('2d');
function drawMap(){if(cfg.mode==='hide'){mapHide();return;}const land=me&&me.land,MX=TK.bg?TK.MX:land?[470,1050]:[-750,750],MZ=TK.bg?TK.MZ:land?[-595,-235]:[-420,480];const w=mapC.width,h=mapC.height,sx=x=>(x-MX[0])/(MX[1]-MX[0])*w,sz=z=>(z-MZ[0])/(MZ[1]-MZ[0])*h;
  mg.clearRect(0,0,w,h);if(TK.bg)mg.drawImage(TK.bg,0,0);else{mg.fillStyle='rgba(11,79,102,.55)';mg.fillRect(0,0,w,h);mg.fillStyle='rgba(70,110,60,.9)';mg.beginPath();mg.moveTo(0,0);for(let x=MX[0];x<=MX[1];x+=25)mg.lineTo(sx(x),sz(zsF(x)));mg.lineTo(w,0);mg.fill();}
  mg.fillStyle='#ffb347';for(const m of TK.mov){mg.beginPath();mg.arc(sx(m.x),sz(m.z),4,0,7);mg.fill();}
  mg.fillStyle='rgba(170,165,150,.95)';for(const c of COL){mg.beginPath();mg.arc(sx(c[0]),sz(c[1]),Math.max(1.2,c[2]/(MX[1]-MX[0])*w),0,7);mg.fill();}
  mg.strokeStyle='#c9a06a';mg.lineWidth=land?4:2;mg.beginPath();TRAIL.forEach((p,i)=>i?mg.lineTo(sx(p.x),sz(p.z)):mg.moveTo(sx(p.x),sz(p.z)));mg.closePath();if(cfg.mode!=='sea')mg.stroke();mg.lineWidth=1;
  mg.strokeStyle='rgba(255,255,255,.35)';mg.setLineDash([4,4]);mg.beginPath();const RT=land?[]:me?route(me.lap):route(0);if(!land)mg.moveTo(sx(GATE.x),sz(GATE.z));RT.forEach(p=>mg.lineTo(sx(p.x),sz(p.z)));mg.stroke();mg.setLineDash([]);
  RT.forEach((p,i)=>{const nx=me&&me.mark===i&&me.fin==null;mg.fillStyle=i===RT.length-1?'#fff':'#ff6a1f';mg.beginPath();mg.arc(sx(p.x),sz(p.z),nx?6:4,0,7);mg.fill();if(nx){mg.strokeStyle='#ffe14a';mg.lineWidth=2;mg.stroke();mg.lineWidth=1;}});
  if(!land)for(const c of fauna.all){if(!c.act)continue;mg.fillStyle='#ff4d4d';mg.beginPath();mg.arc(sx(c.x),sz(c.z),c.R>10?5:3,0,7);mg.fill();}
  for(const b of boats){mg.save();mg.translate(sx(b.x),sz(b.z));mg.rotate(-b.hd);mg.fillStyle='#'+new THREE.Color(b.hex).getHexString();mg.beginPath();mg.moveTo(7,0);mg.lineTo(-4,4);mg.lineTo(-4,-4);mg.fill();if(b===me){mg.strokeStyle='#fff';mg.stroke();}mg.restore();}
  const wx=w-18,wy=18;mg.strokeStyle='#5fd0ff';mg.lineWidth=2.5;mg.beginPath();mg.moveTo(wx+windFrom.x*12,wy+windFrom.z*12);mg.lineTo(wx-windFrom.x*8,wy-windFrom.z*8);mg.stroke();mg.lineWidth=1;}
function hud(look){const el=x=>$(x);
  if(raceT<0)el('cd').textContent=Math.ceil(-raceT);else if(raceT<1.2)el('cd').textContent='Partida!';else el('cd').textContent='';
  if(cfg.mode==='hide'){hudHide();return;}
  const lap=Math.min(me.lap+1,laps);el('clock').textContent=(me.fin!=null?'CHEGADA · '+fmt(me.fin):me.land&&cfg.mode==='both'?'MOTA · '+fmt(Math.max(0,raceT)):'VOLTA '+lap+'/'+laps+' · '+fmt(Math.max(0,raceT)));
  const d=Math.round(me.twa*180/Math.PI);el('twa').textContent=d+'°';el('pt').textContent=pointName(d);
  el('kn').firstChild.nodeValue=(me.v*KN).toFixed(1)+' ';el('effb').style.width=Math.round(clamp(me.eff,0,1)*100)+'%';el('wspd').textContent=TK.wl+' '+Math.round(TK.wk*gust)+' nós';
  const camYaw=Math.atan2(look.x-cam.position.x,-(look.z-cam.position.z)),wYaw=Math.atan2(windFrom.x,-windFrom.z);el('warrow').setAttribute('transform','rotate('+((wYaw-camYaw)*180/Math.PI).toFixed(1)+')');
  const it=me.item;$('islot').textContent=it?ITEMS[it].ic:'';$('iname').textContent=it?ITEMS[it].nm:(me.boost>0?'Turbo!':me.fav>0?'Vento de feição!':'—');$('item').hidden=!itemsOn;
  const sail=cfg.veh==='sail'&&!me.land;$('windw').hidden=!!me.land;$('efl').textContent=sail?'EFICIÊNCIA DA VELA':'VELOCIDADE';$('keys').textContent=sail?'A/D ou ←/→ leme · W/S ou ↑/↓ caçar/folgar a vela · Espaço objeto · C câmara · Esc menu':'A/D ou ←/→ virar · W ou ↑ acelerar · S ou ↓ travar'+(me.land?' · Shift derrapar (no ar: mortal)':'')+' · Espaço objeto · C câmara · Esc menu';document.body.classList.toggle('land',!!me.land);
  if(!sail){el('kn').firstChild.nodeValue=me.land?Math.round(me.v*3.6)+' ':(me.v*1.6).toFixed(0)+' ';el('knu').textContent=me.land?'km/h':'nós';el('effb').style.width=Math.round(clamp(me.land?me.v/34:me.eff,0,1)*100)+'%';}else el('knu').textContent='nós';
  let tip='';if(!sail)tip=me.land&&!me.on?'Fora da pista!':me.land&&me.mud?'Lama: pouca aderência':me.land&&me.dr?'A derrapar!':me.land&&me.air?'No ar: Shift faz um mortal':'';else if(me.twa<.61)tip='Estás contra o vento: vira para um dos lados';else if(me.s>me.ideal+.1)tip='Caça a vela (W ou ↑)';else if(me.s<me.ideal-.1)tip='Folga a vela (S ou ↓)';else tip='Vela bem afinada';el('tip').textContent=tip;el('tip').className=tip==='Vela bem afinada'?'ok':'';
  if(me.fin==null&&me.land){const p=TW(me.ti+6),dx=p.x-me.x,dz=p.z-me.z,need=cfg.mode==='both'?2:laps;el('nxt').textContent=(me.ll+1>=need?'Meta':'Fim da volta')+' · '+Math.round(Math.max(0,(me.ll+1)*TN+3-me.tp)*TSTEP)+' m';
    el('narrow').style.transform='rotate('+((Math.atan2(dx,-dz)-camYaw)*180/Math.PI).toFixed(1)+'deg)';el('next').hidden=false;}
  else if(me.fin==null){const t=tgt(me),dx=t.x-me.x,dz=t.z-me.z,last=me.mark===route(me.lap).length-1;el('nxt').textContent=(last?(me.lap+1>=laps?(cfg.mode==='both'?'Praia (troca para a mota)':'Chegada'):'Linha de volta'):'Boia '+LET[markId(me)])+' · '+Math.round(Math.hypot(dx,dz))+' m';
    el('narrow').style.transform='rotate('+((Math.atan2(dx,-dz)-camYaw)*180/Math.PI).toFixed(1)+'deg)';el('next').hidden=false;}else el('next').hidden=true;
  const ord=[...boats].sort((a,c)=>progress(c)-progress(a));
  el('rank').innerHTML=ord.map((b,i)=>[b,i]).filter(([b,i])=>i<5||b===me).map(([b,i])=>`<div class="r${b===me?' me':''}"><span>${i+1}.º</span><span class="dot" style="background:#${new THREE.Color(b.hex).getHexString()}"></span><span>${esc(b.name)}</span><span class="gap">${b.fin!=null?fmt(b.fin):'V'+Math.min(b.lap+1,laps)}</span></div>`).join('')+(ord.length>5?`<div class="gap" style="font-size:.85em">${ord.length} barcos</div>`:'');
  if(me.fin!=null){if(!finShown&&raceT-me.fin>2.5){finShown=true;$('results').hidden=false;}if(finShown)renderResults();}}

/* ---------- ciclo ---------- */
const tmp=V();let last=performance.now(),wasLand=0;
function frame(now){
  requestAnimationFrame(frame);
  const rawdt=(now-last)/1000;let dt=Math.min(.05,rawdt);last=now;if(paused&&solo&&racing){t0+=rawdt*1000;dt=0;}T+=dt;
  water.material.uniforms.time.value+=dt*.8;anims.forEach(f=>f(dt,gust,T));
  markObjs.forEach((b,i)=>{b.position.y=Math.sin(T*1.6+i)*.25;b.rotation.z=Math.sin(T*1.3+i)*.08;});
  if(!racing){setWind(T);const a=T*.05;cam.position.set(80+Math.cos(a)*520,160,80+Math.sin(a)*420);cam.lookAt(0,40,-250);renderer.render(scene,cam);return;}
  raceT=(now-t0)/1000;setWind(Math.max(0,raceT));
  const go=raceT>=0;
  for(const b of boats){
    if(b.remote){b.tx+=Math.cos(b.thd)*b.v*dt;b.tz-=Math.sin(b.thd)*b.v*dt;const k=Math.min(1,dt*6);b.x+=(b.tx-b.x)*k;b.z+=(b.tz-b.z)*k;b.hd+=angDiff(b.thd,b.hd)*k;}
    else if(go){const fin=b.fin!=null;physics(b,dt,fin?0:b.bot?botCtl(b):inRud(),fin?0:inSheet(),!b.bot&&inDrift());}
    else if(b===me){b.s=clamp(b.s+inSheet()*dt*.55,0,1);const fx=Math.cos(b.hd),fz=-Math.sin(b.hd);b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.ideal=idealSheet(b.twa);b.eff=0;}
    else{b.twa=1;b.ideal=.4;b.eff=0;}
    visual(b,dt);}
  if(go)stepItems(dt);
  stepMov(Math.max(0,raceT));
  stepFauna(dt);
  if(!reduce)for(let k=0;k<5;k++)emit(cam.position.x+(Math.random()-.5)*120,2+Math.random()*16,cam.position.z+(Math.random()-.5)*120,windTo.x*34*gust,0,windTo.z*34*gust,2.5,.22,2);
  stepParticles(dt);
  if(!me){renderer.render(scene,cam);return;}
  const cur=me.foot?me.man.position:me.land?me.bike.position:me.outer.position;
  if(me.foot)beacon.visible=false;else if(me.land){const p=TRAIL[3];beacon.visible=me.fin==null&&me.tp>TN*.8;beacon.position.set(p.x,HM(p.x,p.z),p.z);}
  else{const nm=tgt(me),lastM=me.mark===route(me.lap).length-1;beacon.visible=me.fin==null&&(!lastM||cfg.mode==='both'&&me.lap===laps-1);beacon.position.set(nm.x,0,nm.z);}
  beacon.getObjectByName('arrow').position.y=24+Math.sin(T*3)*2;
  const mp=cur,f=me.fwd,F=me.foot,L=me.land||F;let want,look;
  if(pOpen&&F){want=mp.clone().addScaledVector(f,9);want.y=mp.y+4;look=mp.clone();look.y=mp.y+2.4;}
  else if(camMode===0){want=mp.clone().addScaledVector(f,F?-10:L?-15:-26);want.y=mp.y+(F?6:L?7:10);look=mp.clone().addScaledVector(f,24);look.y=mp.y+(L?3:6);}
  else if(camMode===1){want=mp.clone().addScaledVector(f,-70);want.y=mp.y+55;look=mp.clone().addScaledVector(f,30);}
  else{want=mp.clone().add(V(0,240,140));look=mp.clone();}
  if(L)want.y=Math.max(want.y,HM(want.x,want.z)+3);
  if(snap||L!==wasLand)cam.position.copy(want);else cam.position.lerp(want,Math.min(1,dt*(L?5:3)));wasLand=L;cam.lookAt(look);snap=false;
  sun.position.copy(mp).addScaledVector(sunDir,600);sun.target.position.copy(mp);
  if(capQ.length){const b=capQ.shift();if(boats.includes(b)&&b.foot&&!b.role)capture(b);}
  renderer.render(scene,cam);
  const w=host.clientWidth,h=host.clientHeight;
  for(const b of boats){tmp.copy(b.foot?b.man.position:b.land?b.bike.position:b.outer.position);tmp.y+=b.foot?6:b.land?7:cfg.veh==='sail'?20:8;tmp.project(cam);const vis=(!b.foot||b===me||b.role)&&tmp.z<1&&Math.abs(tmp.x)<1.05&&Math.abs(tmp.y)<1.05;b.lb.hidden=!vis;b.lb.style.left=((tmp.x+1)/2*w)+'px';b.lb.style.top=((1-tmp.y)/2*h)+'px';}
  hudT-=dt;if(hudT<=0){hudT=.15;hud(look);}
  mapT-=dt;if(mapT<=0){mapT=.1;drawMap();}
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('on');}
  netT-=dt;if(netT<=0&&!solo){netT=.066;if(isHost&&conns.length)bcast({t:'s',b:boats.filter(b=>!b.remote||b.seen).map(pack)});else if(hostConn&&hostConn.open)hostConn.send({t:'s',b:[pack(me)]});}
}
let T=0;showMenu('main');requestAnimationFrame(frame);
window.__regata={t:()=>raceT,get boats(){return boats;},get me(){return me;},sim(sec){for(let t=0;t<sec;t+=1/30){t0-=1000/30;raceT+=1/30;setWind(Math.max(0,raceT));if(raceT<0)continue;for(const b of boats)if(!b.remote)physics(b,1/30,b.fin!=null?0:b.bot?botCtl(b):0,0);stepMov(Math.max(0,raceT));stepItems(1/30);stepFauna(0);}},setTrack,hideSpot};
})();
