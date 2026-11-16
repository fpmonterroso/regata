(function(){
const LOW=new URLSearchParams(location.search).get('q')==='low'||matchMedia('(pointer:coarse)').matches;
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
  const n=list.length;if(!n)return;const walls=new THREE.InstancedMesh(unitBox,new THREE.MeshStandardMaterial({map:tex||wallTex,roughness:.85}),n);
  const roofs=new THREE.InstancedMesh(flatRoof?unitBox:prism,new THREE.MeshStandardMaterial({map:roofTex,roughness:.8}),n);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=V(),p=V(),up=V(0,1,0);
  list.forEach((o,i)=>{const y=o.y!=null?o.y:H(o.x,o.z);q.setFromAxisAngle(up,o.rot||0);
    m.compose(p.set(o.x,y-4,o.z),q,s.set(o.w,o.h+4,o.d));walls.setMatrixAt(i,m);walls.setColorAt(i,lin(o.c!=null?o.c:PASTEL[i%PASTEL.length]));
    m.compose(p.set(o.x,y+o.h,o.z),q,flatRoof?s.set(o.w*1.03,.8,o.d*1.03):s.set(o.w*1.14,o.rh||Math.min(o.w,o.d)*.42,o.d*1.14));roofs.setMatrixAt(i,m);
    roofs.setColorAt(i,lin(o.rc!=null?o.rc:[0xb9552f,0xa94a2a,0xc2623a,0x9c4426][i%4]));});
  walls.castShadow=roofs.castShadow=walls.receiveShadow=true;world.add(walls,roofs);}
function trees(list){const n=list.length;const t=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),M(0xffffff,.95),n);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=V(),p=V();
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
function hF(x,z){const d=zsF(x)-z;if(d<0)return Math.max(-12,d*.35);
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
const TRAIL=new THREE.CatmullRomCurve3([[520,3],[520,150],[540,300],[430,430],[280,520],[180,680],[330,800],[540,760],[690,620],[800,470],[900,560],[1020,480],[1010,300],[1040,140],[1068,62]].map(([x,d])=>V(x,0,zsF(x)-d)),false,'centripetal').getSpacedPoints(540).map(p=>({x:p.x,z:p.z})),TN=TRAIL.length,TSTEP=Math.hypot(TRAIL[1].x-TRAIL[0].x,TRAIL[1].z-TRAIL[0].z);
TRAIL.forEach((p,i)=>{const a=TRAIL[Math.max(0,i-1)],b=TRAIL[Math.min(TN-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z);p.tx=(b.x-a.x)/l;p.tz=(b.z-a.z)/l;p.nx=-p.tz;p.nz=p.tx;});
// rampas: sobem 2,6 m em 9 m e caem em 3 m; ficam nos troços mais direitos
const RAMPS=[];for(let j=34;j<TN-30;j+=44){let k=j;while(k<j+20&&TRAIL[k].tx*TRAIL[k+5].tx+TRAIL[k].tz*TRAIL[k+5].tz<.985)k++;RAMPS.push(k);}
const rampProf=s=>s<=0||s>=12?0:s<9?2.6*s/9:2.6*(12-s)/3;
function rampH(x,z){for(const j of RAMPS){const p=TRAIL[j],dx=x-p.x,dz=z-p.z;if(dx*dx+dz*dz>200)continue;const sd=dx*p.tx+dz*p.tz;if(sd>0&&sd<12&&Math.abs(dx*p.nx+dz*p.nz)<9)return rampProf(sd);}return 0;}
const GY=(x,z)=>HM(x,z)+.45+rampH(x,z);
function nearTrail(x,z,r){for(const p of TRAIL)if((p.x-x)**2+(p.z-z)**2<r*r)return true;return false;}
// altura da malha do terreno tal como é desenhada (triângulos), para a mota assentar no chão
const TG={w:5200,d:2500,cx:0,cz:-1150,sx:300,sz:150};
function HM(x,z){const cw=TG.w/TG.sx,cd=TG.d/TG.sz,x0=TG.cx-TG.w/2,z0=TG.cz-TG.d/2,gx=(x-x0)/cw,gz=(z-z0)/cd,ix=Math.floor(gx),iz=Math.floor(gz);if(ix<0||iz<0||ix>=TG.sx||iz>=TG.sz)return hF(x,z);
  const u=gx-ix,v=gz-iz,ha=hF(x0+ix*cw,z0+iz*cd),hb=hF(x0+ix*cw,z0+(iz+1)*cd),hc=hF(x0+(ix+1)*cw,z0+(iz+1)*cd),hd=hF(x0+(ix+1)*cw,z0+iz*cd);
  return u+v<=1?ha+u*(hd-ha)+v*(hb-ha):hc+(1-u)*(hb-hc)+(1-v)*(hd-hc);}
let cfg={mode:'sea',veh:'sail',lveh:'bike'};

// mundo: Baía do Funchal
H=hF;world=new THREE.Group();scene.add(world);
terrain({terr:[5200,2500,0,-1150,300,150],h:hF,color(x,z,h,ny,c){const d=zsF(x)-z;if(h<2.5)c.set(0x6f6a60);else if(ny<.74)c.set(0x6a5f52);else if(h>520)c.set(0x6f7a52);else if(d<430&&Math.abs(x)<1050)c.set(0x8a9274);else c.set(0x3f7436);}});
buildFunchal();
sunDir.setFromSphericalCoords(1,deg(70),deg(215));su.sunPosition.value.copy(sunDir);
water.material.uniforms.sunDirection.value.copy(sunDir);water.material.uniforms.waterColor.value.copy(lin(0x0b4f66));
scene.environment=pmrem.fromScene(sky).texture;scene.fog.color.set(0xc4d8e4);scene.fog.near=900;scene.fog.far=5600;

// trilho: faixa de terra batida, estacas e arcos
function arch(x,y,z,tx,tz,w){const tex=canvasTex(512,64,g=>{for(let i=0;i<32;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*16,j*16,16,16);}}),gt=new THREE.Group(),bm=new THREE.MeshStandardMaterial({map:tex}),k=M(0x111111);
  for(const s of[-1,1])cyl(.35,.45,13,M(0xff4d5e,.5),s*w/2,6.5,0,10,gt);const ban=new THREE.Mesh(new THREE.BoxGeometry(w,1.8,.3),[k,k,k,k,bm,bm]);ban.position.y=12.5;gt.add(ban);gt.position.set(x,y,z);gt.lookAt(x+tx,y,z+tz);world.add(gt);}
{const pos=[],uv=[],idx=[];TRAIL.forEach((p,i)=>{for(let k=-2;k<=2;k++){const x=p.x+p.nx*k*5.5,z=p.z+p.nz*k*5.5;pos.push(x,HM(x,z)+.45,z);uv.push((k+2)/2,i/3);}
    if(i<TN-1)for(let k=0;k<4;k++){const q=i*5+k;idx.push(q,q+5,q+1,q+1,q+5,q+6);}});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const tex=groundTex.clone();tex.needsUpdate=true;const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:lin(0xa9824f),map:tex,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));m.receiveShadow=true;world.add(m);
  const n=Math.ceil(TN/4)*2,st=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.22,2.2,6),M(0xffffff,.6),n),mm=new THREE.Matrix4();let c=0;
  for(let i=0;i<TN;i+=4)for(const sd of[-1,1]){const p=TRAIL[i],x=p.x+p.nx*sd*12,z=p.z+p.nz*sd*12;mm.makeTranslation(x,HM(x,z)+1.1,z);st.setMatrixAt(c,mm);st.setColorAt(c,lin((i/4)%2?0xffffff:0xe8384f));c++;}
  st.count=c;world.add(st);
  for(const i of[3,TN-4]){const p=TRAIL[i];arch(p.x,HM(p.x,p.z),p.z,p.tx,p.tz,25);}
  const rt=canvasTex(128,128,g=>{g.fillStyle='#ffd23f';g.fillRect(0,0,128,128);g.fillStyle='#1a1a1a';for(let i=-128;i<256;i+=48){g.beginPath();g.moveTo(i,128);g.lineTo(i+24,128);g.lineTo(i+88,0);g.lineTo(i+64,0);g.fill();}},true),rm=new THREE.MeshStandardMaterial({map:rt,roughness:.7,side:THREE.DoubleSide});
  for(const j of RAMPS){const p=TRAIL[j],v=[],uvs=[];for(const sd of[0,9,12])for(const l of[-9,9]){const x=p.x+p.tx*sd+p.nx*l,z=p.z+p.tz*sd+p.nz*l;v.push(x,HM(x,z)+.5+rampProf(sd===12?0:sd),z);uvs.push(l>0?2:0,sd/6);}
    const g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g2.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g2.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,2,4,1,3,5]);g2.computeVertexNormals();const rmesh=new THREE.Mesh(g2,rm);rmesh.castShadow=rmesh.receiveShadow=true;world.add(rmesh);}}

// obstáculos fora do terreno: molhe, ilhéu com forte, navio, marina
const COL=[];const addSeg=(cx,cz,len,ang,r)=>{const dx=Math.cos(ang),dz=-Math.sin(ang);for(let s=-len/2;s<=len/2;s+=r*.8)COL.push([cx+dx*s,cz+dz*s,r]);};
{const bx=-560,bz=zsF(-560)+20,ang=-.1;addSeg(bx+310,bz+48,640,ang,12);COL.push([bx,bz+30,40]);addSeg(bx+330,bz+20,270,ang,19);for(let i=0;i<42;i++)COL.push([bx+10+i*15,bz+60-i*1.5,7]);
 addSeg(250,zsF(250)+70,150,.05,6);addSeg(328,zsF(328)+36,70,Math.PI/2,6);}
const blocked=(x,z)=>H(x,z)>-1.5||COL.some(c=>(x-c[0])**2+(z-c[1])**2<c[2]*c[2]);

// percurso: 3 boias e a linha de partida/chegada
const MARKS=[V(420,0,-60),V(-250,0,-80),V(-300,0,300),V(700,0,150),V(-650,0,150),V(250,0,550),V(-50,0,-150)],GATE=V(60,0,260),R_MARK=28,LET='ABCDEFG';
// cada volta tem o seu percurso; todas acabam na linha de partida/chegada
const LAPS=[[0,1,2],[3,5,4],[6,0,5]],LAPNAME=['Baía','Volta larga','Junto à cidade'];
const LANDPT=V(TRAIL[0].x,0,TRAIL[0].z+26);
const route=l=>[...LAPS[l%LAPS.length].map(i=>MARKS[i]),cfg.mode==='both'&&l===laps-1?LANDPT:GATE],tgt=b=>route(b.lap)[Math.min(b.mark,route(b.lap).length-1)],markId=b=>LAPS[b.lap%LAPS.length][b.mark];
const numTex=n=>canvasTex(128,128,g=>{g.fillStyle='rgba(6,18,28,.75)';g.beginPath();g.arc(64,64,58,0,7);g.fill();g.fillStyle='#fff';g.font='bold 80px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(n,64,68);});
const markObjs=MARKS.map((p,i)=>{const b=new THREE.Group();cyl(2.6,3.6,7,M(0xff6a1f,.4),0,1.5,0,16,b);cyl(3,3.1,1.2,M(0xffffff,.4),0,3.6,0,16,b);cyl(.15,.15,6,M(0x333333),0,8,0,6,b);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:numTex(LET[i]),depthTest:false}));sp.scale.set(9,9,1);sp.position.y=16;b.add(sp);b.position.copy(p);world.add(b);return b;});
{const tex=canvasTex(512,64,g=>{for(let i=0;i<32;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*16,j*16,16,16);}});const t=GATE.clone().sub(MARKS[2]).normalize(),gate=new THREE.Group(),bm=new THREE.MeshStandardMaterial({map:tex}),k=M(0x111111);
  for(const s of[-1,1])cyl(.6,.8,22,M(0xff4d5e,.5),s*25,11,0,10,gate);const ban=new THREE.Mesh(new THREE.BoxGeometry(50,3.4,.3),[k,k,k,k,bm,bm]);ban.position.y=21;gate.add(ban);gate.position.copy(GATE);gate.lookAt(GATE.clone().add(t));world.add(gate);}
const beacon=new THREE.Group();{const c=new THREE.Mesh(new THREE.CylinderGeometry(3,3,70,16,1,true),new THREE.MeshBasicMaterial({color:0xffe14a,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));c.position.y=35;beacon.add(c);
  const a=new THREE.Mesh(new THREE.ConeGeometry(3,6,12),new THREE.MeshBasicMaterial({color:0xffe14a}));a.rotation.x=Math.PI;a.name='arrow';beacon.add(a);scene.add(beacon);}

// vento: de nordeste, com rodas e rajadas iguais em todos os jogadores (dependem do tempo de corrida)
const W0=Math.atan2(1,1),windFrom=V(1,0,0),windTo=V(-1,0,0);let wAng=W0,gust=1;
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
function addBoat(p){const b=Object.assign(cfg.veh==='sail'?makeSailboat(COLORS[p.slot],String(p.slot+1)):makeMotor(COLORS[p.slot],cfg.veh),cfg.mode!=='sea'?(cfg.lveh==='buggy'?makeBuggy:makeBike)(COLORS[p.slot]):{},{land:0,ti:0,dir:1,y:0,vy:0,gy0:0,air:false,lean:0,pitch:0,rudIn:0,id:p.id,name:p.name,slot:p.slot,bot:!!p.bot,hex:COLORS[p.slot],x:0,z:0,hd:0,v:0,s:.3,mark:0,lap:0,fin:null,lee:1,luff:0,eff:0,twa:0,tx:0,tz:0,thd:0,seen:false,skill:p.bot?.88+Math.random()*.07:1,tack:1,fwd:V(1,0,0)});
  b.lb=document.createElement('div');b.lb.className='nm'+(p.id===myId?' me':'');b.lb.textContent=p.name;lbBox.appendChild(b.lb);boats.push(b);return b;}
function removeBoat(id){const b=boats.find(x=>x.id===id);if(!b)return;scene.remove(b.outer);if(b.bike)scene.remove(b.bike);b.lb.remove();boats=boats.filter(x=>x!==b);}
function clearBoats(){boats.slice().forEach(b=>removeBoat(b.id));me=null;}
const progress=b=>{if(b.fin!=null)return 1e9-b.fin;if(b.land)return 1e6+(b.lap*2*TN+(b.dir>0?b.ti:2*TN-b.ti))*10;const t=tgt(b);return (b.lap*10+b.mark)*1e4-Math.hypot(t.x-b.x,t.z-b.z);};

function physics(b,dt,rud,inp,drift){ // inp: vela (+ folga, - caça) ou acelerador (- acelera, + trava)
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
  for(const o of boats){if(o===b||o.land)continue;const dx=b.x-o.x,dz=b.z-o.z,d=Math.hypot(dx,dz);if(d<8&&d>.01){b.x+=dx/d*(8-d)*.5;b.z+=dz/d*(8-d)*.5;b.v*=.98;}}
  if(b.fin==null){const t=tgt(b),NM=route(b.lap).length;if((b.x-t.x)**2+(b.z-t.z)**2<R_MARK*R_MARK){
    if(b.mark===NM-1){if(cfg.mode==='both'&&b.lap===laps-1){enterLand(b);if(b===me)toast('Agora de mota! Segue o trilho até ao moinho',3);}
      else{b.lap++;if(b.lap>=laps){b.fin=raceT;if(b===me)onFinish();}else{b.mark=0;if(b===me)toast('Volta '+(b.lap+1)+' de '+laps+': '+LAPNAME[b.lap%LAPS.length]);}}}
    else{if(b===me)toast('Boia '+LET[markId(b)]+' ✓');b.mark++;}}}
}
function enterLand(b,i){const p=TRAIL[i||0];b.land=1;b.on=true;b.ti=i||0;b.dir=1;b.v=0;b.x=p.x;b.z=p.z;b.hd=b.va=Math.atan2(-p.tz,p.tx);b.y=b.gy0=GY(p.x,p.z);b.vy=0;b.tx=b.x;b.tz=b.z;b.thd=b.hd;}
function landPhysics(b,dt,rud,inp,drift){
  if(dt<=0)return;
  let bi=b.ti,bd=1e9;for(let j=Math.max(0,b.ti-8);j<=Math.min(TN-1,b.ti+8);j++){const p=TRAIL[j],d=(p.x-b.x)**2+(p.z-b.z)**2;if(d<bd){bd=d;bi=j;}}
  bd=Math.sqrt(bd);if(bd<34)b.ti=bi;const on=bd<12.5;b.on=on;
  const thr=b.fin!=null?0:b.bot?1:inp<0?1:inp>0?-1:0,fx=Math.cos(b.hd),fz=-Math.sin(b.hd),grade=(HM(b.x+fx*2,b.z+fz*2)-HM(b.x,b.z))/2;
  const bg=cfg.lveh==='buggy';let top=(on?(bg?31:34):(bg?21:13))*b.skill*(1-clamp(grade*.9,-.15,.45)),acc=thr>0?1.1:thr<0?2.5:.5,target=thr>0?top:0;
  if(b.boost>0||b.fav>0){target=Math.max(target,on?44:20);acc=2.5;}
  if(b.stun>0){target=2;acc=3;rud=0;b.hd+=7*dt;}
  b.rudIn=rud;const dr=drift&&b.v>8,slip=angDiff(b.hd,b.va);b.slip=slip;b.dr=dr;
  if(!b.air){b.v+=(target-b.v)*Math.min(1,dt*acc);b.v*=1-Math.min(1,Math.abs(slip))*(dr?.3:.6)*dt;
    b.hd+=rud*(bg?1.3:1.6)*(dr?1.7:1)*(1-.44*Math.min(1,b.v/34))*Math.min(1,.3+b.v/4)*dt;b.va+=slip*Math.min(1,dt*(dr?1.4:bg?5:7));}
  const mx=Math.cos(b.va),mz=-Math.sin(b.va),nx=b.x+mx*b.v*dt,nz=b.z+mz*b.v*dt;if(hF(nx,nz)<.3){b.v=0;b.x-=mx*.5;b.z-=mz*.5;}else{b.x=nx;b.z=nz;}
  for(const o of boats){if(o===b||!o.land)continue;const dx=b.x-o.x,dz=b.z-o.z,d=Math.hypot(dx,dz);const cr=bg?4.5:3;if(d<cr&&d>.01){b.x+=dx/d*(cr-d)*.5;b.z+=dz/d*(cr-d)*.5;}}
  const gy=GY(b.x,b.z);b.vy-=32*dt;b.y+=b.vy*dt;if(b.y<=gy){b.y=gy;b.vy=clamp((gy-b.gy0)/dt,-40,16);}b.air=b.y>gy+.35;b.gy0=gy;
  if(b.fin==null){
    if(b.dir>0&&b.ti>=TN-5){if(cfg.mode==='both'){b.fin=raceT;if(b===me)onFinish();}else{b.dir=-1;b.hd+=Math.PI;b.va=b.hd;b.v=0;if(b===me)toast('Moinho ✓ Agora a descer até à praia!',2.5);}}
    else if(b.dir<0&&b.ti<=4){b.lap++;if(b.lap>=laps){b.fin=raceT;if(b===me)onFinish();}else{b.dir=1;b.hd+=Math.PI;b.va=b.hd;b.v=0;if(b===me)toast('Volta '+(b.lap+1)+' de '+laps);}}}
}
function botCtl(b){if(b.land){const p=TRAIL[clamp(b.ti+b.dir*5,0,TN-1)],o=(b.slot%5-2)*2.6;return clamp(angDiff(Math.atan2(-(p.z+p.nz*o-b.z),p.x+p.nx*o-b.x),b.hd)*3,-1,1);}
  const t=tgt(b),tb=Math.atan2(-(t.z-b.z),t.x-b.x),d=angDiff(tb,wAng);let want;
  if(cfg.veh!=='sail'||Math.abs(d)>.85)want=tb;else{if(Math.abs(d)>.3)b.tack=Math.sign(d);want=wAng+b.tack*.82;
    if(blocked(b.x+Math.cos(want)*45,b.z-Math.sin(want)*45)){b.tack=-b.tack;want=wAng+b.tack*.82;}}
  return clamp(angDiff(want,b.hd)*2.5,-1,1);}
function visualLand(b,dt){const o=b.bike,fx=Math.cos(b.hd),fz=-Math.sin(b.hd);o.visible=true;
  if(b.remote){b.y=GY(b.x,b.z);b.rudIn=clamp(angDiff(b.thd,b.hd)*4,-1,1);}
  if(!b.air)b.pitch+=(Math.atan2(HM(b.x+fx*1.6,b.z+fz*1.6)-HM(b.x-fx*1.6,b.z-fz*1.6),3.2)-b.pitch)*Math.min(1,dt*10||1);
  b.lean+=(-b.rudIn*(cfg.lveh==='buggy'?.07:.4)*Math.min(1,b.v/15)-b.lean)*Math.min(1,dt*6);
  o.position.set(b.x,b.y,b.z);o.rotation.set(0,b.hd,0);o.rotateZ(b.pitch);o.rotateX(b.lean);b.bw.forEach(w=>w.rotation.z-=b.v*dt);b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce&&!b.air&&b.v>6)for(let j=Math.abs(b.slip||0)>.15?4:Math.random()<.6?1:0;j>0;j--)emit(b.x-fx*2.5,b.y+.4,b.z-fz*2.5,-fx*3+(Math.random()-.5)*4,0,-fz*3+(Math.random()-.5)*4,1.6,1.1,1);}
function visualMotor(b,dt){const o=b.outer,fx=Math.cos(b.hd),fz=-Math.sin(b.hd),k=Math.min(1,b.v/(BASE*1.2));
  if(b.remote){b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.eff=k;b.rudIn=clamp(angDiff(b.thd,b.hd)*4,-1,1);}
  b.lean+=(-b.rudIn*.35*k-b.lean)*Math.min(1,dt*5);
  o.position.set(b.x,.25+Math.sin(T*2.2+b.slot)*.12+k*.3,b.z);o.rotation.set(0,b.hd,0);o.rotateZ(k*.1);o.rotateX(b.lean);b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce&&k>.08){const sx=-fz,sz=fx;for(let j=0;j<2;j++){const sd=j?1:-1;if(Math.random()<k)emit(b.x+fx*3+sx*sd,.3,b.z+fz*3+sz*sd,sx*sd*(5+Math.random()*5),3+Math.random()*4*k,sz*sd*(5+Math.random()*5),.7,.5,0);emit(b.x-fx*5+sx*sd*.8,.12,b.z-fz*5+sz*sd*.8,sx*sd*2,0,sz*sd*2,4,.9,1);}
    if(b.boost>0)for(let j=0;j<4;j++)emit(b.x-fx*5,.5,b.z-fz*5,-fx*10+(Math.random()-.5)*6,4+Math.random()*5,-fz*10+(Math.random()-.5)*6,.8,.7,0);}}
function visual(b,dt){
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
{const legs=new Set();LAPS.forEach((L,li)=>{const r=route(li),from=[li?GATE:GATE,...r];for(let i=0;i<r.length;i++){const a=from[i],b=r[i],k=[a.x,a.z,b.x,b.z].join();if(legs.has(k))continue;legs.add(k);
  const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),px=-dz/l,pz=dx/l;
  for(const o of[-18,0,18]){const x=mx+px*o,z=mz+pz*o;if(blocked(x,z))continue;const m=new THREE.Mesh(boxGeo,boxMat);m.position.set(x,2.5,z);m.castShadow=true;scene.add(m);boxes.push({m,x,z,y:2.5,t:0});}}});
 for(const j of RAMPS){const p=TRAIL[Math.min(TN-8,j+22)];for(const o of[-7,0,7]){const x=p.x+p.nx*o,z=p.z+p.nz*o,y=HM(x,z)+3,m=new THREE.Mesh(boxGeo,boxMat);m.scale.setScalar(.7);m.position.set(x,y,z);scene.add(m);boxes.push({m,x,z,y,land:1,t:0});}}}
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
function hitBoat(b,by){b.stun=1.6;b.boost=0;if(b===me)toast(by==='algas'?'Ficaste preso nas algas!':'Atingido por '+by+'!',2);}
function addMine(id,x,z,by){const o=new THREE.Group();const d=new THREE.Mesh(new THREE.CylinderGeometry(6,6,.3,18),weedMat);o.add(d);for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(.5,3+Math.random()*2,5),weedMat);s.position.set((Math.random()-.5)*8,1.5,(Math.random()-.5)*8);o.add(s);}
  o.position.set(x,hF(x,z)>0?HM(x,z)+.6:.1,z);scene.add(o);mines.push({id,x,z,by,o,age:0});}
function removeMine(id){const m=mines.find(x=>x.id===id);if(!m)return;scene.remove(m.o);mines=mines.filter(x=>x!==m);}
function clearItems(){mines.slice().forEach(m=>removeMine(m.id));shots.forEach(s=>scene.remove(s.o));shots=[];boxes.forEach(b=>{b.t=0;b.m.visible=itemsOn&&(b.land?cfg.mode!=='sea':cfg.mode!=='land');});}
function onEv(e){if(!racing)return;const by=boats.find(b=>b.id===e.by);
  if(e.k==='ball'){const t=boats.find(b=>b.id===e.to);if(by&&t)fireBall(by,t);}
  else if(e.k==='weed'){if(!mines.some(m=>m.id===e.id))addMine(e.id,e.x,e.z,e.by);}
  else if(e.k==='gone')removeMine(e.id);}
function sendEv(e,except){if(solo)return;const m={t:'ev',e};if(isHost)conns.forEach(c=>{if(c!==except&&c.open)c.send(m);});else if(hostConn&&hostConn.open)hostConn.send(m);}

/* ---------- entrada ---------- */
const keys={},touch={};
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=1;if((e.code==='Escape'||e.code==='KeyP')&&racing&&$('results').hidden)setPause(!paused);if((e.code==='Space'||e.code==='KeyE')&&racing&&me&&raceT>0&&!paused){e.preventDefault();useItem(me);}if(e.code==='KeyC'&&racing)camMode=(camMode+1)%3;if(/Arrow/.test(e.code)&&racing)e.preventDefault();});
addEventListener('keyup',e=>{keys[e.code]=0;});
document.getElementById('bitem').addEventListener('pointerdown',e=>{e.preventDefault();if(racing&&me&&raceT>0)useItem(me);});
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
  else if(d.t==='start')startRace(d.players,d.laps,d.items,d.mode,d.veh,d.lveh);
  else if(d.t==='s')applyStates(d.b);
  else if(d.t==='ev')onEv(d.e);}
const pack=b=>[b.id,+b.x.toFixed(1),+b.z.toFixed(1),+b.hd.toFixed(3),+b.v.toFixed(2),+b.s.toFixed(2),b.mark,b.lap,b.fin,b.land,b.ti,b.dir];
function applyStates(arr){if(!racing)return;for(const p of arr){if(p[0]===myId)continue;const b=boats.find(x=>x.id===p[0]);if(!b||!b.remote)continue;
  const wl=b.land;[,b.tx,b.tz,b.thd,b.v,b.s,b.mark,b.lap,b.fin,b.land,b.ti,b.dir]=p;if(!b.seen||b.land&&!wl){b.x=b.tx;b.z=b.tz;b.hd=b.thd;b.seen=true;}}}

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
$('bsolo').onclick=()=>{saveName();resetNet();isHost=true;solo=true;myId='h';laps=+$('slaps').value;lastPs=fillBots([{id:'h',name:myName(),slot:0}],1+(+$('sboats').value));startRace(lastPs,laps,$('sitems').checked,$('smode').value,$('sveh').value,$('slveh').value);};
$('bstart').onclick=()=>{laps=+$('laps').value;const ps=fillBots(players,players.length+(+$('nboats').value));itemsOn=$('ritems').checked;cfg={mode:$('rmode').value,veh:$('rveh').value,lveh:$('rlveh').value};bcast({t:'start',players:ps,laps,items:itemsOn,mode:cfg.mode,veh:cfg.veh,lveh:cfg.lveh});startRace(ps,laps,itemsOn,cfg.mode,cfg.veh,cfg.lveh);};
$('bleave').onclick=()=>{resetNet();showMenu('main');};
$('bcopy').onclick=()=>{$('rlink').select();navigator.clipboard&&navigator.clipboard.writeText($('rlink').value);$('bcopy').textContent='Copiado';setTimeout(()=>$('bcopy').textContent='Copiar',1500);};
$('nboats').onchange=()=>showRoom();$('laps').onchange=()=>{laps=+$('laps').value;if(isHost)bcast({t:'lobby',players,laps});};
$('bagain').onclick=()=>{if(solo)restart();else if(isHost){endRace();sendLobby();}};
function restart(){if(!lastPs)return;if(!solo&&isHost)bcast({t:'start',players:lastPs,laps,items:itemsOn,mode:cfg.mode,veh:cfg.veh,lveh:cfg.lveh});startRace(lastPs,laps,itemsOn,cfg.mode,cfg.veh,cfg.lveh);}
function setPause(v){paused=v;$('pause').hidden=!v;if(!v)return;
  $('pnote').textContent=solo?'Corrida em pausa.':'No multijogador a corrida continua enquanto este menu está aberto.';
  $('prestart').hidden=!(solo||isHost);$('plobby').hidden=!(isHost&&!solo);$('prestart').textContent=solo?'Recomeçar':'Recomeçar para todos';}
$('bpause').onclick=()=>setPause(true);$('presume').onclick=()=>setPause(false);$('prestart').onclick=()=>restart();
$('phome').onclick=()=>{endRace();resetNet();showMenu('main');};
$('plobby').onclick=()=>{if(isHost&&!solo){endRace();sendLobby();}};
$('bmenu').onclick=()=>{endRace();resetNet();showMenu('main');};
function fillBots(ps,total){const out=ps.slice(),names=['Marta','Rui','Inês','Tiago','Sofia','Duarte','Beatriz','Miguel','Carolina','João','Leonor','Pedro','Mariana','Tomás'];let k=0;for(let s=0;s<MAXB&&out.length<total;s++)if(!out.some(p=>p.slot===s))out.push({id:'bot'+s,name:names[k++%names.length],slot:s,bot:true});return out;}
function saveName(){try{localStorage.setItem('regata-nome',myName());}catch(e){}}
for(const k of['s','r']){const f=()=>{$(k+'veh').disabled=$(k+'mode').value==='land';$(k+'lveh').disabled=$(k+'mode').value==='sea';};$(k+'mode').onchange=f;f();}
try{$('name').value=localStorage.getItem('regata-nome')||'';}catch(e){}
{const q=new URLSearchParams(location.search).get('sala');if(q)$('jcode').value=q.toUpperCase();}

/* ---------- corrida ---------- */
let lastPs=null,paused=false,raceT=-99,t0=0,camMode=0,netT=0,hudT=0,mapT=0,snap=true,finShown=false;
function startRace(ps,lp,it,mode,veh,lveh){
  clearBoats();cfg={mode:mode||'sea',veh:veh||'sail',lveh:lveh||'bike'};laps=lp;itemsOn=it!==false;clearItems();racing=true;finShown=false;lastPs=ps;setPause(false);
  const dir=MARKS[0].clone().sub(GATE).normalize(),perp=V(-dir.z,0,dir.x),brg=Math.atan2(-dir.z,dir.x);
  for(const p of ps){const b=addBoat(p);b.remote=!(p.id===myId||(isHost&&p.bot));
    const gi=ps.indexOf(p),row=Math.floor(gi/5),col=gi%5-2;b.x=GATE.x-dir.x*(45+row*20)+perp.x*col*14;b.z=GATE.z-dir.z*(45+row*20)+perp.z*col*14;
    b.hd=Math.abs(angDiff(W0+.85,brg))<Math.abs(angDiff(W0-.85,brg))?W0+.85:W0-.85;b.tx=b.x;b.tz=b.z;b.thd=b.hd;b.tack=b.hd>W0?1:-1;
    if(cfg.mode==='land'){const row=Math.floor(gi/4),s=TRAIL[5+row*2];enterLand(b,5+row*2);b.x+=s.nx*(gi%4-1.5)*4.5;b.z+=s.nz*(gi%4-1.5)*4.5;b.tx=b.x;b.tz=b.z;b.outer.visible=false;}
    if(p.id===myId)me=b;}
  t0=performance.now()+4000;raceT=-4;snap=true;pL.fill(0);
  $('menu').hidden=true;$('results').hidden=true;$('hud').hidden=false;}
function endRace(){racing=false;clearItems();setPause(false);clearBoats();$('hud').hidden=true;$('results').hidden=true;$('cd').textContent='';}
const fmt=t=>t==null?'—':String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(2).padStart(5,'0');
function onFinish(){const pos=[...boats].sort((a,c)=>progress(c)-progress(a)).indexOf(me)+1;toast('Chegada! '+pos+'.º lugar',3);}
function renderResults(){const ord=[...boats].sort((a,c)=>progress(c)-progress(a));
  $('rtable').innerHTML=ord.map((b,i)=>`<tr${b===me?' class="me"':''}><td>${i+1}.º</td><td><span class="dot" style="background:#${new THREE.Color(b.hex).getHexString()}"></span>${esc(b.name)}</td><td>${b.fin!=null?fmt(b.fin):'a navegar…'}</td></tr>`).join('');
  $('bagain').hidden=!(solo||isHost);$('rwait2').hidden=solo||isHost;$('bagain').textContent=solo?'Repetir':'Nova corrida';}
let toastT=0;function toast(s,dur){const e=$('toast');if(e.textContent===s&&toastT>0)return;e.textContent=s;e.classList.add('on');toastT=dur||1.6;}

/* ---------- HUD ---------- */
const pointName=d=>d<40?'Contra o vento':d<70?'Bolina':d<120?'Través':d<155?'Largo':'Popa';
const mapC=$('map'),mg=mapC.getContext('2d');
function drawMap(){const land=me&&me.land,MX=land?[-100,1300]:[-750,750],MZ=land?[-1170,-290]:[-420,480];const w=mapC.width,h=mapC.height,sx=x=>(x-MX[0])/(MX[1]-MX[0])*w,sz=z=>(z-MZ[0])/(MZ[1]-MZ[0])*h;
  mg.clearRect(0,0,w,h);mg.fillStyle='rgba(11,79,102,.55)';mg.fillRect(0,0,w,h);mg.fillStyle='rgba(70,110,60,.9)';mg.beginPath();mg.moveTo(0,0);for(let x=MX[0];x<=MX[1];x+=25)mg.lineTo(sx(x),sz(zsF(x)));mg.lineTo(w,0);mg.fill();
  mg.fillStyle='rgba(170,165,150,.95)';for(const c of COL){mg.beginPath();mg.arc(sx(c[0]),sz(c[1]),Math.max(1.2,c[2]/(MX[1]-MX[0])*w),0,7);mg.fill();}
  mg.strokeStyle='#c9a06a';mg.lineWidth=land?4:2;mg.beginPath();TRAIL.forEach((p,i)=>i?mg.lineTo(sx(p.x),sz(p.z)):mg.moveTo(sx(p.x),sz(p.z)));if(cfg.mode!=='sea')mg.stroke();mg.lineWidth=1;
  mg.strokeStyle='rgba(255,255,255,.35)';mg.setLineDash([4,4]);mg.beginPath();const RT=land?[]:me?route(me.lap):route(0);if(!land)mg.moveTo(sx(GATE.x),sz(GATE.z));RT.forEach(p=>mg.lineTo(sx(p.x),sz(p.z)));mg.stroke();mg.setLineDash([]);
  RT.forEach((p,i)=>{const nx=me&&me.mark===i&&me.fin==null;mg.fillStyle=i===RT.length-1?'#fff':'#ff6a1f';mg.beginPath();mg.arc(sx(p.x),sz(p.z),nx?6:4,0,7);mg.fill();if(nx){mg.strokeStyle='#ffe14a';mg.lineWidth=2;mg.stroke();mg.lineWidth=1;}});
  for(const b of boats){mg.save();mg.translate(sx(b.x),sz(b.z));mg.rotate(-b.hd);mg.fillStyle='#'+new THREE.Color(b.hex).getHexString();mg.beginPath();mg.moveTo(7,0);mg.lineTo(-4,4);mg.lineTo(-4,-4);mg.fill();if(b===me){mg.strokeStyle='#fff';mg.stroke();}mg.restore();}
  const wx=w-18,wy=18;mg.strokeStyle='#5fd0ff';mg.lineWidth=2.5;mg.beginPath();mg.moveTo(wx+windFrom.x*12,wy+windFrom.z*12);mg.lineTo(wx-windFrom.x*8,wy-windFrom.z*8);mg.stroke();mg.lineWidth=1;}
function hud(look){const el=x=>$(x);
  if(raceT<0)el('cd').textContent=Math.ceil(-raceT);else if(raceT<1.2)el('cd').textContent='Partida!';else el('cd').textContent='';
  const lap=Math.min(me.lap+1,laps);el('clock').textContent=(me.fin!=null?'CHEGADA · '+fmt(me.fin):me.land&&cfg.mode==='both'?'MOTA · '+fmt(Math.max(0,raceT)):'VOLTA '+lap+'/'+laps+' · '+fmt(Math.max(0,raceT)));
  const d=Math.round(me.twa*180/Math.PI);el('twa').textContent=d+'°';el('pt').textContent=pointName(d);
  el('kn').firstChild.nodeValue=(me.v*KN).toFixed(1)+' ';el('effb').style.width=Math.round(clamp(me.eff,0,1)*100)+'%';el('wspd').textContent='NE '+Math.round(18*gust)+' nós';
  const camYaw=Math.atan2(look.x-cam.position.x,-(look.z-cam.position.z)),wYaw=Math.atan2(windFrom.x,-windFrom.z);el('warrow').setAttribute('transform','rotate('+((wYaw-camYaw)*180/Math.PI).toFixed(1)+')');
  const it=me.item;$('islot').textContent=it?ITEMS[it].ic:'';$('iname').textContent=it?ITEMS[it].nm:(me.boost>0?'Turbo!':me.fav>0?'Vento de feição!':'—');$('item').hidden=!itemsOn;
  const sail=cfg.veh==='sail'&&!me.land;$('windw').hidden=!!me.land;$('efl').textContent=sail?'EFICIÊNCIA DA VELA':'VELOCIDADE';$('keys').textContent=sail?'A/D ou ←/→ leme · W/S ou ↑/↓ caçar/folgar a vela · Espaço objeto · C câmara · Esc menu':'A/D ou ←/→ virar · W ou ↑ acelerar · S ou ↓ travar'+(me.land?' · Shift derrapar':'')+' · Espaço objeto · C câmara · Esc menu';document.body.classList.toggle('land',!!me.land);
  if(!sail){el('kn').firstChild.nodeValue=me.land?Math.round(me.v*3.6)+' ':(me.v*1.6).toFixed(0)+' ';el('knu').textContent=me.land?'km/h':'nós';el('effb').style.width=Math.round(clamp(me.land?me.v/34:me.eff,0,1)*100)+'%';}else el('knu').textContent='nós';
  let tip='';if(!sail)tip=me.land&&!me.on?'Fora do trilho!':me.land&&me.dr?'A derrapar!':'';else if(me.twa<.61)tip='Estás contra o vento: vira para um dos lados';else if(me.s>me.ideal+.1)tip='Caça a vela (W ou ↑)';else if(me.s<me.ideal-.1)tip='Folga a vela (S ou ↓)';else tip='Vela bem afinada';el('tip').textContent=tip;el('tip').className=tip==='Vela bem afinada'?'ok':'';
  if(me.fin==null&&me.land){const p=TRAIL[clamp(me.ti+me.dir*6,0,TN-1)],dx=p.x-me.x,dz=p.z-me.z;el('nxt').textContent=(me.dir>0?(cfg.mode==='both'?'Meta no moinho':'Moinho'):'Praia')+' · '+Math.round((me.dir>0?TN-1-me.ti:me.ti)*TSTEP)+' m';
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
  if(!reduce)for(let k=0;k<5;k++)emit(cam.position.x+(Math.random()-.5)*120,2+Math.random()*16,cam.position.z+(Math.random()-.5)*120,windTo.x*34*gust,0,windTo.z*34*gust,2.5,.22,2);
  stepParticles(dt);
  if(!me){renderer.render(scene,cam);return;}
  const cur=me.land?me.bike.position:me.outer.position;
  if(me.land){const p=TRAIL[me.dir>0?TN-1:0];beacon.visible=me.fin==null;beacon.position.set(p.x,HM(p.x,p.z),p.z);}
  else{const nm=tgt(me),lastM=me.mark===route(me.lap).length-1;beacon.visible=me.fin==null&&(!lastM||cfg.mode==='both'&&me.lap===laps-1);beacon.position.set(nm.x,0,nm.z);}
  beacon.getObjectByName('arrow').position.y=24+Math.sin(T*3)*2;
  const mp=cur,f=me.fwd,L=me.land;let want,look;
  if(camMode===0){want=mp.clone().addScaledVector(f,L?-15:-26);want.y=mp.y+(L?7:10);look=mp.clone().addScaledVector(f,24);look.y=mp.y+(L?3:6);}
  else if(camMode===1){want=mp.clone().addScaledVector(f,-70);want.y=mp.y+55;look=mp.clone().addScaledVector(f,30);}
  else{want=mp.clone().add(V(0,240,140));look=mp.clone();}
  if(L)want.y=Math.max(want.y,HM(want.x,want.z)+3);
  if(snap||L!==wasLand)cam.position.copy(want);else cam.position.lerp(want,Math.min(1,dt*(L?5:3)));wasLand=L;cam.lookAt(look);snap=false;
  sun.position.copy(mp).addScaledVector(sunDir,600);sun.target.position.copy(mp);
  renderer.render(scene,cam);
  const w=host.clientWidth,h=host.clientHeight;
  for(const b of boats){tmp.copy(b.land?b.bike.position:b.outer.position);tmp.y+=b.land?7:cfg.veh==='sail'?20:8;tmp.project(cam);const vis=tmp.z<1&&Math.abs(tmp.x)<1.05&&Math.abs(tmp.y)<1.05;b.lb.hidden=!vis;b.lb.style.left=((tmp.x+1)/2*w)+'px';b.lb.style.top=((1-tmp.y)/2*h)+'px';}
  hudT-=dt;if(hudT<=0){hudT=.15;hud(look);}
  mapT-=dt;if(mapT<=0){mapT=.1;drawMap();}
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('on');}
  netT-=dt;if(netT<=0&&!solo){netT=.066;if(isHost&&conns.length)bcast({t:'s',b:boats.filter(b=>!b.remote||b.seen).map(pack)});else if(hostConn&&hostConn.open)hostConn.send({t:'s',b:[pack(me)]});}
}
let T=0;showMenu('main');requestAnimationFrame(frame);
window.__regata={get boats(){return boats;},get me(){return me;},sim(sec){for(let t=0;t<sec;t+=1/30){t0-=1000/30;raceT+=1/30;setWind(Math.max(0,raceT));if(raceT<0)continue;for(const b of boats)if(!b.remote)physics(b,1/30,b.fin!=null?0:b.bot?botCtl(b):0,0);stepItems(1/30);}}};
})();
