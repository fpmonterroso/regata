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
renderer.setPixelRatio(+new URLSearchParams(location.search).get('px')||(LOW?1:Math.min(2,devicePixelRatio||1)));
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.72;
renderer.shadowMap.enabled=!LOW;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xc4d8e4,.00036);
const cam=new THREE.PerspectiveCamera(56,16/9,0.5,20000);
let comp=null;function size(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);if(comp)comp.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();}
function draw(){if(comp)comp.render();else renderer.render(scene,cam);}
function initPost(){if(LOW||!THREE.EffectComposer||!renderer.capabilities.isWebGL2||new URLSearchParams(location.search).get('bloom')==='0')return;
  try{const ds=renderer.getDrawingBufferSize(new THREE.Vector2());const rt=new THREE.WebGLMultisampleRenderTarget(ds.x,ds.y,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    const c=new THREE.EffectComposer(renderer,rt);c.addPass(new THREE.RenderPass(scene,cam));
    c.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(ds.x/2,ds.y/2),.2,.4,.96));c.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));comp=c;size();}catch(e){console.warn('bloom desligado',e);comp=null;}}
initPost();
new ResizeObserver(size).observe(host);size();

const sunDir=V(0,1,0);
const sky=new THREE.Sky();sky.scale.setScalar(10000);scene.add(sky);
const su=sky.material.uniforms;su.turbidity.value=5.5;su.rayleigh.value=1.9;su.mieCoefficient.value=0.004;su.mieDirectionalG.value=0.82;
const pmrem=new THREE.PMREMGenerator(renderer);let envRT=null;
const sun=new THREE.DirectionalLight(0xffe2bd,2.7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-220,right:220,top:220,bottom:-220,far:1400});sun.shadow.bias=-0.0006;sun.shadow.normalBias=.6;scene.add(sun);scene.add(sun.target);
scene.add(new THREE.HemisphereLight(0xbcd8ff,0x6a6248,0.85));

/* ---------- texturas geradas ---------- */
function canvasTex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=4;return t;}
function normalMap(N){
  const c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d');const img=g.createImageData(N,N);
  const waves=[];for(let i=0;i<40;i++){const kx=Math.round((rnd()*2-1)*14),ky=Math.round((rnd()*2-1)*14);if(!kx&&!ky)continue;waves.push([kx,ky,rnd()*6.28,1/Math.hypot(kx,ky)]);}
  const H=new Float32Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){let h=0;for(const w of waves)h+=Math.sin(6.2832*(w[0]*x+w[1]*y)/N+w[2])*w[3];H[y*N+x]=h;}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const dx=H[y*N+(x+1)%N]-H[y*N+(x-1+N)%N],dy=H[((y+1)%N)*N+x]-H[((y-1+N)%N)*N+x];let nx=-dx*3,ny=-dy*3,nz=1;const l=Math.hypot(nx,ny,nz);const o=(y*N+x)*4;img.data[o]=(nx/l*.5+.5)*255;img.data[o+1]=(ny/l*.5+.5)*255;img.data[o+2]=(nz/l*.5+.5)*255;img.data[o+3]=255;}
  g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
const winTex=(cols,rows,arc)=>canvasTex(256,256,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);
  for(let i=0;i<2600;i++){g.fillStyle=`rgba(${rnd()>.5?0:255},${rnd()>.5?0:255},${rnd()>.5?0:200},${.012+rnd()*.03})`;g.fillRect(rnd()*w,rnd()*h,2+rnd()*10,1+rnd()*5);}
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(0,0,0,.10)');gr.addColorStop(.08,'rgba(0,0,0,0)');gr.addColorStop(.86,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(40,30,20,.28)');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(90,86,80,.55)';g.fillRect(0,h-9,w,9);
  const cw=w/cols,rh=h/rows;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=c*cw+cw*.33,y=r*rh+rh*.24,ww=cw*.34,hh=rh*.52;
    if(arc&&r===rows-1){g.fillStyle='#262b33';g.beginPath();g.moveTo(c*cw+cw*.18,h);g.lineTo(c*cw+cw*.18,y+hh*.5);g.arc(c*cw+cw*.5,y+hh*.5,cw*.32,Math.PI,0);g.lineTo(c*cw+cw*.82,h);g.fill();continue;}
    const door=r===rows-1&&c===Math.floor(cols/2)&&rows<4;
    g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x-3,y+hh+2,ww+6,3);g.fillStyle='#d8d2c4';g.fillRect(x-3,y-3,ww+6,(door?rh-y+r*rh:hh)+6);
    if(door){g.fillStyle='#4a3524';g.fillRect(x,y,ww,rh);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+ww/2-.5,y,1,rh);continue;}
    const lit=(r*3+c)%5===0;g.fillStyle=lit?'#7f97aa':'#3f5062';g.fillRect(x,y,ww,hh);g.fillStyle='rgba(255,255,255,.22)';g.fillRect(x,y,ww*.45,hh*.4);
    g.fillStyle='#e9e6de';g.fillRect(x+ww/2-.8,y,1.6,hh);g.fillRect(x,y+hh*.45,ww,1.4);
    if((r+c)%3!==1){g.fillStyle=(r+c)%2?'#2f5a44':'#51606b';g.fillRect(x-ww*.42,y,ww*.36,hh);g.fillRect(x+ww*1.06,y,ww*.36,hh);g.fillStyle='rgba(0,0,0,.2)';for(let q=2;q<hh;q+=4){g.fillRect(x-ww*.42,y+q,ww*.36,1);g.fillRect(x+ww*1.06,y+q,ww*.36,1);}}
    g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x-3,y+hh+3,ww+6,2);}},false);
const wallTex=winTex(3,2),tallTex=winTex(3,5),arcTex=winTex(5,2,true),blockTex=winTex(6,6);
const roofTex=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#fff';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=6){const v=205+rnd()*50;g.fillStyle=`rgb(${v},${v-8},${v-14})`;g.fillRect(x+(y/8%2)*3,y,6,8);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x+(y/8%2)*3,y+7,6,1);g.fillStyle='rgba(0,0,0,.09)';g.fillRect(x+(y/8%2)*3,y,1,8);}for(let i=0;i<40;i++){g.fillStyle='rgba(60,40,20,.12)';g.beginPath();g.arc(rnd()*w,rnd()*h,3+rnd()*9,0,7);g.fill();}},true);
const groundTex=canvasTex(256,256,(g,w,h)=>{const im=g.createImageData(w,h);for(let i=0;i<w*h;i++){const v=200+rnd()*55;im.data[i*4]=im.data[i*4+1]=im.data[i*4+2]=v;im.data[i*4+3]=255;}g.putImageData(im,0,0);g.globalAlpha=.25;for(let i=0;i<300;i++){g.fillStyle=rnd()>.5?'#fff':'#999';g.beginPath();g.arc(rnd()*w,rnd()*h,2+rnd()*7,0,7);g.fill();}},true);

/* ---------- água ---------- */
const water=new THREE.Water(new THREE.PlaneGeometry(14000,14000),{textureWidth:LOW?256:1024,textureHeight:LOW?256:1024,waterNormals:normalMap(256),sunDirection:sunDir.clone(),sunColor:0xfff0d8,waterColor:0x0b4f66,distortionScale:3,fog:true});
water.rotation.x=-Math.PI/2;water.material.uniforms.size.value=2.4;scene.add(water);
const WST=LOW?9:4.5;
{const c=[];for(let x=-432;x<=432.01;x+=WST)c.push(x);let e=432,d=WST;const o=[];while(e<7500){d*=1.45;e+=d;o.push(e);}const co=[...o.slice().reverse().map(v=>-v),...c,...o],n=co.length,pos=new Float32Array(n*n*3),nor=new Float32Array(n*n*3),idx=[];
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const q=(j*n+i)*3;pos[q]=co[i];pos[q+1]=co[j];nor[q+2]=1;if(i<n-1&&j<n-1){const a=j*n+i;idx.push(a,a+1,a+n,a+1,a+n+1,a+n);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));g.setIndex(idx);water.geometry=g;water.frustumCulled=false;}
// ondas: soma de sinusoides, igual no shader e na física (getWaveHeight)
const WV=[[78,.35,1],[47,-.5,.62],[29,1.1,.36],[17,-1.3,.2],[11,.2,.1]].map(([L,a,A])=>({L,a0:a,dx:1,dz:0,k:6.2832/L,a:A,w:Math.sqrt(9.8*6.2832/L)*.75})),WSUM=WV.reduce((s,w)=>s+w.a,0);
let waveAmp=.3;const waveC=new THREE.Vector2();
{const wm=water.material,u=wm.uniforms;u.wv={value:WV.map(()=>new THREE.Vector4())};u.wph={value:[0,0,0,0,0]};u.wAmp={value:.3};u.wC={value:waveC};u.wCrest={value:1};u.flow={value:new THREE.Vector2()};u.wLin={value:comp?1:0};
  wm.vertexShader=wm.vertexShader.replace('uniform float time;','uniform float time;uniform vec4 wv[5];uniform float wph[5];uniform float wAmp;uniform vec2 wC;varying vec3 vWave;')
    .replace('worldPosition = mirrorCoord.xyzw;','vec2 wg=vec2(0.);float wh=0.;float att=wAmp*(1.-smoothstep(300.,425.,distance(mirrorCoord.xz,wC)));for(int i=0;i<5;i++){float ph=wv[i].z*dot(wv[i].xy,mirrorCoord.xz)-wph[i];float a=wv[i].w*att;wh+=a*sin(ph);wg+=a*wv[i].z*cos(ph)*wv[i].xy;}vWave=vec3(wg,wh);worldPosition = mirrorCoord.xyzw;worldPosition.y+=wh;')
    .replace('vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );','vec4 mvPosition = viewMatrix * worldPosition;');
  wm.fragmentShader=wm.fragmentShader.replace('uniform vec3 waterColor;','uniform vec3 waterColor;uniform float wCrest;uniform vec2 flow;uniform float wLin;varying vec3 vWave;')
    .replace('#include <fog_fragment>','#include <fog_fragment>\n if(wLin>.5)gl_FragColor.rgb=pow(max(gl_FragColor.rgb,vec3(0.)),vec3(2.2));')
    .replace('getNoise( worldPosition.xz * size )','getNoise( (worldPosition.xz - flow*time) * size )')
    .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );','vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) + vec3(-vWave.x,0.,-vWave.y)*1.3 );')
    .replace('* waterColor;','* waterColor * 2.7 + waterColor * .55;').replace('float rf0 = 0.3;','float rf0 = 0.11;').replace('( 0.001 + 1.0 / distance )','( 0.001 + 0.5 / distance )')
    .replace('gl_FragColor = vec4( outgoingLight, alpha );','float fl=length(flow);if(fl>.01){vec2 fd=flow/fl,fp=vec2(dot(worldPosition.xz,fd)-time*fl*1.6,dot(worldPosition.xz,vec2(-fd.y,fd.x)));float st=texture2D(normalSampler,fp*vec2(.004,.03)).r;outgoingLight+=vec3(.05,.065,.06)*smoothstep(.56,.8,st);}float cr=vWave.z/wCrest;vec4 fn=texture2D(normalSampler,worldPosition.xz*.021+vec2(time*.013,-time*.009));float fo=smoothstep(.62,1.05,cr+(fn.r-.5)*.9+(fn.g-.5)*.5)*smoothstep(.25,.6,wCrest);outgoingLight+=vec3(.02,.2,.22)*max(0.,cr)*.5;outgoingLight=mix(outgoingLight,vec3(.93,.96,.97)*(.55+.45*getShadowMask()),fo*.85);gl_FragColor = vec4( outgoingLight, alpha );');
  if(wm.vertexShader.indexOf('vWave')<0||wm.fragmentShader.indexOf('wCrest')<0)console.warn('ondas: shader não alterado');}
function setWaveDir(ang){WV.forEach((w,i)=>{w.dx=Math.cos(ang+w.a0);w.dz=Math.sin(ang+w.a0);water.material.uniforms.wv.value[i].set(w.dx,w.dz,w.k,w.a);});}
function waveAtt(x,z){const d=Math.hypot(x-waveC.x,z-waveC.y);return waveAmp*(1-sm(d,300,425));}
function getWaveHeight(x,z,t){const at=waveAtt(x,z);if(at<=0)return 0;let h=0;for(const w of WV)h+=w.a*Math.sin(w.k*(w.dx*x+w.dz*z)-w.w*t);return h*at;}
function waveSlope(x,z,t){const at=waveAtt(x,z);let gx=0,gz=0;if(at>0)for(const w of WV){const c=w.a*w.k*Math.cos(w.k*(w.dx*x+w.dz*z)-w.w*t)*at;gx+=c*w.dx;gz+=c*w.dz;}return [gx,gz];}
function stepWaves(t,cx,cz){waveC.set(cx,cz);const u=water.material.uniforms;WV.forEach((w,i)=>u.wph.value[i]=(w.w*t)%6.2832);u.wAmp.value=waveAmp;u.wCrest.value=Math.max(.05,waveAmp*WSUM*.62);water.position.x=Math.round(cx/WST)*WST;water.position.z=Math.round(cz/WST)*WST;}
setWaveDir(Math.atan2(1,-1));

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
const treeGeo=(()=>{const pos=[],nor=[],col=[],v=V();for(const [cx,cy,cz,r,dt] of[[0,0,0,1,1],[.6,.3,.25,.7,0],[-.55,.15,-.35,.74,0],[.05,.6,-.15,.66,0]].slice(0,LOW?3:4)){const g=new THREE.IcosahedronGeometry(r,dt),p=g.attributes.position;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const w=1+.13*Math.sin(v.x*9+v.y*7)*Math.cos(v.z*8);v.multiplyScalar(w);pos.push(v.x+cx,v.y+cy,v.z+cz);const n=V(v.x+cx*.6,v.y+cy*.6+.25,v.z+cz*.6).normalize();nor.push(n.x,n.y,n.z);const sh=.5+.5*clamp((v.y+cy+1)/1.9,0,1);col.push(sh,sh,sh*.95);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));return g;})();
const TREEC=[0x244f27,0x2d5f2c,0x1f4423,0x38692f,0x4a6b2a,0x2a5a38];
function trees(list){list.forEach((o,i)=>TREES.push({x:o.x,z:o.z,r:o.r,c:TREEC[i%4]}));const n=list.length;const t=new THREE.InstancedMesh(treeGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95}),n);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=V(),p=V(),up=V(0,1,0);
  list.forEach((o,i)=>{q.setFromAxisAngle(up,i*2.4);m.compose(p.set(o.x,H(o.x,o.z)+o.r*.75,o.z),q,s.set(o.r*(.9+(i%5)*.05),o.r*(1.15+(i%3)*.15),o.r*(.9+(i%4)*.05)));t.setMatrixAt(i,m);t.setColorAt(i,lin(TREEC[i%TREEC.length]));});t.castShadow=true;t.receiveShadow=true;world.add(t);}
function terrain(L){const [w,d,cx,cz,sx,sz]=L.terr;const geo=new THREE.PlaneGeometry(w,d,sx,sz);geo.rotateX(-Math.PI/2);geo.translate(cx,0,cz);const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setY(i,L.h(pos.getX(i),pos.getZ(i)));geo.computeVertexNormals();const nor=geo.attributes.normal,col=new Float32Array(pos.count*3),c=new THREE.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);L.color(x,z,pos.getY(i),nor.getY(i),c);c.convertSRGBToLinear();const f1=Math.sin(x*.013+z*.007+Math.sin(z*.011))*Math.cos(z*.017-x*.009),f2=Math.sin(x*.061+z*.043)*Math.cos(z*.071-x*.037),n=.86+.22*(Math.sin(x*.13+z*.07)*Math.cos(z*.11-x*.05)*.5+.5)+.1*f1,dry=clamp(.5+.9*f1+.3*f2,0,1)*.22;col[i*3]=c.r*n+dry*.09;col[i*3+1]=c.g*n+dry*.05;col[i*3+2]=c.b*n*(1-dry*.5);}
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));const tex=groundTex.clone();tex.needsUpdate=true;tex.repeat.set(w/50,d/50);
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,map:tex,roughness:.96,bumpMap:tex,bumpScale:LOW?0:.9});
  mat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWp;varying float vNy;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWp=position;vNy=normal.y;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWp;varying float vNy;').replace('#include <color_fragment>',`#include <color_fragment>
      float tn1=texture2D(map,vWp.xz*.0037).r,tn2=texture2D(map,vWp.xz*.093).r,tn3=texture2D(map,vWp.zx*.021+.37).r;
      float rk=smoothstep(.8,.64,vNy+(tn1-.5)*.16+(tn3-.5)*.08)*smoothstep(3.,7.,vWp.y);
      vec3 rc=mix(vec3(.105,.092,.08),vec3(.3,.275,.24),tn2*.6+tn3*.4)*(.75+.5*tn1);
      float sd=smoothstep(3.1,1.3,vWp.y+(tn3-.5)*1.4);
      vec3 sc=mix(vec3(.2,.165,.11),vec3(.33,.28,.19),tn2)*mix(.55,1.,smoothstep(-.4,1.6,vWp.y));
      diffuseColor.rgb*=.82+.36*tn1;
      diffuseColor.rgb=mix(diffuseColor.rgb,rc,rk*.8);
      diffuseColor.rgb=mix(diffuseColor.rgb,sc,sd*.9);`);};
  const t=new THREE.Mesh(geo,mat);t.receiveShadow=true;world.add(t);}
const cloudTex=canvasTex(128,128,g=>{const gr=g.createRadialGradient(64,64,4,64,64,62);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.45,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});
function clouds(n,fn){const cm=new THREE.SpriteMaterial({map:cloudTex,transparent:true,depthWrite:false,opacity:.9,fog:true}),cd=new THREE.SpriteMaterial({map:cloudTex,transparent:true,depthWrite:false,opacity:.5,color:0xb9c4d2,fog:true});
  for(let i=0;i<n*2;i++){const [cx,cy,cz]=fn(i);for(let k=0;k<9;k++){const sp=new THREE.Sprite(k<3?cd:cm),sc=120+rnd()*170;sp.scale.set(sc,sc*.55,1);sp.position.set(cx+(rnd()-.5)*320,cy+70+(k<3?-18:0)+(rnd()-.5)*40,cz+(rnd()-.5)*160);world.add(sp);}}}
function mooredBoats(n,fn){const hull=new THREE.InstancedMesh(new THREE.BoxGeometry(7,1.2,2.2),M(0xf4f4f0,.4),n),mast=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.08,9,5),M(0xcfd4d8,.3,.8),n);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=V(1,1,1),p=V();
  for(let i=0;i<n;i++){const [x,z,r]=fn(i);q.setFromAxisAngle(V(0,1,0),r);m.compose(p.set(x,.4,z),q,s);hull.setMatrixAt(i,m);m.compose(p.set(x,5,z),q,s);mast.setMatrixAt(i,m);}world.add(hull,mast);}
function statueFigure(par,x,y,z,sc,mat){const g=new THREE.Group();cyl(1.2,2,9,mat,0,4.5,0,10,g);box(11,1.3,1.3,mat,0,7.6,0,0,g);const hd=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),mat);hd.position.y=9.8;g.add(hd);g.position.set(x,y,z);g.scale.setScalar(sc);par.add(g);return g;}
/* ================= FUNCHAL ================= */
const zsF=x=>-320+250*sm(Math.abs(x),350,1300)+22*Math.sin(x*.011);
const MXA={x:760,d:185,a:270,b:150},inMX=(x,z)=>((x-MXA.x)/MXA.a)**2+((zsF(x)-z-MXA.d)/MXA.b)**2;
var CS=null,CN=0;
function csNear(x,z){let bi=0,bd=1e9;for(let i=0;i<CN;i+=3){const p=CS[i],q=(p.x-x)**2+(p.z-z)**2;if(q<bd){bd=q;bi=i;}}for(let i=Math.max(0,bi-2);i<=Math.min(CN-1,bi+2);i++){const p=CS[i],q=(p.x-x)**2+(p.z-z)**2;if(q<bd){bd=q;bi=i;}}return [bi,Math.sqrt(bd)];}
const csY=(p,x,z)=>p.y+((x-p.x)*p.tx+(z-p.z)*p.tz)*p.sl;
const HPAD=[[900,1500,62,42],[-900,1500,125,125]],PADY=2.5;
function hF(x,z){if(z>1300)for(const p of HPAD)if(Math.abs(x-p[0])<p[2]&&Math.abs(z-p[1])<p[3])return PADY;let h=hF0(x,z);const e=inMX(x,z);if(e<1&&zsF(x)-z>=0)h+=(32+2.5*Math.sin(x*.035)*Math.cos(z*.04)-h)*sm(1-e,0,.3);
  if(CS&&x>-540&&x<-140){const d=zsF(x)-z;if(d>50&&d<1470){const [i,bd]=csNear(x,z);if(bd<62)h+=(csY(CS[i],x,z)-.8-h)*(1-sm(bd,17,62));}}return h;}
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
function nearTrail(x,z,r){if(inMX(x,z)<1.08)return true;if(CS&&x>-540&&x<-140&&csNear(x,z)[1]<r+16)return true;for(const p of TRAIL)if((p.x-x)**2+(p.z-z)**2<r*r)return true;return false;}
// altura da malha do terreno tal como é desenhada (triângulos), para a mota assentar no chão
const TG={w:5200,d:2500,cx:0,cz:-1150,sx:300,sz:150};
function HM(x,z){const cw=TG.w/TG.sx,cd=TG.d/TG.sz,x0=TG.cx-TG.w/2,z0=TG.cz-TG.d/2,gx=(x-x0)/cw,gz=(z-z0)/cd,ix=Math.floor(gx),iz=Math.floor(gz);if(ix<0||iz<0||ix>=TG.sx||iz>=TG.sz)return hF(x,z);
  const u=gx-ix,v=gz-iz,ha=hF(x0+ix*cw,z0+iz*cd),hb=hF(x0+ix*cw,z0+(iz+1)*cd),hc=hF(x0+(ix+1)*cw,z0+(iz+1)*cd),hd=hF(x0+(ix+1)*cw,z0+iz*cd);
  return u+v<=1?ha+u*(hd-ha)+v*(hb-ha):hc+(1-u)*(hb-hc)+(1-v)*(hd-hc);}
let cfg={mode:'sea',veh:'sail',lveh:'bike'};
// descida do Monte para os carros de cesto: larga, sempre a descer
const CW=11,CSTEP=(()=>{const P=new THREE.CatmullRomCurve3([[-380,1400],[-290,1290],[-410,1170],[-320,1050],[-420,930],[-330,810],[-240,700],[-340,590],[-440,480],[-370,370],[-280,270],[-330,160],[-335,100]].map(([x,d])=>V(x,0,zsF(x)-d)),false,'centripetal').getSpacedPoints(380).map(p=>({x:p.x,z:p.z})),n=P.length;
  P.forEach((p,i)=>{const a=P[Math.max(0,i-1)],b=P[Math.min(n-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z);p.tx=(b.x-a.x)/l;p.tz=(b.z-a.z)/l;p.nx=-p.tz;p.nz=p.tx;p.h=hF(p.x,p.z);});
  P.forEach((p,i)=>{let t=0,c=0;for(let j=-10;j<=10;j++){t+=P[clamp(i+j,0,n-1)].h;c++;}p.y=t/c;});const st=Math.hypot(P[1].x-P[0].x,P[1].z-P[0].z);
  for(let i=1;i<n;i++)P[i].y=Math.min(P[i].y,P[i-1].y-.06*st);P.forEach((p,i)=>{p.sl=(P[Math.min(n-1,i+1)].y-P[Math.max(0,i-1)].y)/(st*(i&&i<n-1?2:1));});CN=n;CS=P;return st;})();
let cps=99;const cpr=()=>{cps=(cps*16807)%2147483647;return cps/2147483647;};
const CFAST=[];for(let i=28,k=0;i<CN-40;i+=44,k++)CFAST.push({i0:i,i1:i+22,lat:[-6,6,0][k%3]});
const CROCK=[];for(let i=22;i<CN-18;i+=7){const lat=(cpr()*2-1)*8.5,r=1+cpr()*.8,p=CS[i];if(CFAST.some(f=>i>=f.i0-1&&i<=f.i1+1&&Math.abs(lat-f.lat)<4.5))continue;CROCK.push({i,lat,r,x:p.x+p.nx*lat,z:p.z+p.nz*lat});}
function enterCesto(b,gi){const row=Math.floor(gi/4),i=3+row*2,p=CS[i],o=(gi%4-1.5)*4.6;b.land=2;b.on=true;b.ti=b.tp=i;b.ll=0;b.v=0;b.x=p.x+p.nx*o;b.z=p.z+p.nz*o;b.hd=b.va=Math.atan2(-p.tz,p.tx);b.y=csY(p,b.x,b.z)+.3;b.hL=b.hR=0;b.tx=b.x;b.tz=b.z;b.thd=b.hd;}
function cestoPhysics(b,dt){if(dt<=0)return;
  let bi=0,bd=1e9;for(let j=-6;j<=6;j++){const p=CS[clamp(b.ti+j,0,CN-1)],d=(p.x-b.x)**2+(p.z-b.z)**2;if(d<bd){bd=d;bi=j;}}b.ti=clamp(b.ti+bi,0,CN-1);b.tp=b.ti;
  const p=CS[b.ti],lat=(b.x-p.x)*p.nx+(b.z-p.z)*p.nz;let L=0,R=0;
  if(b.fin!=null)L=R=1;else if(b.bot){const a=CS[Math.min(CN-1,b.ti+6)],c=CS[Math.min(CN-1,b.ti+16)];let tl=(b.slot%5-2)*3.4;for(const r of CROCK)if(r.i>b.ti&&r.i<b.ti+12&&Math.abs(r.lat-lat)<3.6){tl=r.lat+(lat>=r.lat?5:-5);if(Math.abs(tl)>8.5)tl=r.lat+(lat>=r.lat?-5:5);break;}tl=clamp(tl,-8.5,8.5);
    const st=clamp(angDiff(Math.atan2(-(a.z+a.nz*tl-b.z),a.x+a.nx*tl-b.x),b.hd)*3,-1,1),cv=Math.abs(angDiff(Math.atan2(-c.tz,c.tx),Math.atan2(-p.tz,p.tx)));L=Math.max(0,st);R=Math.max(0,-st);if(b.v>(33-cv*14)*b.skill){L=Math.min(1,L+.6);R=Math.min(1,R+.6);}}
  else if(raceT>=0){L=(keys.ArrowLeft||keys.KeyA||touch.l)?1:0;R=(keys.ArrowRight||keys.KeyD||touch.r)?1:0;}
  if(b.stun>0){L=R=0;b.hd+=5*dt;}
  b.hL=clamp(b.hL+(L>.05?.42*L:-.3)*dt,0,1);b.hR=clamp(b.hR+(R>.05?.42*R:-.3)*dt,0,1);const gL=1-.8*sm(b.hL,.55,1),gR=1-.8*sm(b.hR,.55,1),both=L>0&&R>0;
  const fast=CFAST.some(f=>b.ti>=f.i0&&b.ti<=f.i1&&Math.abs(lat-f.lat)<2.8);b.fast=fast;b.brk=L||R;
  const mx=Math.cos(b.va),mz=-Math.sin(b.va),al=Math.max(0,mx*p.tx+mz*p.tz);
  let acc=-p.sl*(fast?25:17)*al-(fast?.004:.0072)*b.v*b.v-(L*gL+R*gR)*(both?5.5:3)-.3;if(b.v<6&&!L&&!R&&b.fin==null)acc+=5;
  b.v=Math.max(0,b.v+acc*dt);if(b.boost>0)b.v=Math.max(b.v,30);
  b.hd+=(L*gL-R*gR)*1.3*Math.min(1,.35+b.v/9)*dt;
  const slip=angDiff(b.hd,b.va);b.slip=slip;b.dr=Math.abs(slip)>.18;b.va+=slip*Math.min(1,dt*(5-(3.7-2.2*Math.min(gL,gR))*Math.max(L,R)));b.v*=1-Math.min(1,Math.abs(slip))*.45*dt;
  let nx=b.x+Math.cos(b.va)*b.v*dt,nz=b.z-Math.sin(b.va)*b.v*dt;const nl=(nx-p.x)*p.nx+(nz-p.z)*p.nz;
  if(Math.abs(nl)>CW-1.3){const k=Math.sign(nl)*(Math.abs(nl)-(CW-1.3));nx-=p.nx*k;nz-=p.nz*k;const ta=Math.atan2(-p.tz,p.tx);b.va+=angDiff(ta,b.va)*.5;b.hd+=angDiff(ta,b.hd)*.3;if(!(raceT<b.wT)){b.wT=raceT+.6;b.v*=.72;if(b===me)toast('Bateste no muro!',1);}}
  for(const r of CROCK){if(r.i<b.ti-3||r.i>b.ti+3)continue;const dx=nx-r.x,dz=nz-r.z,d=Math.hypot(dx,dz),m=r.r+1.3;if(d<m&&d>.01){nx=r.x+dx/d*m;nz=r.z+dz/d*m;if(!(raceT<b.rT)){b.rT=raceT+.8;b.v*=.3;if(b===me)toast('Bateste numa pedra!',1);if(!reduce)for(let j=0;j<8;j++)emit(nx,b.y+.6,nz,(Math.random()-.5)*8,3+Math.random()*4,(Math.random()-.5)*8,.6,.8,1);}}}
  b.x=nx;b.z=nz;for(const o of boats){if(o===b||!o.land)continue;const dx=b.x-o.x,dz=b.z-o.z,d=Math.hypot(dx,dz);if(d<3.6&&d>.01){b.x+=dx/d*(3.6-d)*.5;b.z+=dz/d*(3.6-d)*.5;}}
  b.y=csY(p,b.x,b.z)+.3;b.air=false;
  if(b.fin==null&&b.ti>=CN-6){b.fin=raceT;if(b===me)onFinish();}}
function makeCesto(hex){const bike=new THREE.Group(),g=new THREE.Group();bike.add(g);const wk=M(0xc9a25e,.9),wd=M(0x5a3d22,.8),wh=M(0xf4f2ea,.8),skin=M(0xe0b08a,.8),straw=M(0xe6cf7a,.8),cu=M(hex,.6);
  for(const z of[-.75,.75]){box(3.4,.16,.22,wd,0,.12,z,0,g);box(.5,.16,.22,wd,1.85,.3,z,0,g).rotation.z=.6;}
  box(1.9,.9,1.7,wk,0,.75,0,0,g);box(.25,1.5,1.7,wk,-.9,1.4,0,0,g);for(const z of[-.85,.85])box(1.9,.5,.12,wk,0,1.35,z,0,g);box(1.5,.2,1.4,cu,.1,1.25,0,0,g);
  for(const z of[-.4,.4]){cyl(.26,.3,.8,M(hex,.8),-.2,1.75,z,8,g);const h=new THREE.Mesh(new THREE.SphereGeometry(.25,8,6),skin);h.position.set(-.2,2.4,z);g.add(h);}
  for(const z of[-.6,.6]){cyl(.24,.28,1.6,wh,-1.45,1.3,z,8,g);const h=new THREE.Mesh(new THREE.SphereGeometry(.25,8,6),skin);h.position.set(-1.45,2.35,z);g.add(h);cyl(.5,.5,.08,straw,-1.45,2.6,z,12,g);cyl(.27,.27,.2,straw,-1.45,2.7,z,10,g);}
  g.scale.setScalar(1.25);bike.visible=false;scene.add(bike);return {bike,bw:[]};}
function visualCesto(b,dt){const o=b.bike,p=CS[clamp(b.ti|0,0,CN-1)];o.visible=true;if(b.remote){b.y=csY(p,b.x,b.z)+.3;}const fx=Math.cos(b.hd),fz=-Math.sin(b.hd);
  o.position.set(b.x,b.y,b.z);o.rotation.set(0,b.hd,0);o.rotateZ(Math.atan(p.sl*(fx*p.tx+fz*p.tz)));b.lean+=(clamp(-(b.slip||0)*.5,-.25,.25)-b.lean)*Math.min(1,dt*6);o.rotateX(b.lean);b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce&&b.v>5&&(b.brk||b.dr))for(let j=0;j<2;j++)emit(b.x-fx*2,b.y+.2,b.z-fz*2,-fx*2+(Math.random()-.5)*3,.5,-fz*2+(Math.random()-.5)*3,1.2,1,1);}

// mundo: Baía do Funchal
H=hF;world=new THREE.Group();scene.add(world);const worldF=world;
terrain({terr:[5200,2500,0,-1150,300,150],h:hF,color(x,z,h,ny,c){const d=zsF(x)-z;if(inMX(x,z)<.95)c.set(0x8f7a55);else if(h<2.5)c.set(0x6f6a60);else if(ny<.74)c.set(0x6a5f52);else if(h>520)c.set(0x6f7a52);else if(d<430&&Math.abs(x)<1050)c.set(0x8d8f78);else c.set(h>330?0x4a6338:0x55703c);}});
buildFunchal();
sunDir.setFromSphericalCoords(1,deg(70),deg(215));su.sunPosition.value.copy(sunDir);
water.material.uniforms.sunDirection.value.copy(sunDir);water.material.uniforms.waterColor.value.copy(lin(0x1580a6));
scene.environment=pmrem.fromScene(sky).texture;scene.fog.color.set(0xc4d8e4);scene.fog.density=2/5600;

// trilho: faixa de terra batida, estacas e arcos
function arch(x,y,z,tx,tz,w){const tex=canvasTex(512,64,g=>{for(let i=0;i<32;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*16,j*16,16,16);}}),gt=new THREE.Group(),bm=new THREE.MeshStandardMaterial({map:tex}),k=M(0x111111);
  for(const s of[-1,1])cyl(.35,.45,13,M(0xff4d5e,.5),s*w/2,6.5,0,10,gt);const ban=new THREE.Mesh(new THREE.BoxGeometry(w,1.8,.3),[k,k,k,k,bm,bm]);ban.position.y=12.5;gt.add(ban);gt.position.set(x,y,z);gt.lookAt(x+tx,y,z+tz);world.add(gt);}
{const pos=[],uv=[],idx=[];TRAIL.forEach((p,i)=>{for(let k=-2;k<=2;k++){const x=p.x+p.nx*k*5.5,z=p.z+p.nz*k*5.5;pos.push(x,HM(x,z)+.45,z);uv.push((k+2)/2,i/3);}
    for(let k=0;k<4;k++){const q=i*5+k,r=((i+1)%TN)*5+k;idx.push(q,r,q+1,q+1,r,r+1);}});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const tex=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#b08a58';c.fillRect(0,0,w,h);for(let i=0;i<5000;i++){const v=rnd();c.fillStyle=`rgba(${v>.5?255:40},${v>.5?235:25},${v>.5?200:10},${.03+rnd()*.06})`;c.fillRect(rnd()*w,rnd()*h,1+rnd()*4,2+rnd()*10);}for(let i=0;i<26;i++){const x=rnd()*w,ww=3+rnd()*7;c.fillStyle='rgba(60,38,18,'+(.1+rnd()*.2)+')';c.beginPath();c.moveTo(x,0);for(let y=0;y<=h;y+=32)c.lineTo(x+Math.sin(y*.05+i)*5,y);c.lineTo(x+ww,h);for(let y=h;y>=0;y-=32)c.lineTo(x+ww+Math.sin(y*.05+i)*5,y);c.fill();}},true);const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xffffff,map:tex,bumpMap:tex,bumpScale:LOW?0:.5,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));m.receiveShadow=true;world.add(m);
  const n=Math.ceil(TN/4)*2,st=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.22,2.2,6),M(0xffffff,.6),n),mm=new THREE.Matrix4();let c=0;
  for(let i=0;i<TN;i+=4)for(const sd of[-1,1]){const p=TRAIL[i],x=p.x+p.nx*sd*12,z=p.z+p.nz*sd*12;mm.makeTranslation(x,HM(x,z)+1.1,z);st.setMatrixAt(c,mm);st.setColorAt(c,lin((i/4)%2?0xffffff:0xe8384f));c++;}
  st.count=c;world.add(st);
  for(const i of[3]){const p=TRAIL[i];arch(p.x,HM(p.x,p.z),p.z,p.tx,p.tz,25);}
  const rt=canvasTex(128,128,g=>{g.fillStyle='#ffd23f';g.fillRect(0,0,128,128);g.fillStyle='#1a1a1a';for(let i=-128;i<256;i+=48){g.beginPath();g.moveTo(i,128);g.lineTo(i+24,128);g.lineTo(i+88,0);g.lineTo(i+64,0);g.fill();}},true),rm=new THREE.MeshStandardMaterial({map:rt,roughness:.7,side:THREE.DoubleSide});
  // ambiente de pista: fitas, publicidade, público, fardos
  {const tp=canvasTex(64,16,c=>{for(let i=0;i<4;i++){c.fillStyle=i%2?'#fff':'#e8232a';c.fillRect(i*16,0,16,16);}},true),tm=new THREE.MeshBasicMaterial({map:tp,side:THREE.DoubleSide});
    for(const sd of[-1,1]){const pos=[],uv=[],idx=[];for(let i=0;i<=TN;i++){const p=TW(i),x=p.x+p.nx*sd*12.6,z=p.z+p.nz*sd*12.6,y=HM(x,z);pos.push(x,y+1.5,z,x,y+1.95,z);uv.push(i*.7,0,i*.7,1);if(i<TN){const q=i*2;idx.push(q,q+2,q+1,q+1,q+2,q+3);}}
      const g4=new THREE.BufferGeometry();g4.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g4.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g4.setIndex(idx);world.add(new THREE.Mesh(g4,tm));}
    const ads=['MADEIRA MX','REGATA','FUNCHAL','TURBO','PONCHA POWER','BOLO DO CACO'],adc=['#0b3d6e','#c0392b','#1e7a46','#e67e22','#6c3483','#222'];
    for(let k=0;k<12;k++){const j=8+k*21,p=TW(j),q=TW(j+3);if(p.tx*q.tx+p.tz*q.tz<.97)continue;const t=canvasTex(256,48,c=>{c.fillStyle=adc[k%6];c.fillRect(0,0,256,48);c.fillStyle='#fff';c.font='bold 30px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(ads[k%6],128,26);}),sd=k%2?1:-1,x=p.x+p.nx*sd*14.5,z=p.z+p.nz*sd*14.5,bm=new THREE.MeshStandardMaterial({map:t,roughness:.6}),dk=M(0x222222),b=new THREE.Mesh(new THREE.BoxGeometry(13,2.2,.3),[dk,dk,dk,dk,bm,bm]);b.position.set(x,HM(x,z)+1.3,z);b.rotation.y=Math.atan2(-p.tz,p.tx);b.castShadow=true;world.add(b);}
    const p=TRAIL[10],ang=Math.atan2(-p.tz,p.tx),n=LOW?120:260,cr=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,1.2,.5),M(0xffffff,.9),n),hdm=new THREE.InstancedMesh(new THREE.SphereGeometry(.26,6,5),M(0xe0b08a,.8),n),mm=new THREE.Matrix4(),cc=[0xd0342c,0x2f6fd0,0xf2c230,0xffffff,0x2a9d58,0x222222,0xe67e22];
    for(let i=0;i<n;i++){const k=i%4,o=-(22+k*5),al=30+(rnd()-.5)*104,x=p.x+p.nx*o+p.tx*al,z=p.z+p.nz*o+p.tz*al,y=HM(x,z)+(3+k*2.5)-1+.6;mm.makeRotationY(ang).setPosition(x,y,z);cr.setMatrixAt(i,mm);cr.setColorAt(i,lin(cc[Math.floor(rnd()*cc.length)]));mm.makeTranslation(x,y+.85,z);hdm.setMatrixAt(i,mm);}world.add(cr,hdm);
    const hb=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,1.3,1.3),M(0xd9b95c,.95),RAMPS.length*4);let c2=0;for(const j of RAMPS)for(const sd of[-1,1])for(const a of[-2,12]){const q=TRAIL[j],x=q.x+q.tx*a+q.nx*sd*10.6,z=q.z+q.tz*a+q.nz*sd*10.6;mm.makeRotationY(Math.atan2(-q.tz,q.tx)).setPosition(x,HM(x,z)+.65,z);hb.setMatrixAt(c2++,mm);}hb.castShadow=true;world.add(hb);}
  for(const j of WH){const p=TRAIL[j],m=new THREE.Mesh(prism,M(0x8a6a3c,1));m.scale.set(5,.9,24);m.position.set(p.x+p.tx*2.5,HM(p.x,p.z)+.45,p.z+p.tz*2.5);m.rotation.y=Math.atan2(-p.tz,p.tx);m.receiveShadow=true;world.add(m);}
  {const pos=[],idx=[];for(let i=MUD[0];i<=MUD[1];i++){const p=TRAIL[i];for(const k of[-10,10]){const x=p.x+p.nx*k,z=p.z+p.nz*k;pos.push(x,HM(x,z)+.56,z);}if(i<MUD[1]){const q=(i-MUD[0])*2;idx.push(q,q+2,q+1,q+1,q+2,q+3);}}
    const g3=new THREE.BufferGeometry();g3.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g3.setIndex(idx);g3.computeVertexNormals();const mm=new THREE.Mesh(g3,M(0x3d2a17,.35,0,{side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-5,polygonOffsetUnits:-5}));mm.receiveShadow=true;world.add(mm);}
  {const pt=canvasTex(64,64,g=>{g.fillStyle='#10202c';g.fillRect(0,0,64,64);g.fillStyle='#3fe0ff';for(const y of[4,26,48]){g.beginPath();g.moveTo(8,y+14);g.lineTo(32,y);g.lineTo(56,y+14);g.lineTo(56,y+20);g.lineTo(32,y+6);g.lineTo(8,y+20);g.fill();}}),pm=new THREE.MeshBasicMaterial({map:pt,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6});
    for(const j of PADS){const p=TRAIL[j],m=new THREE.Mesh(new THREE.PlaneGeometry(8,8),pm);m.rotation.set(-Math.PI/2,0,Math.atan2(-p.tz,p.tx)-Math.PI/2,'YXZ');m.rotation.order='YXZ';m.rotation.set(-Math.PI/2,Math.atan2(-p.tz,p.tx)-Math.PI/2,0);m.position.set(p.x,HM(p.x,p.z)+.6,p.z);world.add(m);}}
  {const p=TRAIL[10],cols=[0xd0342c,0xf2c230,0x2f6fd0,0xffffff];for(let k=0;k<4;k++){const o=-(22+k*5),x=p.x+p.nx*o+p.tx*30,z=p.z+p.nz*o+p.tz*30;box(110,3+k*2.5,5,M(cols[k],.8),x,HM(x,z)+(3+k*2.5)/2-1,z,Math.atan2(-p.tz,p.tx));}}
  for(const j of RAMPS){const p=TRAIL[j],v=[],uvs=[];for(const sd of[0,9,12])for(const l of[-9,9]){const x=p.x+p.tx*sd+p.nx*l,z=p.z+p.tz*sd+p.nz*l;v.push(x,HM(x,z)+.5+rampProf(sd===12?0:sd),z);uvs.push(l>0?2:0,sd/6);}
    const g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g2.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g2.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,2,4,1,3,5]);g2.computeVertexNormals();const rmesh=new THREE.Mesh(g2,rm);rmesh.castShadow=rmesh.receiveShadow=true;world.add(rmesh);}}

// descida dos cestos: calçada, muros, faixas rápidas e pedras
{const cob=canvasTex(256,256,g=>{g.fillStyle='#6f6a62';g.fillRect(0,0,256,256);for(let y=0;y<256;y+=16)for(let x=-8;x<256;x+=16){const v=120+rnd()*70,o=(y/16%2)*8;g.fillStyle=`rgb(${v},${v-4},${v-10})`;g.beginPath();g.ellipse(x+o+8,y+8,6.6,6.6,0,0,7);g.fill();g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.ellipse(x+o+6.5,y+6,3,2.4,0,0,7);g.fill();}},true);cob.repeat.set(1,1);
  const rib=(lat0,lat1,y0,y1,mat,i0=0,i1=CN-1,vs=.5)=>{const pos=[],uv=[],idx=[];for(let i=i0;i<=i1;i++){const p=CS[i];pos.push(p.x+p.nx*lat0,p.y+y0,p.z+p.nz*lat0,p.x+p.nx*lat1,p.y+y1,p.z+p.nz*lat1);uv.push(0,i*vs,Math.max(1,Math.abs(lat1-lat0)/5),i*vs);if(i<i1){const q=(i-i0)*2;idx.push(q,q+2,q+1,q+1,q+2,q+3);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;world.add(m);return m;};
  rib(-CW-.6,CW+.6,.25,.25,new THREE.MeshStandardMaterial({map:cob,roughness:.9,side:THREE.DoubleSide,bumpMap:cob,bumpScale:LOW?0:.25}));
  const wm=M(0xe9e2d0,.9,0,{side:THREE.DoubleSide}),cap=M(0x5a554c,.9,0,{side:THREE.DoubleSide});for(const sd of[-1,1]){rib(sd*(CW+.1),sd*(CW+.1),-6,1.7,wm);rib(sd*(CW+.1),sd*(CW+1),1.7,1.7,cap);rib(sd*(CW+1),sd*(CW+1),1.7,-8,wm);}
  const ft=canvasTex(64,64,g=>{g.fillStyle='#2b2f36';g.fillRect(0,0,64,64);g.fillStyle='#ffd23f';for(const y of[6,36]){g.beginPath();g.moveTo(10,y+18);g.lineTo(32,y);g.lineTo(54,y+18);g.lineTo(54,y+24);g.lineTo(32,y+6);g.lineTo(10,y+24);g.fill();}},true),fm=new THREE.MeshStandardMaterial({map:ft,roughness:.3,metalness:.2,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  for(const f of CFAST){const m=rib(f.lat-2.8,f.lat+2.8,.32,.32,fm,f.i0,f.i1,-.5);}
  const rg=new THREE.DodecahedronGeometry(1,0),rk=new THREE.InstancedMesh(rg,M(0x7b756c,.95,0,{flatShading:true}),CROCK.length),mm=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=V(),ps=V();
  CROCK.forEach((r,i)=>{const p=CS[r.i];q.setFromEuler(new THREE.Euler(i,i*2.1,i*.7));mm.compose(ps.set(r.x,csY(p,r.x,r.z)+.25+r.r*.45,r.z),q,sc.set(r.r,r.r*.8,r.r));rk.setMatrixAt(i,mm);});rk.castShadow=true;world.add(rk);
  for(const i of[5,CN-6]){const p=CS[i];arch(p.x,p.y,p.z,p.tx,p.tz,2*CW);}}

// obstáculos fora do terreno: molhe, ilhéu com forte, navio, marina
let COL=[];const addSeg=(cx,cz,len,ang,r)=>{const dx=Math.cos(ang),dz=-Math.sin(ang);for(let s=-len/2;s<=len/2;s+=r*.8)COL.push([cx+dx*s,cz+dz*s,r]);};
{const bx=-560,bz=zsF(-560)+20,ang=-.1;addSeg(bx+310,bz+48,640,ang,12);COL.push([bx,bz+30,40]);addSeg(bx+330,bz+20,270,ang,19);for(let i=0;i<42;i++)COL.push([bx+10+i*15,bz+60-i*1.5,7]);
 addSeg(250,zsF(250)+70,150,.05,6);addSeg(328,zsF(328)+36,70,Math.PI/2,6);}
const blocked=(x,z)=>H(x,z)>-1.5||COL.some(c=>(x-c[0])**2+(z-c[1])**2<c[2]*c[2]);const COLF=COL;

// percurso: 3 boias e a linha de partida/chegada
let MARKS=[V(420,0,-60),V(-250,0,-80),V(-300,0,300),V(700,0,150),V(250,0,550),V(-650,0,150),V(-50,0,-150)],GATE=V(60,0,260),FIN=null;const R_MARK=28,LET='ABCDEFG';
// cada volta tem o seu percurso; todas acabam na linha de partida/chegada
let LAPS=[[0,1,2],[3,4,5],[6,0,4]],LAPNAME=['Baía','Volta larga','Junto à cidade'];
const LANDPT=V(520,0,zsF(520)+24);
const route=l=>[...LAPS[l%LAPS.length].map(i=>MARKS[i]),cfg.mode==='both'&&l===laps-1?LANDPT:FIN||GATE],tgt=b=>route(b.lap)[Math.min(b.mark,route(b.lap).length-1)],markId=b=>LAPS[b.lap%LAPS.length][b.mark];
const numTex=n=>canvasTex(128,128,g=>{g.fillStyle='rgba(6,18,28,.75)';g.beginPath();g.arc(64,64,58,0,7);g.fill();g.fillStyle='#fff';g.font='bold 80px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(n,64,68);});
let markObjs=[];
function buildMarks(T){T.markObjs=T.MARKS.map((p,i)=>{const b=new THREE.Group();cyl(2.6,3.6,7,M(0xff6a1f,.4),0,1.5,0,16,b);cyl(3,3.1,1.2,M(0xffffff,.4),0,3.6,0,16,b);cyl(.15,.15,6,M(0x333333),0,8,0,6,b);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:numTex(LET[i]),depthTest:false}));sp.scale.set(9,9,1);sp.position.y=16;b.add(sp);b.position.copy(p);world.add(b);return b;});
  const tex=canvasTex(512,64,g=>{for(let i=0;i<32;i++)for(let j=0;j<4;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*16,j*16,16,16);}});const R=T.LAPS[0],t=T.MARKS[R[0]].clone().sub(T.GATE).normalize(),gate=new THREE.Group(),bm=new THREE.MeshStandardMaterial({map:tex}),k=M(0x111111);
  for(const s of[-1,1])cyl(.6,.8,22,M(0xff4d5e,.5),s*25,11,0,10,gate);const ban=new THREE.Mesh(new THREE.BoxGeometry(50,3.4,.3),[k,k,k,k,bm,bm]);ban.position.y=21;gate.add(ban);gate.position.copy(T.GATE);gate.lookAt(T.GATE.clone().add(t));world.add(gate);
  if(T.FIN){const g2=gate.clone(),lm=T.MARKS[R[R.length-1]];g2.position.copy(T.FIN);g2.lookAt(T.FIN.clone().add(T.FIN.clone().sub(lm).normalize()));world.add(g2);}}
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

function makeRabelo(hex){const outer=new THREE.Group(),g=new THREE.Group();outer.add(g);const dk=M(0x2e2118,.8),wd=M(0x6b4a2c,.8),cr=M(0xefe6cf,.85,0,{side:THREE.DoubleSide}),pm=M(0x5b3a22,.7),hoop=M(0x1c1c1c,.5);
  const sh=new THREE.Shape();sh.moveTo(-8,-1.5);sh.lineTo(5,-1.7);sh.bezierCurveTo(7.5,-1.3,9,-.5,9.6,0);sh.bezierCurveTo(9,.5,7.5,1.3,5,1.7);sh.lineTo(-8,1.5);sh.closePath();
  const geo=new THREE.ExtrudeGeometry(sh,{depth:1.4,bevelEnabled:true,bevelThickness:.25,bevelSize:.25,bevelSegments:2,curveSegments:14});geo.rotateX(-Math.PI/2);const hull=new THREE.Mesh(geo,dk);hull.position.y=-.5;hull.castShadow=true;g.add(hull);
  box(15,.15,2.6,wd,-.5,1.05,0,0,g);box(3,.25,3,dk,-7.6,1.8,0,0,g);for(const z of[-1.3,1.3])box(.2,1.6,.2,dk,-6.4,1.1,z,0,g);box(1.6,.5,1.2,dk,9.4,1.4,0,0,g).rotation.z=.5;
  cyl(.16,.2,10,wd,1.5,6,0,8,g);const rig=new THREE.Group();rig.position.set(1.5,6.6,0);g.add(rig);const yard=cyl(.1,.1,7.4,wd,0,3.6,0,6,rig);yard.rotation.x=Math.PI/2;
  const sq=new THREE.Mesh(new THREE.PlaneGeometry(7,6.6,6,6),cr);sq.rotation.y=Math.PI/2;sq.geometry.translate(0,-3.3,0);sq.position.y=3.5;sq.castShadow=true;rig.add(sq);const band=new THREE.Mesh(new THREE.PlaneGeometry(7,.9),M(hex,.7,0,{side:THREE.DoubleSide}));band.rotation.y=Math.PI/2;band.position.set(.03,-1,0);sq.add(band);band.rotation.y=0;band.position.set(0,-2.6,.03);
  const oar=new THREE.Group();oar.position.set(-7.6,2.2,0);const sp=cyl(.1,.12,9,wd,-3.6,-.9,0,6,oar);sp.rotation.z=Math.PI/2-.28;box(1.8,.9,.08,wd,-7.4,-2,0,0,oar);g.add(oar);
  cyl(.28,.32,1.3,M(hex,.8),-7.4,2.6,.5,8,g);const hd=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),M(0xe0b08a,.8));hd.position.set(-7.4,3.5,.5);g.add(hd);
  const pip=[];for(let i=0;i<12;i++){const b=new THREE.Group(),top=i>=8,k=top?i-8:i;const c=cyl(.62,.62,1.7,pm,0,0,0,12,b);c.rotation.x=Math.PI/2;for(const z of[-.55,.55]){const h=cyl(.65,.65,.1,hoop,0,0,z,12,b);h.rotation.x=Math.PI/2;}
    b.position.set(top?-3.3+k*1.45+.7:-4.6+k*1.35,top?2.75:1.75,0);g.add(b);pip.push(b);}
  scene.add(outer);return {outer,rig,sq,oar,pip};}
function visualRabelo(b,dt){const o=b.outer,fx=Math.cos(b.hd),fz=-Math.sin(b.hd);if(b.remote){b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.rudS=clamp(angDiff(b.thd,b.hd)*4,-1,1);b.eff=b.v/BASE;}
  const ws=waveSlope(b.x,b.z,raceT);o.position.set(b.x,.35+getWaveHeight(b.x,b.z,raceT)+Math.sin(T*1.6+b.slot)*.06,b.z);o.rotation.set(0,b.hd,0);o.rotateX((b.heel||0)+Math.atan(ws[0]*fz-ws[1]*fx)*.5);o.rotateZ(Math.atan(ws[0]*fx+ws[1]*fz)*.6);
  b.rig.rotation.y=clamp(angDiff(Math.atan2(-windTo.z,windTo.x),b.hd),-1,1)*.8;b.sq.scale.y=.12+.88*b.s;b.oar.rotation.y=-(b.rudS||0)*.55;b.pip.forEach((p,i)=>p.visible=i<b.pipas);b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce&&b.v>3){const sx=-fz,sz=fx;for(const sd of[-1,1])if(Math.random()<b.v/BASE)emit(b.x+fx*9+sx*sd,.3,b.z+fz*9+sz*sd,sx*sd*3+fx*2,2+Math.random()*2,sz*sd*3+fz*2,.7,.5,0);emit(b.x-fx*9,.12,b.z-fz*9,(Math.random()-.5)*2,0,(Math.random()-.5)*2,4,1,1);}}

/* ---------- galeões da travessia: piratas ou imperiais, com bandeira pintada pelo jogador ---------- */
const FLW=48,FLH=32,shipTexC={};
function shipSailTex(sd,hex){const k=sd+'-'+hex;if(shipTexC[k])return shipTexC[k];const cs='#'+new THREE.Color(hex).getHexString();
  return shipTexC[k]=canvasTex(128,128,(g,w,h)=>{g.fillStyle=sd?'#efe6cf':'#2a2a30';g.fillRect(0,0,w,h);for(let i=0;i<6;i++){g.fillStyle=sd?'rgba(120,100,70,.14)':'rgba(255,255,255,.07)';g.fillRect(i*22+8,0,2,h);}
    if(sd){g.fillStyle='#b3261e';g.fillRect(54,14,20,92);g.fillRect(22,46,84,20);}
    else{g.fillStyle='#e9e6dc';g.beginPath();g.arc(64,50,22,0,7);g.fill();g.fillRect(50,64,28,16);g.fillStyle='#2a2a30';g.beginPath();g.arc(55,48,6,0,7);g.arc(73,48,6,0,7);g.fill();g.fillRect(61,58,6,8);g.strokeStyle='#e9e6dc';g.lineWidth=7;g.beginPath();g.moveTo(28,86);g.lineTo(100,108);g.moveTo(100,86);g.lineTo(28,108);g.stroke();}
    g.fillStyle=cs;g.fillRect(0,h-12,w,12);});}
function flagDefault(g,sd,hex){const cs='#'+new THREE.Color(hex).getHexString();g.fillStyle=sd?'#f4f1e8':'#16161a';g.fillRect(0,0,FLW,FLH);
  if(sd){g.fillStyle=cs;g.fillRect(20,0,8,FLH);g.fillRect(0,12,FLW,8);g.fillStyle='#c9a23a';g.fillRect(21,13,6,6);}
  else{g.fillStyle='#f1eee4';g.beginPath();g.arc(24,13,7,0,7);g.fill();g.fillRect(20,18,8,5);g.fillStyle='#16161a';g.fillRect(20,11,3,3);g.fillRect(25,11,3,3);g.strokeStyle='#f1eee4';g.lineWidth=2.4;g.beginPath();g.moveTo(11,22);g.lineTo(37,30);g.moveTo(37,22);g.lineTo(11,30);g.stroke();g.fillStyle=cs;g.fillRect(0,0,FLW,3);}}
function setSide(b,sd){sd=sd?1:0;b.side=sd;b.sailM.map=shipSailTex(sd,b.hex);b.sailM.needsUpdate=true;b.hullM.color.copy(lin(sd?0x6b3f22:0x2b2522));b.trimM.color.copy(lin(sd?0xd4af37:0x8d8d92));}
function makeShip(hex){const outer=new THREE.Group(),g=new THREE.Group();outer.add(g);
  const hullM=M(0x2b2522,.8),trimM=M(0x8d8d92,.5,.3),deckM=M(0x9a7748,.85),mastM=M(0x5a3d22,.8),colM=M(hex,.6),dk=M(0x1c1c1e,.5,.4),sailM=new THREE.MeshStandardMaterial({roughness:.9,side:THREE.DoubleSide});
  const sh=new THREE.Shape();sh.moveTo(-11,-2.6);sh.lineTo(5,-3);sh.bezierCurveTo(9,-2.4,12,-1,13.5,0);sh.bezierCurveTo(12,1,9,2.4,5,3);sh.lineTo(-11,2.6);sh.closePath();
  const geo=new THREE.ExtrudeGeometry(sh,{depth:3.4,bevelEnabled:true,bevelThickness:.4,bevelSize:.4,bevelSegments:2,curveSegments:14});geo.rotateX(-Math.PI/2);const hull=new THREE.Mesh(geo,hullM);hull.position.y=-1.2;hull.castShadow=true;g.add(hull);
  box(21,.2,5.2,deckM,-.6,2.35,0,0,g);for(const z of[-3.3,3.3]){box(17,.55,.2,colM,-2.5,1.5,z,0,g);box(17,.2,.22,trimM,-2.5,2.5,z,0,g);}
  box(6,2.6,5.6,hullM,-8.6,3.6,0,0,g);box(6.5,.3,6,trimM,-8.6,5,0,0,g);box(.3,1.3,4.2,trimM,-11.75,3.6,0,0,g);box(4.2,1.3,4.8,hullM,7.6,2.95,0,0,g);box(4.5,.25,5.1,trimM,7.6,3.7,0,0,g);
  const bs=cyl(.14,.22,8,mastM,14.2,4.4,0,6,g);bs.rotation.z=-Math.PI/2+.38;
  const rigs=[],sails=[];
  const mast=(x,hh,w,n)=>{cyl(.2,.3,hh,mastM,x,2.3+hh/2,0,8,g);const rig=new THREE.Group();rig.position.set(x,2.3,0);g.add(rig);rigs.push(rig);const sh0=(hh-3.6)/n-.5;let y=hh-.8;
    for(let i=0;i<n;i++){const sw=w*(1-(n-1-i)*.22),yd=cyl(.1,.1,sw+.7,mastM,0,y,0,6,rig);yd.rotation.x=Math.PI/2;const sg=new THREE.PlaneGeometry(sw,sh0,6,4),ps=sg.attributes.position;for(let k=0;k<ps.count;k++){const u=ps.getX(k)/sw*2,v=ps.getY(k)/sh0*2;ps.setZ(k,(1-u*u)*(1-v*v*.6)*1.1);}sg.translate(0,-sh0/2,0);sg.computeVertexNormals();
      const m=new THREE.Mesh(sg,sailM);m.rotation.y=Math.PI/2;m.position.set(0,y-.25,0);m.castShadow=true;rig.add(m);sails.push(m);y-=sh0+.5;}};
  mast(6.2,13,7.5,2);mast(-.3,17.5,9.5,3);mast(-6.8,11.5,6.5,2);
  const fcv=document.createElement('canvas');fcv.width=FLW;fcv.height=FLH;const fctx=fcv.getContext('2d'),ftex=new THREE.CanvasTexture(fcv);ftex.encoding=THREE.sRGBEncoding;ftex.magFilter=THREE.NearestFilter;
  const fg=new THREE.PlaneGeometry(6.6,4.4,6,1);fg.translate(3.3,0,0);const flag=new THREE.Mesh(fg,new THREE.MeshStandardMaterial({map:ftex,roughness:.8,side:THREE.DoubleSide}));flag.position.set(-.3,2.3+17.5+2,0);g.add(flag);cyl(.08,.08,5,mastM,-.3,2.3+17.5+1.6,0,5,g);
  for(const sd of[-1,1])for(const x of[-5,-1.6,1.8,5.2]){const c=cyl(.2,.26,1.9,dk,x,2.05,sd*3.2,8,g);c.rotation.x=Math.PI/2;}
  for(const [x,z,c] of[[-8.5,0,hex],[2.5,1.2,0x7a5a3a],[4,-1,0x3a4a5a],[-3,-1.3,0x8a2f2a]]){cyl(.3,.34,1.1,M(c,.8),x,x<-7?5.6:3,z,8,g);const hd=new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),M(0xe0b08a,.8));hd.position.set(x,x<-7?6.4:3.8,z);g.add(hd);}
  const dome=new THREE.Mesh(new THREE.SphereGeometry(16,18,10,0,TAU,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0x8fdcff,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}));dome.visible=false;outer.add(dome);
  scene.add(outer);return {outer,rigs,sails,sailM,hullM,trimM,flag,fcv,fctx,ftex,dome,side:0};}
function visualShip(b,dt){const o=b.outer,fx=Math.cos(b.hd),fz=-Math.sin(b.hd);if(b.remote){b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.rudS=clamp(angDiff(b.thd,b.hd)*4,-1,1);b.eff=b.v/BASE;b.heel=-(b.rudS||0)*.08*Math.min(1,b.v/15);}
  const ws=waveSlope(b.x,b.z,raceT),sink=b.sunk>0?Math.min(1,(5-b.sunk)/2):0;
  o.position.set(b.x,.7+getWaveHeight(b.x,b.z,raceT)+Math.sin(T*1.3+b.slot)*.1-sink*6,b.z);o.rotation.set(0,b.hd,0);o.rotateX((b.heel||0)+Math.atan(ws[0]*fz-ws[1]*fx)*.4+sink*.45);o.rotateZ(Math.atan(ws[0]*fx+ws[1]*fz)*.5-sink*.2);
  const wa=Math.atan2(-windTo.z,windTo.x),ry=clamp(angDiff(wa,b.hd),-1,1)*.5,sy=.15+.85*b.s;for(const r of b.rigs)r.rotation.y=ry;for(const m of b.sails)m.scale.y=sy;
  b.flag.rotation.y=wa-b.hd+Math.sin(T*5+b.slot)*.14;b.dome.visible=b.blk>0;b.fwd.set(fx,0,fz);
  const hp=b.hp==null?3:b.hp;if(b.hpS!==hp){b.hpS=hp;b.lb.textContent=b.name+' '+'♥'.repeat(Math.max(0,hp));}
  if(dt>0&&!reduce&&b.v>3&&!(b.sunk>0)){const sx=-fz,sz=fx;for(const sd of[-1,1])if(Math.random()<b.v/BASE)emit(b.x+fx*13+sx*sd,.4,b.z+fz*13+sz*sd,sx*sd*4+fx*2,2+Math.random()*3,sz*sd*4+fz*2,.8,.6,0);for(const sd of[-1,1])emit(b.x-fx*11+sx*sd*2,.12,b.z-fz*11+sz*sd*2,sx*sd*2,0,sz*sd*2,4.5,1.2,1);
    if(b.boost>0)for(let j=0;j<4;j++)emit(b.x-fx*12,.6,b.z-fz*12,-fx*10+rr()*3,4+Math.random()*5,-fz*10+rr()*3,.8,.8,0);}}

/* canhões de bordo: só disparam para os lados, por isso é preciso pôr o navio de través ao alvo */
const cbGeo=new THREE.SphereGeometry(.75,10,8),cbMat=M(0x15151a,.4,.6),CB_V=95,CB_L=1.45;
function shipBlock(b){if(b.blkCd>0||b.blk>0||b.sunk>0||b.fin!=null)return;b.blk=1.7;b.blkCd=5.5;if(b===me)toast('Defesa levantada!',1);}
function fireSide(b,sd){if(cfg.veh!=='ship'||!racing||raceT<0||b.fin!=null||b.sunk>0||b.land)return;if(raceT<15){if(b===me)toast('Canhões prontos aos 15 segundos',1);return;}const k=sd>0?'cdL':'cdR';if(b[k]>0){if(b===me)toast('Canhões a recarregar',.7);return;}b[k]=2.6;
  const e={k:'cb',by:b.id,sd:sd>0?1:-1,x:+b.x.toFixed(1),z:+b.z.toFixed(1),hd:+b.hd.toFixed(3),v:+b.v.toFixed(1)};onCb(e);sendEv(e);}
function onCb(e){if(cfg.veh!=='ship'||![e.x,e.z,e.hd,e.v].every(Number.isFinite))return;const sd=e.sd>0?1:-1,fx=Math.cos(e.hd),fz=-Math.sin(e.hd),px=fz*sd,pz=-fx*sd;
  for(let i=-1;i<=1;i++){const a=i*.07,dx=px*Math.cos(a)+fx*Math.sin(a),dz=pz*Math.cos(a)+fz*Math.sin(a),o=new THREE.Mesh(cbGeo,cbMat),x=e.x+fx*i*5+px*3.4,z=e.z+fz*i*5+pz*3.4;scene.add(o);cballs.push({o,x,z,vx:dx*CB_V+fx*e.v*.5,vz:dz*CB_V+fz*e.v*.5,t:0,by:e.by});
    if(!reduce)for(let j=0;j<6;j++)emit(x,3,z,dx*(8+Math.random()*8)+rr()*3,2+Math.random()*3,dz*(8+Math.random()*8)+rr()*3,.8,1,0);}
  for(const b of boats){if(!b.bot||b.remote||b.id===e.by||b.sunk>0)continue;const rx=b.x-e.x,rz=b.z-e.z,al=rx*px+rz*pz,ac=Math.abs(rx*fx+rz*fz);if(al>8&&al<150&&ac<al*.3+14&&Math.random()<.4)b.blkAt=raceT+Math.max(0,al/CB_V-.8);}}
function stepCballs(dt){for(let i=cballs.length-1;i>=0;i--){const c=cballs[i];c.t+=dt;c.x+=c.vx*dt;c.z+=c.vz*dt;const y=2.8+Math.sin(Math.min(1,c.t/CB_L)*Math.PI)*5;c.o.position.set(c.x,y,c.z);let end=c.t>=CB_L||H(c.x,c.z)>y-1,hit=false;
    if(!end)for(const b of boats){if(b.id===c.by||b.land||b.fin!=null||b.sunk>0)continue;const rx=c.x-b.x,rz=c.z-b.z,al=clamp(rx*b.fwd.x+rz*b.fwd.z,-11,12),qx=rx-b.fwd.x*al,qz=rz-b.fwd.z*al;if(qx*qx+qz*qz<17){end=hit=true;if(!b.remote)cannonHit(b,c.by);break;}}
    if(end){if(!reduce&&dt>0)for(let j=0;j<9;j++)emit(c.x,hit?3:.4,c.z,rr()*6,4+Math.random()*6,rr()*6,.8,.7,0);scene.remove(c.o);cballs.splice(i,1);}}}
function cannonHit(b,byId){const by=boats.find(o=>o.id===byId),nm=by?by.name:'alguém';if(raceT<b.invT)return;b.invT=raceT+.3;let r=1;
  if(b.blk>0){r=0;if(b===me)toast('Defendeste a bordada de '+nm+'!',1.3);}
  else if(b.shield>0){r=0;b.shield=0;if(b===me)toast('A proteção aguentou!',1.3);}
  else{b.hp=Math.max(0,(b.hp==null?3:b.hp)-1);b.v*=.6;if(b.hp<=0){r=2;b.sunk=5;b.item=null;b.boost=0;}if(b===me)toast(r===2?'Afundado por '+nm+'! A reparar o casco…':'Atingido por '+nm+'! Casco: '+'♥'.repeat(b.hp),2);}
  const e={k:'chit',to:b.id,by:byId,r};onChit(e);sendEv(e);}
function onChit(e){const by=boats.find(o=>o.id===e.by),to=boats.find(o=>o.id===e.to);if(!by||!to)return;if(by===me)toast(e.r===2?'Afundaste '+to.name+'! Ganhas turbo':e.r===1?'Acertaste em '+to.name+'!':to.name+' defendeu-se',1.6);if(e.r===2&&!by.remote&&by.fin==null)by.boost=3;}
function botShip(b,dt){if(b.blkAt&&raceT>=b.blkAt){b.blkAt=0;shipBlock(b);}if(raceT<20||b.fin!=null||b.sunk>0)return;b.aimT=(b.aimT||0)-dt;if(b.aimT>0)return;b.aimT=.4;
  for(const o of boats){if(o===b||o.fin!=null||o.sunk>0||o.land)continue;const rx=o.x-b.x,rz=o.z-b.z,d=Math.hypot(rx,rz);if(d>100||d<6)continue;if(Math.abs((rx*b.fwd.x+rz*b.fwd.z)/d)<.28&&Math.random()<.3){fireSide(b,rx*b.fwd.z-rz*b.fwd.x>0?1:-1);break;}}}

/* ---------- barcos ---------- */
const MAXB=15,COLORS=[0xffc928,0xe8384f,0x22b37a,0x6a55f0,0xff8a1f,0x1fa3e8,0xf05ac8,0x8bd13a,0x8a5a3a,0xffffff,0x1d2b3a,0x3fd6c6,0xb39ddb,0xc0392b,0x9e9e2e],BASE=24,KN=9.5/BASE;
const lbBox=document.getElementById('labels');let boats=[],me=null,laps=2;
function addBoat(p){const b=Object.assign(cfg.veh==='sail'?makeSailboat(COLORS[p.slot],String(p.slot+1)):cfg.veh==='rabelo'?makeRabelo(COLORS[p.slot]):cfg.veh==='ship'?makeShip(COLORS[p.slot]):makeMotor(COLORS[p.slot],cfg.veh),cfg.mode==='hide'?makeMan():cfg.mode==='cesto'?makeCesto(COLORS[p.slot]):cfg.mode!=='sea'?(cfg.lveh==='buggy'?makeBuggy:makeBike)(COLORS[p.slot]):{},{hp:3,sunk:0,blk:0,blkCd:0,cdL:0,cdR:0,pipas:cfg.veh==='rabelo'?cfg.pipas:0,hL:0,hR:0,land:0,ti:0,tp:0,ll:0,y:0,vy:0,gy0:0,air:false,lean:0,pitch:0,rudIn:0,id:p.id,name:p.name,slot:p.slot,bot:!!p.bot,hex:COLORS[p.slot],x:0,z:0,hd:0,v:0,s:.3,mark:0,lap:0,fin:null,lee:1,luff:0,eff:0,twa:0,tx:0,tz:0,thd:0,seen:false,skill:p.bot?.88+Math.random()*.07:1,tack:1,fwd:V(1,0,0)});
  b.lb=document.createElement('div');b.lb.className='nm'+(p.id===myId?' me':'');b.lb.textContent=p.name;lbBox.appendChild(b.lb);boats.push(b);return b;}
function removeBoat(id){const b=boats.find(x=>x.id===id);if(!b)return;scene.remove(b.outer);if(b.bike)scene.remove(b.bike);if(b.man)scene.remove(b.man);b.lb.remove();boats=boats.filter(x=>x!==b);}
function clearBoats(){capQ.length=0;clearSplats();boats.slice().forEach(b=>removeBoat(b.id));me=null;}
const progress=b=>{if(b.fin!=null)return 1e9-b.fin;if(b.land)return 1e6+b.tp*10;const t=tgt(b);return (b.lap*10+b.mark)*1e4-Math.hypot(t.x-b.x,t.z-b.z);};

function onRam(b,o,ram){if(b===me)toast(ram?'Abalroaste '+o.name+'!':o.name+' abalroou-te!',1.1);if(cfg.veh==='rabelo'&&!ram&&b.pipas>0&&b.fin==null&&o.fin==null){b.pipas--;const e={k:'steal',from:b.id,to:o.id};onSteal(e);sendEv(e);if(b===me)toast(o.name+' roubou-te uma pipa!',1.6);}}
function onSteal(e){const to=boats.find(x=>x.id===e.to),fr=boats.find(x=>x.id===e.from);if(!to||to.remote)return;if(to.pipas<12)to.pipas++;if(to===me)toast('Roubaste uma pipa'+(fr?' a '+fr.name:'')+'! Tens '+to.pipas,1.6);}
function unstick(b){for(const r of[5,12,25,45])for(let a=0;a<12;a++){const cx=Math.cos(a*.5236),cz=Math.sin(a*.5236);if(!blocked(b.x+cx*r,b.z+cz*r)&&!blocked(b.x+cx*(r+8),b.z+cz*(r+8))){b.x+=cx*1.5;b.z+=cz*1.5;return;}}}
function physics(b,dt,rud,inp,drift){ // inp: vela (+ folga, - caça) ou acelerador (- acelera, + trava)
  if(b.foot){footPhysics(b,dt,rud,inp);return;}
  for(const k of['boost','fav','stun','shield'])if(b[k]>0)b[k]-=dt;
  if(b.land){landPhysics(b,dt,rud,inp,drift);return;}
  const fx=Math.cos(b.hd),fz=-Math.sin(b.hd),twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1)),ideal=idealSheet(twa);b.twa=twa;b.ideal=ideal;
  let target,acc,turn,drag=.12;
  if(cfg.veh==='sail'){
    if(b.bot)b.s+=(ideal-b.s)*Math.min(1,dt*2);else b.s=clamp(b.s+inp*dt*.55,0,1);
    const err=Math.abs(b.s-ideal),trim=twa<.61?1:Math.max(.3,1-(err/.38)**2);b.eff=polar(twa)*trim;if(b.fav>0)b.eff=Math.max(b.eff,.95);
    target=b.fin!=null?0:BASE*b.eff*gust*b.skill;acc=target>b.v?.45:.8;turn=.25+.55*Math.min(1,b.v/12);
  }else if(cfg.veh==='rabelo'){const n=b.pipas;if(b.bot)b.s+=((twa>1.15?1:0)-b.s)*Math.min(1,dt*1.5);else b.s=clamp(b.s-inp*dt*.7,0,1);b.ideal=twa>1.15?1:0;
    const sq=twa<1.05?-.3:Math.sin((twa-1.05)/(Math.PI-1.05)*Math.PI/2);b.eff=clamp(.42+.72*b.s*sq,.05,1.15);
    target=b.fin!=null?0:BASE*b.eff*gust*b.skill;acc=(target>b.v?.5:.8)/(1+n*.11);turn=.52*Math.min(1,.3+b.v/10)/(1+n*.05);drag=.1;
    b.rudS=(b.rudS||0)+(rud-(b.rudS||0))*Math.min(1,dt*(b.bot?2.5:1.3));rud=b.rudS;
    const ht=-rud*turn*b.v*(.012+n*.006);b.heel=(b.heel||0)+(ht-(b.heel||0))*Math.min(1,dt*2.5);
    if(Math.abs(b.heel)>.42&&n>0&&!(raceT<b.dropT)&&b.fin==null){b.pipas--;b.dropT=raceT+1.2;b.heel*=.5;if(b===me)toast('Caiu uma pipa ao rio! Restam '+b.pipas,2);if(!reduce)for(let j=0;j<10;j++)emit(b.x,.4,b.z,(Math.random()-.5)*8,4+Math.random()*4,(Math.random()-.5)*8,.8,.7,0);}
  }else if(cfg.veh==='ship'){for(const k of['cdL','cdR','blk','blkCd'])if(b[k]>0)b[k]-=dt;
    if(b.sunk>0){b.sunk-=dt;if(b.sunk<=0){b.sunk=0;b.hp=3;b.shield=4;if(b===me)toast('Casco reparado. De volta à luta!',2);}}
    if(b.bot)b.s+=(1-b.s)*Math.min(1,dt);else b.s=clamp(b.s-inp*dt*.7,0,1);b.ideal=1;
    const wf=twa<.6?.6:twa<1.3?.6+.4*(twa-.6)/.7:1;b.eff=clamp((.2+.8*b.s)*wf,.05,1.1);if(b.fav>0)b.eff=Math.max(b.eff,1.08);
    target=b.fin!=null||b.sunk>0?0:BASE*1.08*b.eff*gust*b.skill*(b.blk>0?.8:1);acc=target>b.v?.4:.7;turn=.5*Math.min(1,.35+b.v/12);drag=.08;
    b.rudS=(b.rudS||0)+(rud-(b.rudS||0))*Math.min(1,dt*(b.bot?3:2));rud=b.sunk>0?0:b.rudS;b.heel=(b.heel||0)+(-rud*turn*b.v*.011-(b.heel||0))*Math.min(1,dt*2.5);
    if(drift)shipBlock(b);if(b.bot)botShip(b,dt);
  }else{const jet=cfg.veh==='jet',top=BASE*(jet?1.12:1.3),thr=b.fin!=null?0:b.bot?1:inp<0?1:inp>0?-1:0;b.s=.3;
    target=thr>0?top*b.skill*(b.fav>0?1.15:1):0;acc=thr>0?(jet?.9:.5):thr<0?1.5:.3;turn=(jet?1.05:.6)*Math.min(1,.3+b.v/10);drag=jet?.05:.1;b.eff=b.v/top;}
  if(b.boost>0){target=Math.max(target,BASE*1.35)*(cfg.veh==='sail'?1:1.2);acc=2.5;}
  if(b.stun>0){target=BASE*.08;acc=3;rud=0;b.hd+=7*dt;}
  b.rudIn=rud;b.v+=(target-b.v)*Math.min(1,dt*acc);b.v*=1-Math.abs(rud)*drag*dt;
  b.hd+=turn*rud*dt;
  const nx=b.x+fx*b.v*dt,nz=b.z+fz*b.v*dt;
  if(blocked(nx,nz)){b.v*=1-Math.min(1,dt*2.5);if(!blocked(nx,b.z))b.x=nx;else if(!blocked(b.x,nz))b.z=nz;else unstick(b);if(b===me)toast('Cuidado com a costa!');}else{b.x=nx;b.z=nz;}
  if(TK.cur){const c=TK.cur(b.x,b.z),cx=b.x+c[0]*dt,cz=b.z+c[1]*dt;if(!blocked(cx,cz)){b.x=cx;b.z=cz;}}
  if(blocked(b.x,b.z))unstick(b);
  for(const m of TK.mov){const dx=b.x-m.x,dz=b.z-m.z,d=Math.hypot(dx,dz);if(d<TK.movR&&d>.01){b.x=m.x+dx/d*TK.movR;b.z=m.z+dz/d*TK.movR;b.v*=.9;if(b===me)toast('Cuidado com '+TK.movName+'!');}}
  if(cfg.veh==='jet'){const h=getWaveHeight(b.x,b.z,raceT),g=waveSlope(b.x,b.z,raceT),sl=g[0]*fx+g[1]*fz,was=b.air;
    if(!b.air){if(b.v>4)b.v=Math.max(4,b.v-sl*34*dt);if(sl>.09&&b.v>BASE*.95){b.v*=1-sl*3.5*dt;if(b===me&&sl>.16)toast('De frente à onda: perdes velocidade',1);}}
    b.vy-=20*dt;b.y+=b.vy*dt;if(b.y<=h){b.y=h;b.vy=clamp((h-b.gy0)/dt,-30,11);}b.air=b.y>h+.35;b.gy0=h;
    if(was&&!b.air&&!reduce&&dt>0)for(let j=0;j<12;j++)emit(b.x+(Math.random()-.5)*3,h+.3,b.z+(Math.random()-.5)*3,(Math.random()-.5)*12,4+Math.random()*6,(Math.random()-.5)*12,.8,.7,0);}
  for(const o of boats){if(o===b||o.land)continue;const dx=b.x-o.x,dz=b.z-o.z,d=Math.hypot(dx,dz),R=cfg.veh==='ship'?13:8;if(d<R&&d>.01){b.x+=dx/d*(R-d)*.5;b.z+=dz/d*(R-d)*.5;b.v*=.98;
      if(!(raceT<b.bmpT)&&raceT>3){const ox=Math.cos(o.remote?o.thd:o.hd),oz=-Math.sin(o.remote?o.thd:o.hd),cb=-(fx*dx+fz*dz)/d*b.v,co=(ox*dx+oz*dz)/d*o.v,rel=cb+co;if(rel>4){b.bmpT=raceT+1.2;const ram=cb>co;b.v*=ram?.6:.8;if(!ram){b.x+=dx/d*2;b.z+=dz/d*2;}onRam(b,o,ram);if(!reduce)for(let j=0;j<10;j++)emit((b.x+o.x)/2,1.5,(b.z+o.z)/2,rr()*8,3+Math.random()*5,rr()*8,.7,.6,0);}}}}
  for(const m of MARKS){const dx=b.x-m.x,dz=b.z-m.z,d2=dx*dx+dz*dz,R=cfg.veh==='ship'?7:5.2;if(d2<R*R&&d2>.0001){const d=Math.sqrt(d2);b.x=m.x+dx/d*R;b.z=m.z+dz/d*R;if(!(raceT<b.buoyT)){b.buoyT=raceT+1;b.v*=.6;if(b===me)toast('Bateste na boia!',.9);}}}
  if(b.fin==null){const t=tgt(b),NM=route(b.lap).length;if((b.x-t.x)**2+(b.z-t.z)**2<R_MARK*R_MARK){
    if(b.mark===NM-1){if(cfg.mode==='both'&&b.lap===laps-1){enterLand(b);if(b===me)toast('Agora em terra! Duas voltas à pista de motocross',3);}
      else{b.lap++;if(b.lap>=laps){b.fin=raceT-(cfg.veh==='rabelo'?3*b.pipas:0);if(b===me)onFinish();}else{b.mark=0;if(b===me)toast('Volta '+(b.lap+1)+' de '+laps+': '+LAPNAME[b.lap%LAPS.length]);}}}
    else{if(b===me)toast('Boia '+LET[markId(b)]+' ✓');b.mark++;}}}
}
function enterLand(b,i){const p=TRAIL[i||0];b.land=1;b.on=true;b.ti=b.tp=i||0;b.ll=0;b.v=0;b.x=p.x;b.z=p.z;b.hd=b.va=Math.atan2(-p.tz,p.tx);b.y=b.gy0=GY(p.x,p.z);b.vy=0;b.tx=b.x;b.tz=b.z;b.thd=b.hd;}
function landPhysics(b,dt,rud,inp,drift){
  if(b.land===2){cestoPhysics(b,dt);return;}
  if(dt<=0)return;
  let bi=0,bd=1e9;for(let j=-8;j<=8;j++){const p=TW(b.ti+j),d=(p.x-b.x)**2+(p.z-b.z)**2;if(d<bd){bd=d;bi=j;}}
  bd=Math.sqrt(bd);if(bd<34){b.ti=((b.ti+bi)%TN+TN)%TN;b.tp+=bi;}const on=bd<12.5;b.on=on;
  const thr=b.fin!=null?0:b.bot?1:inp<0?1:inp>0?-1:0,fx=Math.cos(b.hd),fz=-Math.sin(b.hd),grade=(HM(b.x+fx*2,b.z+fz*2)-HM(b.x,b.z))/2;
  const bg=cfg.lveh==='buggy';let top=(on?(bg?31:34):(bg?21:13))*b.skill*(1-clamp(grade*.9,-.15,.45)),acc=thr>0?1.1:thr<0?2.5:.5,target=thr>0?top:0;
  const mud=on&&b.ti>=MUD[0]&&b.ti<=MUD[1];b.mud=mud;if(mud)top*=.62;if(mud&&thr>0)target=top;
  if(on&&!b.air&&PADS.includes(b.ti)&&b.fin==null){if(!(b.boost>.9)&&b===me)toast('Turbo!',1);b.boost=1.3;}
  if(b.air&&!b.bot&&inFlip())b.flip=Math.min(TAU,(b.flip||0)+dt*7.5);
  else if(!b.air&&b.flip){if(b.flip>5.3){b.boost=1.6;if(b===me)toast('Mortal completo! Turbo',1.5);}else if(b.flip>1.2){b.stun=.9;if(b===me)toast('Caíste do mortal!',1.5);}b.flip=0;}
  if(b.boost>0||b.fav>0){target=Math.max(target,on?44:20);acc=2.5;}
  if(b.stun>0){target=2;acc=3;rud=0;b.hd+=7*dt;}
  b.rudIn=rud;const dr=drift&&b.v>8&&!b.air,slip=angDiff(b.hd,b.va);b.slip=slip;b.dr=dr;
  if(!b.air){b.v+=(target-b.v)*Math.min(1,dt*acc);b.v*=1-Math.min(1,Math.abs(slip))*(dr?.3:.6)*dt;
    b.hd+=rud*(bg?1.3:1.6)*(dr?1.7:1)*(1-.44*Math.min(1,b.v/34))*Math.min(1,.3+b.v/4)*dt;b.va+=slip*Math.min(1,dt*(dr?1.4:mud?1.8:bg?5:7));}
  const mx=Math.cos(b.va),mz=-Math.sin(b.va),nx=b.x+mx*b.v*dt,nz=b.z+mz*b.v*dt;if(hF(nx,nz)<.3){b.v=0;b.x-=mx*.5;b.z-=mz*.5;}else{b.x=nx;b.z=nz;}
  for(const o of boats){if(o===b||!o.land)continue;const dx=b.x-o.x,dz=b.z-o.z,d=Math.hypot(dx,dz);const cr=bg?4.5:3;if(d<cr&&d>.01){b.x+=dx/d*(cr-d)*.5;b.z+=dz/d*(cr-d)*.5;
      if(!(raceT<b.bmpT)&&!b.air&&!o.air){const rel=Math.abs(b.v-o.v);if(rel>2.5){b.bmpT=raceT+.7;if(b.v>o.v)b.v-=rel*.55;else b.v=Math.min(b.v+rel*.45,top+6);b.va+=clamp(((dx*mz-dz*mx)>0?-1:1)*.06*rel,-.45,.45);if(b===me)toast('Toque com '+o.name+'!',.9);if(!reduce)for(let j=0;j<6;j++)emit((b.x+o.x)/2,b.y+1.2,(b.z+o.z)/2,rr()*6,2+Math.random()*4,rr()*6,.5,.5,0);}}}}
  {const p=TW(b.ti),ex=b.x-p.x,ez=b.z-p.z,lat=ex*p.nx+ez*p.nz,LIM=13.2;if(Math.abs(lat)>LIM&&bd<34){const k=Math.abs(lat)-LIM,sg=Math.sign(lat);b.x-=p.nx*sg*k;b.z-=p.nz*sg*k;const hit=(mx*p.nx+mz*p.nz)*sg;if(hit>0){b.va=Math.atan2(-(mz-p.nz*sg*hit*1.5),mx-p.nx*sg*hit*1.5);b.hd+=angDiff(b.va,b.hd)*.5;b.v*=1-Math.min(.5,hit*.9);if(hit>.25&&b===me)toast('Bateste na barreira!',.9);if(hit>.25&&!reduce)for(let j=0;j<5;j++)emit(b.x,b.y+1,b.z,rr()*5,2+Math.random()*3,rr()*5,.5,.5,0);}}}
  const gy=GY(b.x,b.z);b.vy-=32*dt;b.y+=b.vy*dt;if(b.y<=gy){b.y=gy;b.vy=clamp((gy-b.gy0)/dt,-40,16);}b.air=b.y>gy+.35;b.gy0=gy;
  if(b.fin==null){
    if(b.tp>=(b.ll+1)*TN+3){b.ll++;const need=cfg.mode==='both'?2:laps;if(b.ll>=need){b.fin=raceT;if(b===me)onFinish();}else{b.lap=b.ll;if(b===me)toast('Volta '+(b.ll+1)+' de '+laps);}}}
}
function botCtl(b){if(b.foot||b.land===2)return 0;if(b.land){const p=TW(b.ti+5),o=(b.slot%5-2)*2.6;return clamp(angDiff(Math.atan2(-(p.z+p.nz*o-b.z),p.x+p.nx*o-b.x),b.hd)*3,-1,1);}
  const t=tgt(b),tb=Math.atan2(-(t.z-b.z),t.x-b.x),d=angDiff(tb,wAng);let want;
  if(cfg.veh!=='sail'||Math.abs(d)>.85)want=tb;else{if(Math.abs(d)>.3)b.tack=Math.sign(d);want=wAng+b.tack*.82;
    if(blocked(b.x+Math.cos(want)*45,b.z-Math.sin(want)*45)){b.tack=-b.tack;want=wAng+b.tack*.82;}}
  const clr=w=>!blocked(b.x+Math.cos(w)*14,b.z-Math.sin(w)*14)&&!blocked(b.x+Math.cos(w)*28,b.z-Math.sin(w)*28)&&!blocked(b.x+Math.cos(w)*42,b.z-Math.sin(w)*42);
  if(raceT<b.avT)want+=b.avO;else if(!clr(want))for(const o of[.45,-.45,.9,-.9,1.4,-1.4,2,-2])if(clr(want+o)){b.avO=o;b.avT=raceT+1.2;want+=o;break;}
  return clamp(angDiff(want,b.hd)*2.5,-1,1);}
function visualLand(b,dt){if(b.land===2){visualCesto(b,dt);return;}const o=b.bike,fx=Math.cos(b.hd),fz=-Math.sin(b.hd);o.visible=true;
  if(b.remote){b.y=GY(b.x,b.z);b.rudIn=clamp(angDiff(b.thd,b.hd)*4,-1,1);}
  if(!b.air)b.pitch+=(Math.atan2(HM(b.x+fx*1.6,b.z+fz*1.6)-HM(b.x-fx*1.6,b.z-fz*1.6),3.2)-b.pitch)*Math.min(1,dt*10||1);
  b.lean+=(-b.rudIn*(cfg.lveh==='buggy'?.07:.4)*Math.min(1,b.v/15)-b.lean)*Math.min(1,dt*6);
  o.position.set(b.x,b.y,b.z);o.rotation.set(0,b.hd,0);o.rotateZ(b.pitch+(b.flip||0));o.rotateX(b.lean);b.bw.forEach(w=>w.rotation.z-=b.v*dt);b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce&&!b.air&&b.v>6)for(let j=Math.abs(b.slip||0)>.15?4:Math.random()<.6?1:0;j>0;j--)emit(b.x-fx*2.5,b.y+.4,b.z-fz*2.5,-fx*3+(Math.random()-.5)*4,0,-fz*3+(Math.random()-.5)*4,1.6,1.1,1);}
function visualMotor(b,dt){const o=b.outer,fx=Math.cos(b.hd),fz=-Math.sin(b.hd),k=Math.min(1,b.v/(BASE*1.2));
  if(b.remote){b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.eff=k;b.rudIn=clamp(angDiff(b.thd,b.hd)*4,-1,1);}
  b.lean+=(-b.rudIn*.35*k-b.lean)*Math.min(1,dt*5);
  const jet=cfg.veh==='jet',ws=waveSlope(b.x,b.z,raceT),wh=getWaveHeight(b.x,b.z,raceT),sl=ws[0]*fx+ws[1]*fz;if(b.remote||!jet)b.y=wh;if(!b.air)b.pitch+=(Math.atan(sl)-b.pitch)*Math.min(1,dt*9||1);else b.pitch+=(-.25-b.pitch)*Math.min(1,dt*1.5);
  o.position.set(b.x,.25+b.y+k*.3,b.z);o.rotation.set(0,b.hd,0);o.rotateZ(k*.1+b.pitch);o.rotateX(b.lean+Math.atan(ws[0]*fz-ws[1]*fx)*.6);b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce&&k>.08){const sx=-fz,sz=fx;for(let j=0;j<2;j++){const sd=j?1:-1;if(Math.random()<k)emit(b.x+fx*3+sx*sd,.3,b.z+fz*3+sz*sd,sx*sd*(5+Math.random()*5),3+Math.random()*4*k,sz*sd*(5+Math.random()*5),.7,.5,0);emit(b.x-fx*5+sx*sd*.8,.12,b.z-fz*5+sz*sd*.8,sx*sd*2,0,sz*sd*2,4,.9,1);}
    if(b.boost>0)for(let j=0;j<4;j++)emit(b.x-fx*5,.5,b.z-fz*5,-fx*10+(Math.random()-.5)*6,4+Math.random()*5,-fz*10+(Math.random()-.5)*6,.8,.7,0);}}
function visual(b,dt){
  if(b.foot){visualFoot(b,dt);return;}
  if(b.land){visualLand(b,dt);return;}
  if(cfg.veh==='ship'){visualShip(b,dt);return;}
  if(cfg.veh==='rabelo'){visualRabelo(b,dt);return;}
  if(cfg.veh!=='sail'){visualMotor(b,dt);return;}
  const fx=Math.cos(b.hd),fz=-Math.sin(b.hd);if(b.remote){b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.ideal=idealSheet(b.twa);b.eff=b.v/BASE;}
  const cross=fx*windTo.z-fz*windTo.x,leeT=cross>0?-1:1;b.lee+=(leeT-b.lee)*Math.min(1,dt*2.5||1);
  const luffT=Math.max(b.twa<.7?1:0,clamp((b.s-b.ideal-.15)*3,0,1));b.luff+=(luffT-b.luff)*Math.min(1,dt*2||1);
  const o=b.outer,heel=b.lee*(.07+.3*Math.min(1,b.eff)*Math.sin(b.twa))*gust;
  const ws=waveSlope(b.x,b.z,raceT);o.position.set(b.x,.2+Math.sin(T*2.2+b.slot)*.08+getWaveHeight(b.x,b.z,raceT),b.z);o.rotation.set(0,b.hd,0);o.rotateX(-heel+Math.atan(ws[0]*fz-ws[1]*fx)*.7);o.rotateZ(Math.sin(T*1.7+b.slot)*.02+Math.atan(ws[0]*fx+ws[1]*fz)*.8);
  const sheet=.12+b.s*1.23;b.rig.rotation.y=-b.lee*sheet;b.jibRig.rotation.y=-b.lee*sheet*.75;
  shapeSail(b.sail,-b.lee*.11*gust,T,b.luff,b.slot);shapeSail(b.jib,-b.lee*.1*gust,T,b.luff,b.slot+2);
  b.vane.rotation.y=Math.atan2(-windTo.z,windTo.x)-b.hd;b.crew.position.z=b.lee*-.95;b.fwd.set(fx,0,fz);
  if(dt>0&&!reduce){const f=b.fwd,sx=-f.z,sz=f.x,bow=o.position.clone().addScaledVector(f,6),st=o.position.clone().addScaledVector(f,-5),k=b.v/BASE;
    if(b.boost>0)for(let j=0;j<4;j++)emit(st.x+(Math.random()-.5)*3,.5,st.z+(Math.random()-.5)*3,-f.x*10+(Math.random()-.5)*6,4+Math.random()*5,-f.z*10+(Math.random()-.5)*6,.8,.7,0);
    if(Math.random()<k)for(let j=0;j<2;j++){const s=j?1:-1;emit(bow.x+sx*s*1.2,.3,bow.z+sz*s*1.2,sx*s*(4+Math.random()*4)+f.x*3,3+Math.random()*3*k,sz*s*(4+Math.random()*4)+f.z*3,.7,.4+Math.random()*.3,0);}
    if(k>.05)for(let j=0;j<2;j++){const s=j?1:-1;emit(st.x+sx*s*.9,.12,st.z+sz*s*.9,sx*s*1.6,0,sz*s*1.6,4,.7,1);}}
}

/* ---------- objetos: caixas na água com turbo, vento de feição, balão de água e algas ---------- */
const ITEMS={shield:{ic:'🛡️',nm:'Proteção'},boost:{ic:'🚀',nm:'Turbo'},fav:{ic:'🌬️',nm:'Vento de feição'},ball:{ic:'💧',nm:'Balão de água'},weed:{ic:'🌿',nm:'Algas'}};
let itemsOn=true,boxes=[],mines=[],shots=[],mineSeq=0,cballs=[];
const boxTex=canvasTex(128,128,g=>{const gr=g.createLinearGradient(0,0,128,128);gr.addColorStop(0,'#ffd23f');gr.addColorStop(.5,'#ff5fa2');gr.addColorStop(1,'#4ac6ff');g.fillStyle=gr;g.fillRect(0,0,128,128);g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=8;g.strokeRect(6,6,116,116);g.fillStyle='#fff';g.font='bold 84px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('?',64,70);});
const boxGeo=new THREE.BoxGeometry(4,4,4),boxMat=new THREE.MeshStandardMaterial({map:boxTex,emissive:0xffffff,emissiveMap:boxTex,emissiveIntensity:.35,transparent:true,opacity:.92,roughness:.4});
{ for(const j of RAMPS.filter((_,i)=>i%2===0)){const p=TW(j+22);for(const o of[-7,0,7]){const x=p.x+p.nx*o,z=p.z+p.nz*o,y=HM(x,z)+3,m=new THREE.Mesh(boxGeo,boxMat);m.scale.setScalar(.7);m.position.set(x,y,z);scene.add(m);boxes.push({m,x,z,y,land:1,t:0});}}}
const weedMat=M(0x2f5a1c,.95),ballMat=M(0x3fb6ff,.2,0,{transparent:true,opacity:.85});
// quem vai à frente só recebe algas ou balões; o meio balões ou proteção; os últimos turbo e vento
function rollItem(b){const ord=[...boats].sort((a,c)=>progress(c)-progress(a)),r=boats.length>1?ord.indexOf(b)/(boats.length-1):.5,h=Math.random()<.5;
  return r<.34?(h?'weed':'ball'):r>.66?(h?'boost':'fav'):(h?'ball':'shield');}
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
function useItem(b){const k=b.item;if(!k)return;if(k==='shield'){b.item=null;b.shield=10;if(b===me)toast('Proteção ligada durante 10 s',1.5);return;}
  if(k==='ball'){const tg=pickTarget(b);if(!tg){if(b===me)toast('Ninguém à frente para acertar');else b.useAt=raceT+2;return;}b.item=null;fireBall(b,tg);sendEv({k:'ball',by:b.id,to:tg.id});}
  else if(k==='weed'){b.item=null;const id=myId+'-'+(mineSeq++),x=b.x-b.fwd.x*10,z=b.z-b.fwd.z*10;addMine(id,x,z,b.id);sendEv({k:'weed',id,x,z,by:b.id});}
  else{b.item=null;b[k]=k==='boost'?3:6;}
  if(b===me&&!b.item)toast(ITEMS[k].ic+' '+ITEMS[k].nm+'!');}
function pickTarget(b){let best=null,bd=1e9;for(const o of boats){if(o===b||o.fin!=null)continue;const dx=o.x-b.x,dz=o.z-b.z,d=Math.hypot(dx,dz);if(d>160||d<4)continue;if((dx*b.fwd.x+dz*b.fwd.z)/d<.5)continue;if(d<bd){bd=d;best=o;}}
  if(!best){const ord=[...boats].sort((a,c)=>progress(c)-progress(a)),i=ord.indexOf(b);if(i>0&&Math.hypot(ord[i-1].x-b.x,ord[i-1].z-b.z)<220)best=ord[i-1];}return best;}
function fireBall(a,t){const o=new THREE.Mesh(new THREE.SphereGeometry(1.4,12,10),ballMat);scene.add(o);shots.push({o,from:a,to:t,t:0});
  if(!t.remote)setTimeout(()=>{if(racing&&boats.includes(t))hitBoat(t,a.name);},700);}
function hitBoat(b,by){if(b.shield>0){b.shield=0;b.cdC=raceT+3;if(b===me)toast('A proteção aguentou!',1.5);return;}b.stun=1.6;b.boost=0;if(b===me)toast(by==='algas'?'Ficaste preso nas algas!':/^(um|uma|o) /.test(by)?'Atacado por '+by+'!':'Atingido por '+by+'!',2);}
function addMine(id,x,z,by){const o=new THREE.Group();const d=new THREE.Mesh(new THREE.CylinderGeometry(6,6,.3,18),weedMat);o.add(d);for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.ConeGeometry(.5,3+Math.random()*2,5),weedMat);s.position.set((Math.random()-.5)*8,1.5,(Math.random()-.5)*8);o.add(s);}
  o.position.set(x,hF(x,z)>0?HM(x,z)+.6:.1,z);scene.add(o);mines.push({id,x,z,by,o,age:0});}
function removeMine(id){const m=mines.find(x=>x.id===id);if(!m)return;scene.remove(m.o);mines=mines.filter(x=>x!==m);}
function clearItems(){mines.slice().forEach(m=>removeMine(m.id));shots.forEach(s=>scene.remove(s.o));shots=[];cballs.forEach(c=>scene.remove(c.o));cballs=[];boxes.forEach(b=>{b.t=0;b.m.visible=itemsOn&&(b.land?cfg.mode!=='sea':cfg.mode!=='land');});}
function onEv(e){if(!racing)return;const by=boats.find(b=>b.id===e.by);
  if(e.k==='ball'){const t=boats.find(b=>b.id===e.to);if(by&&t)fireBall(by,t);}
  else if(e.k==='weed'){if(!mines.some(m=>m.id===e.id))addMine(e.id,e.x,e.z,e.by);}
  else if(e.k==='gone')removeMine(e.id);
  else if(e.k==='tex'){if(by&&by.ctx&&by!==me&&typeof e.d==='string'&&e.d.length<60000&&e.d.startsWith('data:image/png;base64,')){const im=new Image();im.onload=()=>{if(by.role)return;by.ctx.drawImage(im,0,0,48,80);by.tex.needsUpdate=true;by.hasTex=true;setUnlit(by,e.u);};im.src=e.d;}}
  else if(e.k==='shot')onShot(e);else if(e.k==='cb')onCb(e);else if(e.k==='steal')onSteal(e);else if(e.k==='whistle')onWhistle(e);else if(e.k==='chit')onChit(e);else if(e.k==='flag')onFlag(e);}
function sendEv(e,except){if(solo)return;const m={t:'ev',e};if(isHost)conns.forEach(c=>{if(c!==except&&c.open)c.send(m);});else if(hostConn&&hostConn.open)hostConn.send(m);}

function seaBoxes(){boxes.filter(b=>!b.land).forEach(b=>scene.remove(b.m));boxes=boxes.filter(b=>b.land);const legs=new Set();LAPS.forEach((L,li)=>{const r=route(li),from=[li?GATE:GATE,...r];for(let i=0;i<r.length;i++){const a=from[i],b=r[i],k=[a.x,a.z,b.x,b.z].join();if(legs.has(k))continue;legs.add(k);
  const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),px=-dz/l,pz=dx/l;
  for(const o of[-18,0,18]){const x=mx+px*o,z=mz+pz*o;if(blocked(x,z))continue;const m=new THREE.Mesh(boxGeo,boxMat);m.position.set(x,2.5,z);m.castShadow=true;scene.add(m);boxes.push({m,x,z,y:2.5,t:0});}}});}
seaBoxes();
/* ---------- pistas: Funchal, Tejo e Douro ---------- */
/* ---------- travessia: mar aberto da Madeira a Lisboa, com ilhas pelo caminho ---------- */
const ISL=[[-3050,-120,520,300,1.3],[-1520,-360,190,70,2.1],[-900,300,110,95,.4],[-740,380,70,60,3.3],[320,-300,130,60,5.1],[930,280,95,70,1.7],[1650,-330,60,35,2.9]];
const coastM=z=>2860-170*Math.exp(-(((z+420)/170)**2))-150*Math.exp(-(((z-430)/160)**2))+60*Math.exp(-((z/140)**2))+18*Math.sin(z*.021);
function hM(x,z){let h=-12;if(x<1900)for(const I of ISL){const dx=x-I[0],dz=z-I[1],R=I[2]*1.45;if(dx>R||dx<-R||dz>R||dz<-R)continue;const a=Math.atan2(dz,dx),r=I[2]*(1+.16*Math.sin(3*a+I[4])+.08*Math.sin(7*a+I[4]*2)),d=Math.hypot(dx,dz)/r;
    if(d<1.3)h=Math.max(h,d<1?I[3]*(1-d*d)*(1+.25*Math.sin(dx*.02+I[4])*Math.cos(dz*.023)):Math.max(-12,(1-d)*40));}
  else{const d=x-coastM(z);if(d>-40)h=Math.max(h,d<0?d*.3:Math.min(170,d*.3+(22*Math.sin(x*.013)*Math.cos(z*.011)+14)*sm(d,50,200)));}
  return h;}
function buildMar(){const stone=M(0xe6dfcf,.8),flat=(x,z,h)=>Math.abs(hM(x+7,z)-h)+Math.abs(hM(x,z+7)-h)<5;
  const hs=(n,x0,x1,z0,z1,h0,h1)=>scatter(n,()=>{const x=x0+rnd()*(x1-x0),z=z0+rnd()*(z1-z0),h=hM(x,z);if(h<h0||h>h1||!flat(x,z,h))return null;return {x,z,w:9+rnd()*6,d:8+rnd()*5,h:5+rnd()*5,rot:rnd()*3};});
  const ts=(n,x0,x1,z0,z1,h0,h1)=>scatter(n,()=>{const x=x0+rnd()*(x1-x0),z=z0+rnd()*(z1-z0),h=hM(x,z);if(h<h0||h>h1)return null;return {x,z,r:5+rnd()*5};});
  houses(hs(110,-2950,-2400,-560,420,5,90));houses(hs(14,-1680,-1380,-520,-200,4,30));houses(hs(190,2880,3190,-700,700,5,110),tallTex);
  trees([...ts(260,-3350,-2400,-700,500,22,260),...ts(30,-1680,-1380,-520,-200,10,60),...ts(170,2900,3190,-720,720,12,150)]);
  // farol das Berlengas e farol do cabo, a norte da barra
  for(const [x,z] of[[930,280],[2700,-420]]){const y=hM(x,z);cyl(2.2,3,22,M(0xf4f1e8,.6),x,y+11,z,12);cyl(2.8,2.8,3,M(0xb3261e,.5),x,y+23.5,z,12);const lt=new THREE.Mesh(new THREE.SphereGeometry(1.6,10,8),new THREE.MeshBasicMaterial({color:0xfff2b0}));lt.position.set(x,y+23.5,z);world.add(lt);}
  // torre à entrada do Tejo, num baixio: é preciso contorná-la
  {const g=new THREE.Group();box(26,5,26,stone,0,2.5,0,0,g);box(14,26,14,stone,0,18,0,0,g);box(17,2,17,stone,0,31,0,0,g);for(const a of[-7,7])for(const b of[-7,7]){cyl(1.8,1.8,7,stone,a,35,b,8,g);const c=new THREE.Mesh(new THREE.ConeGeometry(2.1,3,8),stone);c.position.set(a,40,b);g.add(c);}box(8,10,8,stone,0,37,0,0,g);box(20,9,12,stone,-15,6,0,0,g);g.position.set(2700,0,-110);world.add(g);}
  // Cristo Rei na margem sul
  {const g=new THREE.Group(),x=2900,z=330,y=hM(x,z);for(const sx of[-5,5])for(const sz of[-5,5])box(3,64,3,stone,sx,32,sz,0,g);box(14,5,14,stone,0,64,0,0,g);statueFigure(g,0,66.5,0,1.9,stone).rotation.y=Math.PI/2;g.position.set(x,y,z);world.add(g);}
  mooredBoats(14,i=>[2760+((i*37)%90),150+((i*53)%220),i*1.3]);
  clouds(7,i=>[-2800+i*820,150+((i*71)%90),((i*193)%900)-450]);}
const zcp=x=>110/430*Math.cos(x/430+.4);
const TRK={
 funchal:{name:'Baía do Funchal',world:worldF,h:hF,COL:COLF,MARKS,GATE,LAPS,LAPNAME,W0,wl:'NE',wk:18,sun:[70,215],fog:[0xc4d8e4,900,5600],wc:0x1580a6,cur:null,mov:[]},
 tejo:{name:'Rio Tejo',h:hT,terr:[2900,1750,0,-150,290,175],build:buildTejo,wl:'NO',wk:16,W0:Math.atan2(1,-1),sun:[66,205],fog:[0xcbd9e2,1100,6000],wc:0x2c4f4a,flow:[-5,0],MX:[-1000,900],mzc:50,
  color(x,z,h,ny,c){const dn=-200-z;if(dn>0){if(h<5)c.set(0xc9c2b0);else if(x<-200&&dn>430)c.set(0x3f6f38);else c.set(0x9c9a88);}else{if(h<1)c.set(0x8a7f68);else if(ny<.8)c.set(0xa38a63);else c.set(0x6f8a4a);}},
  MARKS:[V(-150,0,30),V(250,0,-70),V(650,0,-60),V(450,0,190),V(-150,0,80)],GATE:V(-800,0,40),LAPS:[[0,1,2,3,4]],LAPNAME:['Belém, ponte e Terreiro do Paço'],
  COL:[[-150,-110,15],[-150,170,15],[320,170,19]],
  cur:(x,z)=>[-2.2*clamp(1-((z-50)/240)**2,0,1),0],
  J:110,jit:(b,r)=>b.x===-150?[b.x,b.z+(r()*2-1)*45]:[b.x+(r()*2-1)*130,clamp(b.z+(r()*2-1)*110,-120,230)],mov:[{x0:120,ph:0},{x0:430,ph:2.4}],movAt(m,t){const a=t*.05+m.ph;m.x=m.x0;m.z=50+175*Math.sin(a);m.ry=Math.cos(a)>0?-Math.PI/2:Math.PI/2;},movR:20,movName:'um cacilheiro'},
 mar:{name:'Madeira a Lisboa',h:hM,terr:[6600,1500,-100,0,330,75],build:buildMar,wl:'NNO',wk:20,W0:Math.atan2(1,-.3),sun:[62,200],fog:[0xc9dbe6,1200,7400],wc:0x136f9c,MX:[-3300,3300],mzc:0,
  color(x,z,h,ny,c){if(x<-2300)c.set(h>190?0x55705a:0x3f7a3a);else if(x<-1200&&z<0)c.set(0xc2ad73);else if(x<2000)c.set(0x7a6e5c);else c.set(h<6?0xcdbb8a:0x7f9150);},
  MARKS:[V(-1480,0,60),V(-880,0,-160),V(-150,0,330),V(640,0,-300),V(1230,0,300),V(1900,0,-250)],GATE:V(-2200,0,60),FIN:V(2640,0,0),LAPS:[[0,1,2,3,4,5]],LAPNAME:['Porto Santo, Desertas, alto mar, Berlengas e barra do Tejo'],
  COL:[[2700,-110,22]],J:110,clear:60,cur:null,mov:[]},
 douro:{name:'Rio Douro',h:hD,terr:[2900,1600,-100,0,290,160],build:buildDouro,wl:'NNO',wk:15,W0:Math.atan2(1,-.35),sun:[68,195],fog:[0xcfdbe2,900,5200],wc:0x48684c,flow:[-6,-.8],MX:[-1300,800],mzc:0,
  color(x,z,h,ny,c){const dist=Math.abs(z-zcD(x))-wD(x);if(x<-1000&&h<5)c.set(0xd9c9a0);else if(h<4.5)c.set(0x9a958a);else if(ny<.76)c.set(0x77736b);else if(dist>170&&x>-700)c.set(0x8f927e);else c.set(0x55784a);},
  MARKS:[300,-50,-380,-700].map(x=>V(x,0,zcD(x))),GATE:V(640,0,zcD(640)),LAPS:[[0,1,2,3,2,1,0]],LAPNAME:['Ribeira à Foz e volta'],
  COL:Array.from({length:9},(_,i)=>{const x=230+i*30;return [x,zcD(x)+wD(x)-10-(i%2)*7,9];}),
  clear:22,sep:200,jit:(b,r)=>{const x=b.x+(r()*2-1)*140;return [x,zcD(x)+(r()<.5?-1:1)*(18+r()*24)];},cur:(x,z)=>{const k=2.6*clamp(1-((z-zcD(x))/wD(x))**2,0,1)*(1-sm(-x,700,1100)*.7),sl=zcp(x),l=Math.hypot(1,sl);return [-k/l,-k*sl/l];},mov:[]}};
let trk='funchal',TK=TRK.funchal;TK.markObjs=[];buildMarks(TK);markObjs=TK.markObjs;
function makeFerry(){const g=new THREE.Group();box(34,5,10,M(0xf2f2ee,.5),0,2.5,0,0,g);box(26,4,8,M(0xe8892b,.5),0,7,0,0,g);box(8,3,6,M(0xf2f2ee,.5),6,10.5,0,0,g);world.add(g);return g;}
function mapBg(T){const c=document.createElement('canvas'),w=c.width=mapC.width,h=c.height=mapC.height,g=c.getContext('2d'),hz=(T.MX[1]-T.MX[0])*h/w/2;T.MZ=[T.mzc-hz,T.mzc+hz];
  g.fillStyle='rgba(11,79,102,.55)';g.fillRect(0,0,w,h);g.fillStyle='rgba(70,110,60,.9)';const n=3;for(let i=0;i<w;i+=n)for(let j=0;j<h;j+=n)if(T.h(T.MX[0]+(i+n/2)/w*(T.MX[1]-T.MX[0]),T.MZ[0]+(j+n/2)/h*(T.MZ[1]-T.MZ[0]))>-1.5)g.fillRect(i,j,n,n);T.bg=c;}
function setTrack(k){if(!TRK[k])k='funchal';if(k===trk)return;TK.world.visible=false;trk=k;const T=TK=TRK[k];H=T.h;
  if(!T.world){world=T.world=new THREE.Group();scene.add(world);seed=11;terrain({terr:T.terr,h:T.h,color:T.color});T.build();buildMarks(T);T.mov.forEach(m=>m.g=makeFerry());mapBg(T);}
  world=T.world;world.visible=true;MARKS=T.MARKS;GATE=T.GATE;LAPS=T.LAPS;LAPNAME=T.LAPNAME;COL=T.COL;W0=T.W0;markObjs=T.markObjs;FIN=T.FIN||null;
  sunDir.setFromSphericalCoords(1,deg(T.sun[0]),deg(T.sun[1]));su.sunPosition.value.copy(sunDir);water.material.uniforms.sunDirection.value.copy(sunDir);water.material.uniforms.waterColor.value.copy(lin(T.wc));
  if(envRT)envRT.dispose();envRT=pmrem.fromScene(sky);scene.environment=envRT.texture;scene.fog.color.set(T.fog[0]);scene.fog.density=2/T.fog[2];water.material.uniforms.flow.value.set(T.flow?T.flow[0]:0,T.flow?T.flow[1]:0);seaBoxes();setWaveDir(Math.atan2(Math.sin(T.W0),-Math.cos(T.W0)));}
function shuffleMarks(seed){let q=(seed>>>0)||1;const r=()=>{q=(q*16807)%2147483647;return q/2147483647;},T=TK;if(!T.M0)T.M0=T.MARKS.map(p=>p.clone());
  if(T===TRK.funchal){const o=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){const j=Math.floor(r()*(i+1));[o[i],o[j]]=[o[j],o[i]];}[[o[0],o[1],o[2]],[o[3],o[4],o[5]],[o[6],o[1],o[4]]].forEach((l,i)=>{T.LAPS[i].splice(0,3,...l);T.LAPNAME[i]='boias '+l.map(k=>LET[k]).join(', ');});}
  else if(T===TRK.tejo){const rev=r()<.5,l=T.LAPS[0];if(rev!==(l[0]===4))l.reverse();}
  const ok=(x,z)=>{if(blocked(x,z))return false;for(let a=0;a<8;a++)if(blocked(x+Math.cos(a*.785)*(T.clear||50),z+Math.sin(a*.785)*(T.clear||50)))return false;return true;};
  T.MARKS.forEach((p,i)=>{const b=T.M0[i];p.copy(b);for(let k=0;k<30;k++){let x,z;if(T.jit)[x,z]=T.jit(b,r);else{x=b.x+(r()*2-1)*(T.J||150);z=b.z+(r()*2-1)*(T.J||150);}
      if(ok(x,z)&&Math.hypot(x-T.GATE.x,z-T.GATE.z)>(T.sep||170)&&T.MARKS.every((o,j)=>j>=i||Math.hypot(x-o.x,z-o.z)>(T.sep||170))){p.set(x,0,z);break;}}T.markObjs[i].position.x=p.x;T.markObjs[i].position.z=p.z;});seaBoxes();}
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
  for(const b of boats){if(b.remote||b.land||b.fin!=null||b.stun>0||raceT<b.cdC)continue;for(const c of fauna.all){if(c.act&&(b.x-c.x)**2+(b.z-c.z)**2<c.R*c.R){b.cdC=raceT+5;hitBoat(b,c.name);if(b.stun>0)b.stun=c.stun;break;}}}
}

/* ================= ESCONDIDAS: a pé na cidade, pintar-se com as cores do sítio, um caçador ================= */
const ARENA={x:100,z:zsF(100)-200,r:210},HIDE_T=40,SEEK_T=150,SEEKC=0xe8232a;let hideWin='';
let arenaK='city',AH=HOUSES.filter(o=>Math.hypot(o.x-ARENA.x,o.z-ARENA.z)<ARENA.r+30).map(o=>Object.assign({cs:Math.cos(o.rot),sn:Math.sin(o.rot)},o)),AT=TREES.filter(o=>Math.hypot(o.x-ARENA.x,o.z-ARENA.z)<ARENA.r+10);
const ring=new THREE.Mesh(new THREE.CylinderGeometry(ARENA.r,ARENA.r,260,64,1,true),new THREE.MeshBasicMaterial({color:0x4ad6ff,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false}));ring.position.set(ARENA.x,100,ARENA.z);ring.visible=false;scene.add(ring);
function houseAt(x,z,pad){for(const o of AH){const dx=x-o.x,dz=z-o.z;if(dx>30||dx<-30||dz>30||dz<-30)continue;if(Math.abs(dx*o.cs-dz*o.sn)<o.w/2+pad&&Math.abs(dx*o.sn+dz*o.cs)<o.d/2+pad)return o;}return null;}
function sampleAt(x,z){for(const p of PROPS)if((p.x-x)**2+(p.z-z)**2<(p.r+2.2)**2)return p.c;const h=houseAt(x,z,3.5);if(h)return h.c;if(arenaK!=='city')return ARENAS[arenaK].gc;for(const t of AT)if((t.x-x)**2+(t.z-z)**2<(t.r+2.5)**2)return t.c;if(nearTrail(x,z,11))return 0xa9824f;return hF(x,z)<2.5?0x6f6a60:slope(x,z)>.75?0x6a5f52:0x8a9274;}
const footOk=(x,z)=>!houseAt(x,z,.7)&&!PROPS.some(p=>p.solid&&(p.x-x)**2+(p.z-z)**2<(p.r+.5)**2)&&hF(x,z)>.6&&(x-ARENA.x)**2+(z-ARENA.z)**2<ARENA.r*ARENA.r;
function rndSpot(r,cx,cz){for(let i=0;i<60;i++){const a=Math.random()*TAU,d=Math.sqrt(Math.random())*(r||ARENA.r*.9),x=(cx==null?ARENA.x:cx)+Math.cos(a)*d,z=(cz==null?ARENA.z:cz)+Math.sin(a)*d;if(footOk(x,z))return [x,z];}return [ARENA.x,ARENA.z];}
function hideSpot(av){for(let i=0;i<40;i++){const o=AH[Math.floor(Math.random()*AH.length)];if(!o||av&&Math.hypot(o.x-av.x,o.z-av.z)<70)continue;const sd=Math.random()<.5?1:-1,ax=Math.random()<.5;
    const lx=ax?sd*(o.w/2+1.3):(Math.random()-.5)*o.w*.8,lz=ax?(Math.random()-.5)*o.d*.8:sd*(o.d/2+1.3),x=o.x+lx*o.cs+lz*o.sn,z=o.z-lx*o.sn+lz*o.cs;if(footOk(x,z))return [x,z,o];}return rndSpot();}
const PN=['','um caixote','um barril','um vaso','um arbusto','um banco','um cone','um caixote do lixo','uma botija','uma pilha de pneus','uma cadeira','uma barreira','uma arca'],NFORM=12;
function propMesh(t,c){const g=new THREE.Group(),m=M(c,.75);
  if(t===1)box(2.2,2.2,2.2,m,0,1.1,0,0,g);
  else if(t===2){cyl(.9,.9,2.2,m,0,1.1,0,14,g);for(const y of[.5,1.7])cyl(.94,.94,.14,M(0x333333,.6),0,y,0,14,g);}
  else if(t===3){cyl(.95,.6,1.2,m,0,.6,0,12,g);const l=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,1),M(0x2f7a34,.9));l.position.y=1.9;l.castShadow=true;g.add(l);}
  else if(t===4){const l=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),m);l.scale.set(1.6,1.25,1.6);l.position.y=1;l.castShadow=true;g.add(l);}
  else if(t===5){box(.7,.15,2.6,m,0,.95,0,0,g);box(.12,.9,2.6,m,-.38,1.5,0,0,g);for(const z of[-1.1,1.1])box(.6,.9,.12,M(0x2b2b2b,.6),0,.45,z,0,g);}
  else if(t===6){cyl(.12,.55,1.5,m,0,.85,0,12,g);box(1.3,.12,1.3,m,0,.06,0,0,g);cyl(.3,.38,.3,M(0xffffff,.6),0,.95,0,12,g);}
  else if(t===8){cyl(.48,.48,1.7,m,0,.85,0,14,g);cyl(.3,.48,.3,m,0,1.85,0,14,g);cyl(.12,.12,.3,M(0xc9a23a,.4,.6),0,2.1,0,8,g);}
  else if(t===9){for(const y of[.3,.9,1.5]){const o=new THREE.Mesh(new THREE.TorusGeometry(.62,.3,8,16),m);o.rotation.x=Math.PI/2;o.position.y=y;o.castShadow=true;g.add(o);}}
  else if(t===10){box(1,.14,1,m,0,.95,0,0,g);box(.14,1.1,1,m,-.44,1.55,0,0,g);for(const a of[-.4,.4])for(const b of[-.4,.4])box(.1,.9,.1,M(0x2b2b2b,.5),a,.45,b,0,g);}
  else if(t===11){box(.5,1.05,2.6,m,0,.7,0,0,g);box(.9,.25,2.7,m,0,.14,0,0,g);box(.52,.3,2.62,M(0xffffff,.6),0,.85,0,0,g);}
  else if(t===12){box(1.1,.9,1.8,m,0,.45,0,0,g);box(1.16,.3,1.86,M(0x3a2a1e,.7),0,1.02,0,0,g);box(.1,.3,.3,M(0xc9a23a,.4,.6),.6,.75,0,0,g);}
  else{cyl(.75,.65,1.9,m,0,.95,0,14,g);cyl(.82,.82,.18,M(0x222222,.6),0,1.95,0,14,g);}
  return g;}
function makeMan(){const man=new THREE.Group(),body=new THREE.Group(),cv=document.createElement('canvas');man.add(body);cv.width=48;cv.height=80;const ctx=cv.getContext('2d'),tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.magFilter=THREE.NearestFilter;
  const mmat=new THREE.MeshStandardMaterial({map:tex,roughness:.85}),umat=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});
  box(.62,1.65,1.2,mmat,0,2.47,0,0,body);{const hd=new THREE.Mesh(new THREE.SphereGeometry(.44,14,10),mmat);hd.scale.set(.95,1,.95);hd.position.set(0,3.66,0);hd.castShadow=true;body.add(hd);box(.3,.16,.3,mmat,0,3.26,0,0,body);for(const z of[-.77,.77])box(.3,1.4,.3,mmat,0,2.58,z,0,body);}
  const limb=(y,z,w,l)=>{const g=new THREE.Group();g.position.set(0,y,z);box(w,l,w,mmat,0,-l/2,0,0,g);body.add(g);return g;},legs=[limb(1.65,.3,.44,1.65),limb(1.65,-.3,.44,1.65)];
  // UV por projeção de frente: o desenho da tela cai sobre o corpo como num boneco de papel
  man.updateMatrixWorld(true);const v=V();body.traverse(m=>{if(!m.isMesh)return;m.castShadow=false;const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);uv.setXY(i,clamp((v.z+1.1)/2.2,0,1),clamp(v.y/4,0,1));}uv.needsUpdate=true;});
  const hat=new THREE.Mesh(new THREE.ConeGeometry(.55,1,12),new THREE.MeshStandardMaterial({color:0xffd23f,emissive:0xffd23f,emissiveIntensity:.4}));hat.position.y=4.5;man.add(hat);const gun=new THREE.Group();box(1,.22,.2,M(0x222222,.5),.6,2.7,.72,0,gun);box(.3,.3,.3,M(0xff2fa8,.4),.25,2.95,.72,0,gun);gun.visible=false;man.add(gun);man.visible=false;scene.add(man);return {gun,man,body,mmat,umat,legs,hat,cv,ctx,tex,wp:0,form:0,pose:0};}
function setUnlit(b,u){b.unlit=!!u;b.body.traverse(m=>{if(m.isMesh)m.material=u?b.umat:b.mmat;});}
function setForm(b,f){b.form=f;if(f){b.pose=0;let p=null,bd=1e9;for(const q of PROPS){if(q.type!==f)continue;const d=(q.x-b.x)**2+(q.z-b.z)**2;if(d<bd){bd=d;p=q;}}b.col=p?p.c:PROPC[0];}else avgCol(b);}
// copiar o fundo: fotografa o que está atrás do boneco (com a luz do sítio) e cola-o na tela; o boneco passa a não receber luz nem fazer sombra
const capQ=[],capCam=new THREE.OrthographicCamera(-1,1,1,-1,.1,80);
function capture(b){const o=b.man,el=renderer.domElement,W=el.width,Hh=el.height,asp=W/Hh,sy=o.scale.y,ax=V(1,0,0).applyQuaternion(o.quaternion),ay=V(0,1,0).applyQuaternion(o.quaternion),Hf=Math.max(4*sy,2.4/asp),c=o.position.clone().addScaledVector(ay,2*sy);
  capCam.top=Hf/2;capCam.bottom=-Hf/2;capCam.right=Hf*asp/2;capCam.left=-Hf*asp/2;capCam.updateProjectionMatrix();capCam.position.copy(c).addScaledVector(ax,.4);capCam.up.copy(ay);capCam.lookAt(c.clone().addScaledVector(ax,-1));
  const rv=ring.visible;o.visible=false;ring.visible=false;renderer.render(scene,capCam);o.visible=true;ring.visible=rv;
  const pw=2.2/(Hf*asp)*W,ph=4*sy/Hf*Hh;b.ctx.save();b.ctx.translate(48,0);b.ctx.scale(-1,1);b.ctx.drawImage(el,(W-pw)/2,(Hh-ph)/2,pw,ph,0,0,48,80);b.ctx.restore();b.tex.needsUpdate=true;b.hasTex=true;setUnlit(b,true);sendTex(b);}
const MAXFORM=2;
function cycleForm(){if(!me||!me.foot||me.role||me.fin!=null||raceT<0)return;if((me.formN|0)>=MAXFORM){toast('Já trocaste de objeto '+MAXFORM+' vezes',1.5);return;}closePaint();let f;do f=1+Math.floor(Math.random()*NFORM);while(f===me.form);me.formN=(me.formN|0)+1;setForm(me,f);toast('Calhou-te '+PN[f]+'. '+(MAXFORM-me.formN?'Ainda podes trocar '+(MAXFORM-me.formN)+' vez':'Já não podes trocar')+'. Fica quieto!',2.2);}
function cyclePose(){if(!me||!me.foot||me.role||me.fin!=null||raceT<0)return;me.pose=0;if(me.form){setForm(me,0);toast('Voltaste a ser boneco',1);}}
function caught(b){b.role=1;b.form=0;b.pose=0;b.frz=raceT+3;setCol(b,SEEKC);toast(b===me?'Foste apanhado! Agora também caças':b.name+' foi apanhado!',2.5);}
// assobio: na reta final os escondidos assobiam sozinhos de vez em quando; o som vem da direção onde estão
const WH_T=45,whMarks=[];let whSaid=false,actx=null;
function audio(){if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}if(actx.state==='suspended')actx.resume();return actx;}
addEventListener('pointerdown',audio);addEventListener('keydown',audio);
function whistleSnd(pan,vol){const a=audio();if(!a||vol<=.02)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(1500,t);o.frequency.linearRampToValueAtTime(2300,t+.18);o.frequency.setValueAtTime(1700,t+.27);o.frequency.linearRampToValueAtTime(2550,t+.52);
  const v=vol*.3;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.03);g.gain.setValueAtTime(v,t+.19);g.gain.linearRampToValueAtTime(0,t+.24);g.gain.linearRampToValueAtTime(v,t+.3);g.gain.linearRampToValueAtTime(0,t+.56);o.connect(g);
  if(a.createStereoPanner){const p=a.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(a.destination);}else g.connect(a.destination);o.start(t);o.stop(t+.6);}
function onWhistle(e){const by=boats.find(b=>b.id===e.by);if(!by||!me||cfg.mode!=='hide')return;const fw=cam.getWorldDirection(V()),dx=by.x-cam.position.x,dz=by.z-cam.position.z,d=Math.hypot(dx,dz)||1,pan=(dx*-fw.z+dz*fw.x)/d,front=dx*fw.x+dz*fw.z>0;
  if(by!==me)whistleSnd(pan*.95,clamp(1.2-d/140,0,1));else{whistleSnd(0,.5);toast('Assobiaste! Os caçadores ouviram de que lado',1.2);}
  if(me.role&&by!==me){const a=Math.random()*TAU,r=5+Math.random()*10;whMarks.push({x:by.x+Math.cos(a)*r,z:by.z+Math.sin(a)*r,t:T+2.5});if(whMarks.length>20)whMarks.shift();if(d<150)toast('Assobio '+(Math.abs(pan)<.4?(front?'em frente':'atrás de ti'):pan>0?'à direita':'à esquerda')+'!',1.1);}}
const splats=[],splatGeo=new THREE.CylinderGeometry(1.3,1.3,.06,14),splatMat=new THREE.MeshBasicMaterial({color:0xff2fa8,transparent:true,opacity:.85,depthWrite:false}),AMMO=8;
function clearSplats(){splats.forEach(o=>scene.remove(o.m));splats.length=0;}
function shotEnd(s){const dx=Math.cos(s.hd),dz=-Math.sin(s.hd);let d=1.5;for(;d<32;d+=.7){const x=s.x+dx*d,z=s.z+dz*d;if(houseAt(x,z,.2)||PROPS.some(p=>p.solid&&(p.x-x)**2+(p.z-z)**2<p.r*p.r)||boats.some(h=>!h.role&&h!==s&&(h.x-x)**2+(h.z-z)**2<2.4))break;}return [s.x+dx*d,s.z+dz*d];}
function doShoot(s){if(!s.role||raceT<HIDE_T||raceT<s.frz||raceT<s.tagT||s.fin!=null)return;if(s.ammo==null)s.ammo=AMMO;if(s.ammo<1){if(s===me)toast('Sem tinta. Recarrega sozinha em poucos segundos',1.2);return;}s.ammo--;s.tagT=raceT+.35;const [x,z]=shotEnd(s),e={k:'shot',by:s.id,x0:s.x,z0:s.z,x,z};onShot(e);sendEv(e);}
function onShot(e){if(![e.x0,e.z0,e.x,e.z].every(Number.isFinite))return;const dx=e.x-e.x0,dz=e.z-e.z0,L=Math.hypot(dx,dz)||1;if(L>40)return;
  for(const b of boats){if(b.remote||b.role||b.fin!=null)continue;const t=clamp(((b.x-e.x0)*dx+(b.z-e.z0)*dz)/(L*L),0,1),px=e.x0+dx*t,pz=e.z0+dz*t;if((b.x-px)**2+(b.z-pz)**2<4.5)caught(b);}
  const m=new THREE.Mesh(splatGeo,splatMat);m.position.set(e.x,HM(e.x,e.z)+.2,e.z);m.scale.set(.7+Math.random()*.8,1,.7+Math.random()*.8);scene.add(m);splats.push({m,t:T+14});
  const tr=new THREE.Mesh(unitBox,splatMat);tr.scale.set(.18,.18,L);tr.position.set(e.x0,HM(e.x0,e.z0)+2.5,e.z0);tr.lookAt(e.x,HM(e.x,e.z)+1.2,e.z);tr.geometry=tracerGeo;scene.add(tr);splats.push({m:tr,t:T+.12});
  if(!reduce)for(let i=0;i<8;i++)emit(e.x,HM(e.x,e.z)+1.2,e.z,rr()*9,3+Math.random()*5,rr()*9,.6,.7,0);}
const tracerGeo=new THREE.BoxGeometry(1,1,1);tracerGeo.translate(0,0,.5);
function setCol(b,hex){b.col=hex;b.hasTex=false;setUnlit(b,false);fillMan(b,hex);if(b===me&&hex===SEEKC)closePaint(true);}
function paint(b){if(b.role||b.fin!=null||raceT<0)return;setCol(b,sampleAt(b.x,b.z));}
function camo(h){if(h.form||h.unlit)return .92;if(!(raceT<h.cT)){h.cT=raceT+.5;const a=new THREE.Color(h.col),c=new THREE.Color(sampleAt(h.x,h.z));h.cq=1-Math.hypot(a.r-c.r,a.g-c.g,a.b-c.b)/1.2;}return h.cq;}
function botFoot(b,seek){
  const go=(gx,gz)=>{if(b.blk>.3){b.det=raceT+1;b.blk=0;b.side=b.side||(Math.random()<.5?1:-1);b.stk=(b.stk||0)+1;}return [clamp(angDiff(Math.atan2(-(gz-b.z),gx-b.x)+(raceT<b.det?1.3*b.side:0),b.hd)*4,-1,1),1];};
  if(b.role){if(!seek)return [0,0];let tg=null,bd=1e9;for(const h of boats){if(h.role)continue;const d=Math.hypot(h.x-b.x,h.z-b.z),hard=camo(h)>.9;if(d<bd&&(d<18&&Math.abs(h.v)>1||(hard?d<7&&Math.random()<.04:d<9||d<18&&camo(h)<.8))){bd=d;tg=h;}}
    if(tg){b.lock=tg;b.lockT=raceT+4;}else if(b.lock&&!b.lock.role&&raceT<b.lockT&&boats.includes(b.lock))tg=b.lock;
    if(tg){const d=Math.hypot(tg.x-b.x,tg.z-b.z);if(d<24&&Math.abs(angDiff(Math.atan2(-(tg.z-b.z),tg.x-b.x),b.hd))<.2){const en=shotEnd(b);if((en[0]-tg.x)**2+(en[1]-tg.z)**2<9){doShoot(b);b.tagT=raceT+.8+Math.random();}}return go(tg.x,tg.z);}if(!b.goal||Math.hypot(b.goal[0]-b.x,b.goal[1]-b.z)<6||raceT>b.goalT||b.stk>8){const hs=boats.filter(h=>!h.role),h=hs[Math.floor(Math.random()*hs.length)];b.goal=h&&Math.random()<.6?rndSpot(22,h.x,h.z):rndSpot();b.goalT=raceT+20;b.stk=0;}return go(b.goal[0],b.goal[1]);}
  let dg=null;if(seek)for(const s of boats)if(s.role&&Math.hypot(s.x-b.x,s.z-b.z)<11)dg=s;
  if(b.objF==null)b.objF=Math.random()<.45?1+Math.floor(Math.random()*NFORM):0;
  if(dg&&!(raceT<b.fleeT)){b.goal=b.objF?rndSpot():hideSpot(dg);b.fleeT=raceT+4;b.hid=false;b.stk=0;b.form=0;b.pose=0;}
  if(!b.goal)b.goal=b.objF?rndSpot():hideSpot();
  if(Math.hypot(b.goal[0]-b.x,b.goal[1]-b.z)<1.6||b.stk>7){if(!b.hid){b.hid=true;b.v=0;if(b.objF)setForm(b,b.objF);else{const o=b.goal[2];if(o)b.hd=Math.atan2(-(b.z-o.z),b.x-o.x);b.pose=0;b.man.rotation.set(0,b.hd,0);b.man.scale.y=b.pose?.5:1;b.man.position.set(b.x,b.y,b.z);b.man.updateMatrixWorld(true);paint(b);}}return [0,0];}
  return go(b.goal[0],b.goal[1]);}
function footPhysics(b,dt,rud,inp){
  if(b.fin!=null||dt<=0){b.v=0;return;}
  const seek=raceT>=HIDE_T;let fwd=-inp;if(b.bot)[rud,fwd]=botFoot(b,seek);
  if(b.role){b.amT=(b.amT||0)+dt;if(b.amT>4){b.amT=0;b.ammo=Math.min(AMMO,(b.ammo==null?AMMO:b.ammo)+1);}}
  if(!b.role&&seek&&b.fin==null&&HIDE_T+SEEK_T-raceT<WH_T){if(b.whT==null)b.whT=raceT+Math.random()*8;else if(raceT>=b.whT){b.whT=raceT+8+Math.random()*4;const e={k:'whistle',by:b.id};onWhistle(e);sendEv(e);}}
  if(b.role&&!seek||raceT<b.frz){b.v=0;return;}
  if(fwd&&b.pose===2)b.pose=0;b.hd+=rud*2.8*dt;b.v+=((b.role?10.5:b.form?5:b.pose?4.5:9)*(fwd>0?1:fwd<0?-.5:0)-b.v)*Math.min(1,dt*8);
  const nx=b.x+Math.cos(b.hd)*b.v*dt,nz=b.z-Math.sin(b.hd)*b.v*dt;
  if(footOk(nx,nz)){b.x=nx;b.z=nz;b.blk=0;}else if(footOk(nx,b.z)){b.x=nx;b.blk=(b.blk||0)+dt*.5;}else if(footOk(b.x,nz)){b.z=nz;b.blk=(b.blk||0)+dt*.5;}else{b.v=0;b.blk=(b.blk||0)+dt;}
  b.y=HM(b.x,b.z);
}
function visualFoot(b,dt){const o=b.man;o.visible=true;if(b.remote)b.y=HM(b.x,b.z);if(b.remote){if(b.role){if(!b.red){b.red=1;fillMan(b,SEEKC);}}else if(b.colS!==b.col){b.colS=b.col;if(!b.hasTex)fillMan(b,b.col);}}b.hat.visible=b.gun.visible=!!b.role;
  const f=b.role?0:b.form|0,ps=b.role||f?0:b.pose|0;if(f!==b.fS||f&&b.col!==b.fC){if(b.fg)o.remove(b.fg);b.fg=f?propMesh(f,b.col):null;if(b.fg)o.add(b.fg);b.fS=f;b.fC=b.col;}b.body.visible=!f;
  o.position.set(b.x,b.y+(ps===2?.3:0),b.z);o.rotation.set(0,b.hd,ps===2?Math.PI/2:0);o.scale.y=ps===1?.5:1;b.wp+=Math.abs(b.v)*dt*1.1;const sw=Math.sin(b.wp)*.75*Math.min(1,Math.abs(b.v)/5);b.legs[0].rotation.z=sw;b.legs[1].rotation.z=-sw;b.fwd.set(Math.cos(b.hd),0,-Math.sin(b.hd));}
const css=h=>'#'+new THREE.Color(h).getHexString();
function hudHide(){const seek=raceT>=HIDE_T,left=boats.filter(b=>!b.role).length,rem=HIDE_T+SEEK_T-raceT;
  $('clock').textContent=me.fin!=null?(hideWin==='h'?'GANHARAM OS ESCONDIDOS':'GANHARAM OS CAÇADORES'):raceT<0?'ESCONDIDAS':!seek?'ESCONDAM-SE · '+Math.ceil(HIDE_T-raceT)+' s':'À PROCURA · '+fmt(Math.max(0,rem)).slice(0,5);
  $('blind').hidden=!(me.role0&&raceT>=0&&!seek&&me.fin==null);if(!$('blind').hidden)$('blindn').textContent=Math.ceil(HIDE_T-raceT);
  $('rank').innerHTML=`<div>Escondidos: ${left} · Caçadores: ${boats.length-left}</div>`+boats.filter(b=>b.role).map(b=>`<div class="r${b===me?' me':''}"><span>🔎</span><span class="dot" style="background:${css(SEEKC)}"></span><span>${esc(b.name)}</span><span></span></div>`).join('');
  $('hrole').textContent=me.role?'És CAÇADOR · tinta '+'●'.repeat(me.ammo==null?AMMO:me.ammo):'Estás ESCONDIDO';$('htip').textContent=me.role?(seek?'Espaço (★) dispara tinta em frente. Quem for atingido passa a caçador. Há gente pintada como a parede e gente feita objeto: a tinta é pouca, aponta bem.':'Espera: os outros estão a esconder-se.'):(seek&&rem<WH_T?'Reta final: de vez em quando tens de assobiar e o som denuncia a tua zona. ':'')+'Espaço abre as tintas: pinta o boneco com as cores do sítio. F transforma-te num objeto ao acaso (só '+MAXFORM+' vezes, restam '+(MAXFORM-(me.formN|0))+'). Depois fica quieto!';$('hbtn').hidden=!!me.role;
  $('swme').style.background=css(me.col);$('swhere').style.background=css(sampleAt(me.x,me.z));$('hsw').hidden=!!me.role;
  if(seek&&rem<WH_T&&rem>0&&!whSaid&&me.fin==null){whSaid=true;toast('Últimos '+WH_T+' segundos: os escondidos têm de assobiar!',3);}
  if(me.fin==null&&raceT>HIDE_T&&(rem<=0||left===0)){hideWin=left>0?'h':'s';for(const b of boats)if(!b.remote)b.fin=raceT;toast(hideWin==='h'?'Fim! Ganharam os escondidos':'Fim! Todos apanhados',3);}
  if(me.fin!=null&&!finShown&&raceT-me.fin>2.5){finShown=true;$('results').hidden=false;}if(finShown)renderResults();}
function mapHide(){const w=mapC.width,h=mapC.height,k=h/(ARENA.r*2.2),sx=x=>w/2+(x-ARENA.x)*k,sz=z=>h/2+(z-ARENA.z)*k;mg.clearRect(0,0,w,h);mg.fillStyle='rgba(70,90,70,.75)';mg.fillRect(0,0,w,h);
  for(const p of PROPS){mg.fillStyle=css(p.c);mg.beginPath();mg.arc(sx(p.x),sz(p.z),Math.max(2,p.r*k),0,7);mg.fill();}
  mg.fillStyle='rgba(230,225,210,.8)';for(const o of AH)if(!o.mural)mg.fillRect(sx(o.x)-o.w*k/2,sz(o.z)-o.d*k/2,o.w*k,o.d*k);mg.strokeStyle='#4ad6ff';mg.lineWidth=2;mg.beginPath();mg.arc(sx(ARENA.x),sz(ARENA.z),ARENA.r*k,0,7);mg.stroke();mg.lineWidth=1;
  if(me.role)for(const m of whMarks){const u=(m.t-T)/2.5;if(u<=0)continue;mg.strokeStyle='rgba(255,225,74,'+u.toFixed(2)+')';mg.lineWidth=3;mg.beginPath();mg.arc(sx(m.x),sz(m.z),18*k*(1.4-u*.4),0,7);mg.stroke();mg.lineWidth=1;}
  for(const b of boats){if(b!==me&&!(b.role&&me.role))continue;mg.save();mg.translate(sx(b.x),sz(b.z));mg.rotate(-b.hd);mg.fillStyle=b===me?'#ffd23f':css(SEEKC);mg.beginPath();mg.moveTo(7,0);mg.lineTo(-4,4);mg.lineTo(-4,-4);mg.fill();mg.restore();}}

/* ---------- objetos coloridos na zona das escondidas (iguais em todos os jogadores: gerador com semente fixa) ---------- */
const PROPC=[0x2f6fd0,0xd0342c,0xf2c230,0x2a9d58,0xe67e22,0x8e44ad,0xff5fa2,0x19b5b0];let PROPS=[];
{let ps=4711;const pr=()=>{ps=(ps*16807)%2147483647;return ps/2147483647;},spot=()=>{for(let i=0;i<80;i++){const a=pr()*TAU,d=Math.sqrt(pr())*ARENA.r*.92,x=ARENA.x+Math.cos(a)*d,z=ARENA.z+Math.sin(a)*d;if(footOk(x,z)&&!nearTrail(x,z,17)&&!houseAt(x,z,3)&&!PROPS.some(p=>(p.x-x)**2+(p.z-z)**2<100))return [x,z];}return null;};
  const add=(n,fn)=>{for(let i=0;i<n;i++){const s=spot();if(s)fn(s[0],s[1],HM(s[0],s[1]),PROPC[Math.floor(pr()*PROPC.length)],pr);}};
  add(18,(x,z,y,c,pr)=>{const m=M(c,.7),g=new THREE.Group();box(2.4,2.4,2.4,m,-1.3,1.2,0,pr(),g);box(2.4,2.4,2.4,m,1.3,1.2,.3,pr(),g);box(2.2,2.2,2.2,m,0,3.5,.1,pr(),g);g.position.set(x,y-.2,z);worldF.add(g);PROPS.push({x,z,r:2.9,c,solid:1});});
  add(16,(x,z,y,c)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,2.4,24),M(c,.9));m.position.set(x,y-.9,z);m.receiveShadow=true;worldF.add(m);PROPS.push({x,z,r:5.5,c,solid:0});});
  add(10,(x,z,y,c)=>{const g=new THREE.Group(),m=M(c,.8);const t=new THREE.Mesh(new THREE.ConeGeometry(4,3,4),m);t.position.y=5.4;t.rotation.y=Math.PI/4;t.castShadow=true;g.add(t);box(5.2,3,.3,m,0,2.3,-2.6,0,g);for(const [a,b] of[[-2.6,2.6],[2.6,2.6]])cyl(.12,.12,4,M(0xdddddd,.4),a,2,b,6,g);g.position.set(x,y-.2,z);worldF.add(g);PROPS.push({x,z:z,r:3.4,c,solid:0});});
  add(14,(x,z,y,c,pr)=>{const rot=pr()*Math.PI;box(9,4.6,.7,M(c,.85),x,y+1.6,z,rot,worldF);AH.push({x,z,w:9,d:.7,rot,c,cs:Math.cos(rot),sn:Math.sin(rot),mural:1});PROPS.push({x,z,r:1,c,solid:0});});
  const dec=(n,t,r,cf)=>{for(let i=0;i<n;i++){const s=spot();if(!s)continue;const c=cf||PROPC[Math.floor(pr()*PROPC.length)],g=propMesh(t,c);g.position.set(s[0],HM(s[0],s[1])-.1,s[1]);g.rotation.y=pr()*3;worldF.add(g);PROPS.push({x:s[0],z:s[1],r,c,solid:1,type:t});}};
  dec(14,1,1.5);dec(12,2,1.1);dec(12,3,1.1,0xb5562f);dec(14,4,1.6,0x2d5f2c);dec(10,5,1.4,0x7a5a3a);dec(10,6,.8,0xe67e22);dec(10,7,.9,0x2a9d58);dec(8,8,.7);dec(8,9,1,0x2b2b2b);dec(8,10,.8);dec(8,11,1.5,0xd0342c);dec(8,12,1.2,0x7a5a3a);}

/* ---------- outros mapas das escondidas: armazém e base militar, em plataformas ao largo ---------- */
const ARENAS={city:{x:ARENA.x,z:ARENA.z,r:ARENA.r,AH,AT,PROPS,g:null,nm:'Cidade do Funchal'}};
function setArena(k){if(!ARENAS[k])k='city';arenaK=k;const a=ARENAS[k];ARENA.x=a.x;ARENA.z=a.z;ARENA.r=a.r;AH=a.AH;AT=a.AT;PROPS=a.PROPS;for(const q in ARENAS)if(ARENAS[q].g)ARENAS[q].g.visible=q===k;ring.position.set(a.x,100,a.z);ring.scale.set(a.r/210,1,a.r/210);}
function mkArena(k,nm,x,z,r,gc,build){ARENA.x=x;ARENA.z=z;ARENA.r=r;AH=[];AT=[];PROPS=[];const g=new THREE.Group();g.visible=false;worldF.add(g);let ps=977+k.length*131;const pr=()=>{ps=(ps*16807)%2147483647;return ps/2147483647;},Y=PADY;
  const col=(wx,wz,w,d,c,rot)=>{rot=rot||0;const al=w>=d,n=Math.ceil(Math.max(w,d)/24),cs=Math.cos(rot),sn=Math.sin(rot);for(let i=0;i<n;i++){const t=(i+.5)/n-.5,lx=al?t*w:0,lz=al?0:t*d;AH.push({x:wx+lx*cs+lz*sn,z:wz-lx*sn+lz*cs,w:al?w/n:w,d:al?d:d/n,rot,c,cs,sn});}};
  const wall=(wx,wz,w,d,h,c,rot)=>{const m=box(w,h,d,M(c,.85),wx,Y+h/2,wz,rot||0,g);col(wx,wz,w,d,c,rot);return m;};
  const spot=(gap)=>{for(let i=0;i<160;i++){const a=pr()*TAU,dd=Math.sqrt(pr())*r*.94,px=x+Math.cos(a)*dd,pz=z+Math.sin(a)*dd;if(footOk(px,pz)&&!houseAt(px,pz,2.6)&&!PROPS.some(p=>(p.x-px)**2+(p.z-pz)**2<(gap||150)))return [px,pz];}return null;};
  const pick=c=>Array.isArray(c)?c[Math.floor(pr()*c.length)]:c||PROPC[Math.floor(pr()*PROPC.length)];
  const dec=(n,t,rr,cf)=>{for(let i=0;i<n;i++){const sp=spot();if(!sp)continue;const c=pick(cf),o=propMesh(t,c);o.position.set(sp[0],Y-.05,sp[1]);o.rotation.y=pr()*3;g.add(o);PROPS.push({x:sp[0],z:sp[1],r:rr,c,solid:1,type:t});}};
  const pile=(n,cf)=>{for(let i=0;i<n;i++){const sp=spot(120);if(!sp)continue;const c=pick(cf),m=M(c,.7),o=new THREE.Group();box(2.4,2.4,2.4,m,-1.3,1.2,0,pr(),o);box(2.4,2.4,2.4,m,1.3,1.2,.3,pr(),o);box(2.2,2.2,2.2,m,0,3.5,.1,pr(),o);o.position.set(sp[0],Y,sp[1]);g.add(o);PROPS.push({x:sp[0],z:sp[1],r:2.9,c,solid:1});}};
  const disc=(n,rad,cf)=>{for(let i=0;i<n;i++){const sp=spot(rad*rad*4.4);if(!sp)continue;const c=pick(cf),m=new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,.12,28),M(c,.9));m.position.set(sp[0],Y+.07,sp[1]);m.receiveShadow=true;g.add(m);PROPS.push({x:sp[0],z:sp[1],r:rad,c,solid:0});}};
  build({g,pr,wall,col,spot,dec,pile,disc,pick,x,z,Y});ARENAS[k]={x,z,r,AH,AT,PROPS,g,gc,nm};}
mkArena('arm','Armazém',HPAD[0][0],HPAD[0][1],76,0x8d9094,({g,pr,wall,col,spot,dec,pile,disc,x,z,Y})=>{const hw=HPAD[0][2],hd=HPAD[0][3],HW=15;
  const fl=box(hw*2+4,3,hd*2+4,M(0x8d9094,.92),x,Y-1.5,z,0,g);fl.castShadow=false;
  const stripe=canvasTex(64,64,(c,w,h)=>{c.fillStyle='#c3cbd1';c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.fillStyle='rgba(60,70,80,.22)';c.fillRect(i*8,0,3,h);}});stripe.wrapS=stripe.wrapT=THREE.RepeatWrapping;
  const inner=(len,h,px,py,pz,ry,mat)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(len,h),mat);m.position.set(px,py,pz);m.rotation.y=ry;m.receiveShadow=true;g.add(m);return m;};
  const bandC=0x2f4a6b,bm=M(bandC,.8);
  for(const [len,px,pz,ry] of[[hw*2,x,z-hd,0],[hw*2,x,z+hd,Math.PI],[hd*2,x-hw,z,Math.PI/2],[hd*2,x+hw,z,-Math.PI/2]]){const t=stripe.clone();t.needsUpdate=true;t.repeat.set(len/8,1);inner(len,HW-5,px,Y+5+(HW-5)/2,pz,ry,new THREE.MeshStandardMaterial({map:t,roughness:.7,metalness:.2}));inner(len,5,px,Y+2.5,pz,ry,bm);
    col(px,pz,ry%Math.PI===0?len:1.4,ry%Math.PI===0?1.4:len,bandC,0);}
  const roof=new THREE.Mesh(new THREE.PlaneGeometry(hw*2,hd*2),M(0x59626b,.8));roof.rotation.x=Math.PI/2;roof.position.set(x,Y+HW,z);g.add(roof);
  const lm=new THREE.MeshBasicMaterial({color:0xfff6dc});for(let i=-2;i<=2;i++)for(const j of[-1,1]){const l=new THREE.Mesh(new THREE.BoxGeometry(14,.3,1.2),lm);l.position.set(x+i*23,Y+HW-.4,z+j*20);g.add(l);}
  const fr=M(0xe67e22,.6);
  for(const i of[0,2,4])for(const j of[-1,1]){const rx=x-44+i*22,rz=z+j*21,c=PROPC[(i*2+(j>0?1:0))%PROPC.length],L=24;
    for(const a of[-L/2,-L/6,L/6,L/2])for(const b of[-1.2,1.2])box(.3,9,.3,fr,rx+b,Y+4.5,rz+a,0,g);
    for(const y of[.3,3.2,6.1]){box(2.9,.25,L,fr,rx,Y+y,rz,0,g);for(let q=0;q<4;q++){const cc=y<1?c:PROPC[Math.floor(pr()*PROPC.length)];if(y>1&&pr()<.25)continue;box(2.3,2.2+pr()*.5,4.6,M(cc,.75),rx,Y+y+1.3,rz-L/2+3+q*6,0,g);}}
    col(rx,rz,2.9,L,c,0);}
  for(const [cx,cz,rot,ci,st] of[[-50,-36,0,1,1],[46,36,0,0,0],[-55,10,Math.PI/2,2,0],[55,-8,Math.PI/2,4,1],[-22,0,.4,6,0],[22,4,-.5,3,0]]){const c=PROPC[ci];wall(x+cx,z+cz,12,3,3.2,c,rot);if(st){const m=box(12,3.2,3,M(PROPC[(ci+3)%8],.85),x+cx,Y+4.8,z+cz,rot,g);m.castShadow=true;}}
  for(const i of[-1,0,1])for(const j of[-.5,.5]){const px=x+i*33+11,pz=z+j*8;cyl(.8,.8,HW,M(0x9aa1a8,.7),px,Y+HW/2,pz,10,g);PROPS.push({x:px,z:pz,r:.9,c:0x9aa1a8,solid:1});}
  for(let i=0;i<4;i++){const sp=spot(150);if(!sp)continue;const o=new THREE.Group(),ym=M(0xf2c230,.6),dk=M(0x2b2b2b,.6);box(3.4,1.6,2,ym,0,1.2,0,0,o);box(1.5,1.8,1.9,dk,-.6,2.8,0,0,o);box(.25,4.6,.25,dk,1.9,2.3,.7,0,o);box(.25,4.6,.25,dk,1.9,2.3,-.7,0,o);box(1.8,.15,.35,dk,2.9,.5,.6,0,o);box(1.8,.15,.35,dk,2.9,.5,-.6,0,o);for(const a of[-1.1,1.1])for(const b of[-1,1]){const w=cyl(.55,.55,.4,dk,a,.55,b,10,o);w.rotation.x=Math.PI/2;}o.position.set(sp[0],Y,sp[1]);o.rotation.y=pr()*6;g.add(o);PROPS.push({x:sp[0],z:sp[1],r:2.6,c:0xf2c230,solid:1});}
  pile(4);disc(5,4.5);dec(4,1,1.5);dec(4,2,1.1);dec(3,3,1.1,0xb5562f);dec(3,4,1.6,0x2d5f2c);dec(3,5,1.4,0x7a5a3a);dec(4,6,.8,0xe67e22);dec(3,7,.9,0x2a9d58);dec(4,8,.7);dec(4,9,1,0x2b2b2b);dec(3,10,.8);dec(4,11,1.5,0xd0342c);dec(3,12,1.2,0x7a5a3a);});
mkArena('base','Base militar',HPAD[1][0],HPAD[1][1],118,0x8f8b6c,({g,pr,wall,col,spot,dec,pile,disc,x,z,Y})=>{const hw=HPAD[1][2],MIL=[0x5f6b4a,0x7b6a4a,0xb8a67a,0x3f4a35,0x6b7a4f,0x8a2f2a,0x4a5560];
  const fl=box(hw*2+6,3,hw*2+6,M(0x8f8b6c,.95),x,Y-1.5,z,0,g);fl.castShadow=false;
  for(const [px,pz,w,d] of[[x,z-hw,hw*2,1],[x,z+hw,hw*2,1],[x-hw,z,1,hw*2],[x+hw,z,1,hw*2]])box(w,4,d,M(0x7d7f72,.9),px,Y+2,pz,0,g);
  const tower=(px,pz,solid)=>{const o=new THREE.Group(),m=M(0x6a5a3c,.8);for(const a of[-1.5,1.5])for(const b of[-1.5,1.5])box(.35,9,.35,m,a,4.5,b,0,o);box(4.4,.3,4.4,m,0,9,0,0,o);box(4.4,1.3,.2,M(0x5f6b4a,.8),0,9.8,2.1,0,o);box(4.4,1.3,.2,M(0x5f6b4a,.8),0,9.8,-2.1,0,o);box(.2,1.3,4.4,M(0x5f6b4a,.8),2.1,9.8,0,0,o);box(.2,1.3,4.4,M(0x5f6b4a,.8),-2.1,9.8,0,0,o);const rf=new THREE.Mesh(new THREE.ConeGeometry(3.6,1.8,4),M(0x3f4a35,.8));rf.position.y=12.6;rf.rotation.y=Math.PI/4;rf.castShadow=true;o.add(rf);o.position.set(px,Y,pz);g.add(o);if(solid)PROPS.push({x:px,z:pz,r:2.4,c:0x6a5a3c,solid:1});};
  for(const a of[-1,1])for(const b of[-1,1])tower(x+a*(hw-6),z+b*(hw-6),0);tower(x-20,z+62,1);tower(x+70,z-12,1);
  for(let i=0;i<3;i++)for(const j of[0,1]){const bx=x-64+i*26,bz=z-70+j*24,c=j?0x5f6b4a:0x6b7a4f;wall(bx,bz,18,8,5,c,0);const rf=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.6,18.4,3,1),M(0x3f4a35,.85));rf.rotation.z=Math.PI/2;rf.rotation.y=0;rf.scale.set(.55,1,1);rf.position.set(bx,Y+6.2,bz);rf.castShadow=true;g.add(rf);box(1.6,2.8,.2,M(0x2b2f26,.7),bx,Y+1.4,bz+4.05,0,g);}
  for(const [hx,hz] of[[52,-64],[52,-30]]){wall(x+hx,z+hz,30,22,6,0x7d8576,0);const rf=new THREE.Mesh(new THREE.CylinderGeometry(11,11,30,20,1,false,0,Math.PI),M(0x8f978a,.6,.3));rf.rotation.z=Math.PI/2;rf.position.set(x+hx,Y+6,z+hz);rf.castShadow=true;g.add(rf);box(.3,5,12,M(0x3a4038,.7),x+hx-15.1,Y+2.5,z+hz,0,g);}
  wall(x-8,z+4,20,14,8,0xa39a7c,0);box(21,.6,15,M(0x6b6455,.8),x-8,Y+8.3,z+4,0,g);cyl(.12,.12,10,M(0xcccccc,.4),x-14,Y+13,z,6,g);{const d=new THREE.Mesh(new THREE.SphereGeometry(2.2,14,8,0,TAU,0,1.1),M(0xd9d9d9,.5));d.position.set(x-3,Y+9.6,z+6);d.rotation.x=-.9;d.castShadow=true;g.add(d);}
  const veh=(px,pz,rot,kind)=>{const o=new THREE.Group(),c=kind===0?0x4a5a3a:kind===1?0x55603f:0x6b7a4f,m=M(c,.8),dk=M(0x24261f,.7);
    if(kind===0){box(7.4,1.3,3.8,m,0,1.2,0,0,o);box(8,.9,.9,dk,0,.5,1.7,0,o);box(8,.9,.9,dk,0,.5,-1.7,0,o);box(3.2,1.1,2.6,m,-.4,2.4,0,0,o);const br=cyl(.18,.18,4.6,dk,2.9,2.5,0,8,o);br.rotation.z=Math.PI/2;}
    else if(kind===1){box(2.4,2.2,2.8,m,2.6,1.9,0,0,o);box(5.4,2.6,2.9,M(0x7b6a4a,.9),-1.4,2.2,0,0,o);box(8,.5,2.6,dk,0,.8,0,0,o);for(const a of[-2.6,-.6,2.6])for(const b of[-1.3,1.3]){const w=cyl(.7,.7,.5,dk,a,.7,b,10,o);w.rotation.x=Math.PI/2;}}
    else{box(4.2,1,2.2,m,0,1.1,0,0,o);box(1.6,.9,2,m,-.9,2,0,0,o);box(.1,.9,2,dk,.3,2,0,0,o);for(const a of[-1.4,1.4])for(const b of[-1.1,1.1]){const w=cyl(.6,.6,.45,dk,a,.6,b,10,o);w.rotation.x=Math.PI/2;}}
    o.position.set(px,Y,pz);o.rotation.y=rot;g.add(o);col(px,pz,kind===2?4.4:8,kind===2?2.4:3.8,c,rot);};
  veh(x+22,z+40,.3,0);veh(x+40,z+48,-.2,0);veh(x+62,z+30,1.2,0);veh(x-60,z+20,0,1);veh(x-60,z+30,0,1);veh(x-40,z+78,1.57,1);veh(x+8,z-40,.8,2);veh(x-30,z-28,2.2,2);veh(x+30,z+8,-.6,2);veh(x+80,z+60,.4,2);
  {const hp=new THREE.Mesh(new THREE.CylinderGeometry(13,13,.14,36),M(0x50555a,.9));hp.position.set(x+18,Y+.08,z+78);hp.receiveShadow=true;g.add(hp);const hm=new THREE.MeshBasicMaterial({color:0xf2e9c8});for(const a of[-3,3]){const l=new THREE.Mesh(new THREE.BoxGeometry(1,.05,9),hm);l.position.set(x+18+a,Y+.2,z+78);g.add(l);}const l=new THREE.Mesh(new THREE.BoxGeometry(6,.05,1),hm);l.position.set(x+18,Y+.2,z+78);g.add(l);PROPS.push({x:x+18,z:z+78,r:13,c:0x50555a,solid:0});}
  for(let i=0;i<14;i++){const sp=spot(200);if(!sp)continue;const rot=pr()*Math.PI;wall(sp[0],sp[1],9,1.5,1.7,0xb8a67a,rot);PROPS.push({x:sp[0],z:sp[1],r:1,c:0xb8a67a,solid:0});}
  for(let i=0;i<7;i++){const sp=spot(200);if(!sp)continue;const c=i%2?0x6b7a4f:0x7b6a4a,o=new THREE.Group(),m=M(c,.9);const t=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,7,3,1),m);t.rotation.z=Math.PI/2;t.scale.set(.75,1,1);t.position.y=1.3;t.castShadow=true;o.add(t);o.position.set(sp[0],Y,sp[1]);o.rotation.y=pr()*3;g.add(o);PROPS.push({x:sp[0],z:sp[1],r:3.4,c,solid:0});}
  pile(8,MIL);disc(5,5,[0x7b6a4a,0x6b7a4f,0x4a5560]);dec(9,1,1.5,MIL);dec(9,2,1.1,MIL);dec(4,3,1.1,0xb5562f);dec(8,4,1.6,[0x2d5f2c,0x3f4a35,0x6b7a4f]);dec(4,5,1.4,0x7a5a3a);dec(6,6,.8,0xe67e22);dec(5,7,.9,[0x3f4a35,0x4a5560]);dec(7,8,.7,[0x8a2f2a,0x4a5560]);dec(8,9,1,0x2b2b2b);dec(4,10,.8,MIL);dec(8,11,1.5,[0xb8a67a,0xd0342c]);dec(7,12,1.2,MIL);});
setArena('city');

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
  for(const [id,f] of[['hform',cycleForm],['hpose',cyclePose]])document.getElementById(id).addEventListener('click',e=>{e.preventDefault();f();e.currentTarget.blur();});
  document.getElementById('phere').onclick=e=>pickCol(+e.currentTarget.dataset.c);
  document.getElementById('pclose').onclick=()=>closePaint();pickCol(PAL[0]);}

/* ---------- bandeira: cada jogador pinta a sua antes de zarpar; vai para os outros como PNG pequeno ---------- */
const FPAL=[0x16161a,0xf4f1e8,0xd0342c,0xf2c230,0x2f6fd0,0x2a9d58,0xe67e22,0x8e44ad,0xff5fa2,0x19b5b0,0x7a5a3a,0xc9a23a,0x8a1f1a,0x0f3d7a,0x6fbf4a,0x9aa1a8,0x5b2a86,0xffffff];
let fOpen=false,fCol=FPAL[1],fSize=2.2,fLast=null;
const fcvEl=document.getElementById('fcv'),fg2=fcvEl.getContext('2d');
function applyMyFlag(){if(!me||!me.fctx)return;me.fctx.drawImage(fcvEl,0,0);me.ftex.needsUpdate=true;}
function sendFlag(){if(!me||!me.fctx)return;let d;try{d=fcvEl.toDataURL('image/png');}catch(e){return;}try{localStorage.setItem('regata-bandeira',d);localStorage.setItem('regata-lado',me.side|0);}catch(e){}sendEv({k:'flag',by:me.id,d,sd:me.side|0});}
function onFlag(e){const by=boats.find(b=>b.id===e.by);if(!by||!by.fctx||by===me)return;setSide(by,e.sd);if(typeof e.d==='string'&&e.d.length<30000&&e.d.startsWith('data:image/png;base64,')){const im=new Image();im.onload=()=>{if(!boats.includes(by))return;by.fctx.drawImage(im,0,0,FLW,FLH);by.ftex.needsUpdate=true;};im.src=e.d;}}
function pickSide(sd){sd=sd?1:0;document.querySelectorAll('[data-fs]').forEach(x=>x.setAttribute('aria-pressed',+x.dataset.fs===sd));if(me&&me.sailM)setSide(me,sd);}
function pickFCol(c){fCol=c;document.querySelectorAll('#fpal button').forEach(x=>x.setAttribute('aria-pressed',+x.dataset.c===c));}
function openFlag(){fOpen=true;$('flagp').hidden=false;let sd=me.slot%2,ok=false;try{const l=localStorage.getItem('regata-lado');if(l!=null)sd=+l?1:0;const d=localStorage.getItem('regata-bandeira');if(d&&d.startsWith('data:image/png;base64,')){ok=true;const im=new Image();im.onload=()=>{fg2.drawImage(im,0,0,FLW,FLH);applyMyFlag();};im.src=d;}}catch(e){}
  pickSide(sd);if(!ok)flagDefault(fg2,sd,me.hex);applyMyFlag();setTimeout(()=>{if(racing&&me&&me.fctx)sendFlag();},1500);}
function closeFlag(){if(!fOpen)return;fOpen=false;fLast=null;$('flagp').hidden=true;}
{const pal=document.getElementById('fpal');FPAL.forEach(c=>{const b=document.createElement('button');b.type='button';b.dataset.c=c;b.style.background='#'+new THREE.Color(c).getHexString();b.setAttribute('aria-label','Cor');b.onclick=()=>pickFCol(c);pal.appendChild(b);});pickFCol(FPAL[1]);
  const W=document.getElementById('fwrap'),xy=e=>{const r=fcvEl.getBoundingClientRect();return [(e.clientX-r.left)/r.width*FLW,(e.clientY-r.top)/r.height*FLH];},dab=(x,y)=>{fg2.beginPath();fg2.arc(x,y,fSize,0,7);fg2.fill();};
  W.addEventListener('pointerdown',e=>{if(!fOpen)return;e.preventDefault();W.setPointerCapture(e.pointerId);fg2.fillStyle='#'+new THREE.Color(fCol).getHexString();fLast=xy(e);dab(fLast[0],fLast[1]);applyMyFlag();});
  W.addEventListener('pointermove',e=>{if(!fLast||!fOpen)return;const q=xy(e),n=Math.ceil(Math.hypot(q[0]-fLast[0],q[1]-fLast[1]));for(let i=1;i<=n;i++)dab(fLast[0]+(q[0]-fLast[0])*i/n,fLast[1]+(q[1]-fLast[1])*i/n);fLast=q;applyMyFlag();});
  const up=()=>{fLast=null;};W.addEventListener('pointerup',up);W.addEventListener('pointercancel',up);
  document.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>pickSide(+b.dataset.fs));
  document.querySelectorAll('[data-fb]').forEach(b=>b.onclick=()=>{fSize=+b.dataset.fb;document.querySelectorAll('[data-fb]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  document.getElementById('ffill').onclick=()=>{fg2.fillStyle='#'+new THREE.Color(fCol).getHexString();fg2.fillRect(0,0,FLW,FLH);applyMyFlag();};
  document.getElementById('fdef').onclick=()=>{if(me){flagDefault(fg2,me.side|0,me.hex);applyMyFlag();}};
  document.getElementById('fok').onclick=()=>{if(!fOpen)return;closeFlag();sendFlag();if(solo&&raceT<-3.1){t0=performance.now()+3000;}};}

/* ---------- entrada ---------- */
const keys={},touch={};
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=1;if(e.code==='Escape'&&pOpen){closePaint();return;}if((e.code==='Escape'||e.code==='KeyP')&&racing&&$('results').hidden)setPause(!paused);if(cfg.veh==='ship'&&cfg.mode==='sea'&&racing&&me&&!paused&&!fOpen){if(e.code==='KeyQ')fireSide(me,1);if(e.code==='KeyE')fireSide(me,-1);}if((e.code==='Space'||e.code==='KeyE'&&!(cfg.veh==='ship'&&cfg.mode==='sea'))&&racing&&me&&raceT>0&&!paused){e.preventDefault();cfg.mode==='hide'?(me.role?doShoot(me):togglePaint()):useItem(me);}if(cfg.mode==='hide'&&racing&&!paused){if(e.code==='KeyF')cycleForm();if(e.code==='KeyQ')cyclePose();}if(e.code==='KeyC'&&racing)camMode=(camMode+1)%3;if(/Arrow/.test(e.code)&&racing)e.preventDefault();});
addEventListener('keyup',e=>{keys[e.code]=0;});
document.getElementById('bitem').addEventListener('pointerdown',e=>{e.preventDefault();if(racing&&me&&raceT>0)cfg.mode==='hide'?(me.role?doShoot(me):togglePaint()):useItem(me);});
document.querySelectorAll('[data-t]').forEach(el=>{const k=el.dataset.t,on=e=>{e.preventDefault();touch[k]=1;},off=()=>{touch[k]=0;};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointerleave',off);el.addEventListener('pointercancel',off);});
for(const [id,sd] of[['bcl',1],['bcr',-1]])document.getElementById(id).addEventListener('pointerdown',e=>{e.preventDefault();if(racing&&me&&!fOpen)fireSide(me,sd);});
if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
const inRud=()=>((keys.ArrowLeft||keys.KeyA||touch.l)?1:0)-((keys.ArrowRight||keys.KeyD||touch.r)?1:0);
const inDrift=()=>!!(keys.ShiftLeft||keys.ShiftRight||keys.KeyX||touch.x);
const inFlip=()=>!!(keys.KeyF||keys.KeyZ||touch.f);
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
  else if(d.t==='start')startRace(d.players,d.laps,d.items,d.mode,d.veh,d.lveh,d.fauna,d.sk,d.trk,d.pip,d.seed);
  else if(d.t==='s')applyStates(d.b);
  else if(d.t==='ev')onEv(d.e);}
const pack=b=>[b.id,+b.x.toFixed(1),+b.z.toFixed(1),+b.hd.toFixed(3),+b.v.toFixed(2),+b.s.toFixed(2),b.mark,b.lap,b.fin,b.land,b.ti,b.tp,b.col,b.role,b.form|0,b.pose|0,b.pipas|0,b.hp==null?3:b.hp,b.sunk>0?+b.sunk.toFixed(1):0,b.blk>0?1:0,b.side|0];
function applyStates(arr){if(!racing)return;for(const p of arr){if(p[0]===myId)continue;const b=boats.find(x=>x.id===p[0]);if(!b||!b.remote)continue;
  const wl=b.land,wr=b.role;[,b.tx,b.tz,b.thd,b.v,b.s,b.mark,b.lap,b.fin,b.land,b.ti,b.tp,b.col,b.role,b.form,b.pose,b.pipas,b.hp,b.sunk,b.blk]=p;if(b.sailM&&(p[20]|0)!==b.side)setSide(b,p[20]|0);if(b.foot&&b.role&&!wr&&b.seen)toast(b.name+' foi apanhado!',2);if(!b.seen||b.land&&!wl){b.x=b.tx;b.z=b.tz;b.hd=b.thd;b.seen=true;}}}

/* ---------- menus ---------- */
function showMenu(w){$('menu').hidden=false;$('results').hidden=true;['main','room'].forEach(s=>$('m-'+s).hidden=s!==w);(w==='room'?$('gslot'):$('gmain')).appendChild($('gpick'));}
function showRoom(){showMenu('room');$('rcode').textContent=code;const url=location.origin+location.pathname+'?sala='+code;$('rlink').value=url;
  const nb=Math.min(+$('nboats').value,MAXB-players.length);
  $('rlist').innerHTML=players.map(p=>`<li><span class="dot" style="background:#${new THREE.Color(COLORS[p.slot]).getHexString()}"></span>${esc(p.name)}${p.id===myId?' (tu)':''}</li>`).join('')+(isHost&&nb?`<li><i>+ ${nb} bot${nb>1?'s':''}</i></li>`:'');
  $('rcount').textContent=players.length+' de '+MAXB+' jogadores';
  $('rhost').hidden=!isHost;$('rwait').hidden=isHost;$('laps').value=laps;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
$('bhost').onclick=()=>{saveName();hostRoom();};
$('bjoin').onclick=()=>{saveName();const c=$('jcode').value.trim();if(c.length<4){$('merr').textContent='Escreve o código da sala (4 letras).';return;}joinRoom(c);};
const rseed=()=>1+Math.floor(Math.random()*2e9),trkSel=()=>$('smode').value==='hide'?$('shmap').value:$('strack').value;
$('bsolo').onclick=()=>{saveName();resetNet();isHost=true;solo=true;myId='h';laps=+$('slaps').value;lastPs=fillBots([{id:'h',name:myName(),slot:0}],1+(+$('sboats').value));startRace(lastPs,laps,$('sitems').checked,$('smode').value,$('sveh').value,$('slveh').value,$('sfauna').checked,pickSk(lastPs),trkSel(),+$('spip').value,rseed());};
$('bstart').onclick=()=>{laps=+$('laps').value;const ps=fillBots(players,players.length+(+$('nboats').value));itemsOn=$('sitems').checked;const m={t:'start',players:ps,laps,items:itemsOn,mode:$('smode').value,veh:$('sveh').value,lveh:$('slveh').value,fauna:$('sfauna').checked,sk:pickSk(ps),trk:trkSel(),pip:+$('spip').value,seed:rseed()};bcast(m);startRace(ps,laps,itemsOn,m.mode,m.veh,m.lveh,m.fauna,m.sk,m.trk,m.pip,m.seed);};
$('bleave').onclick=()=>{resetNet();showMenu('main');};
$('bcopy').onclick=()=>{$('rlink').select();navigator.clipboard&&navigator.clipboard.writeText($('rlink').value);$('bcopy').textContent='Copiado';setTimeout(()=>$('bcopy').textContent='Copiar',1500);};
$('nboats').onchange=()=>showRoom();$('laps').onchange=()=>{laps=+$('laps').value;if(isHost)bcast({t:'lobby',players,laps});};
$('bagain').onclick=()=>{if(solo)restart();else if(isHost){endRace();sendLobby();}};
const pickSk=ps=>(ps.find(p=>p.id===window.__regata.forceSk)||ps[Math.floor(Math.random()*ps.length)]).id;
function restart(){if(!lastPs)return;const sk=pickSk(lastPs),seed=rseed();if(!solo&&isHost)bcast({t:'start',players:lastPs,laps,items:itemsOn,mode:cfg.mode,veh:cfg.veh,lveh:cfg.lveh,fauna:cfg.fauna,sk,trk:cfg.mode==='hide'?cfg.hm:cfg.trk,pip:cfg.pipas,seed});startRace(lastPs,laps,itemsOn,cfg.mode,cfg.veh,cfg.lveh,cfg.fauna,sk,cfg.mode==='hide'?cfg.hm:cfg.trk,cfg.pipas,seed);}
function setPause(v){paused=v;$('pause').hidden=!v;if(!v)return;
  $('pnote').textContent=solo?'Corrida em pausa.':'No multijogador a corrida continua enquanto este menu está aberto.';
  $('prestart').hidden=!(solo||isHost);$('plobby').hidden=!(isHost&&!solo);$('prestart').textContent=solo?'Recomeçar':'Recomeçar para todos';}
$('bpause').onclick=()=>setPause(true);$('presume').onclick=()=>setPause(false);$('prestart').onclick=()=>restart();
$('phome').onclick=()=>{endRace();resetNet();showMenu('main');};
$('plobby').onclick=()=>{if(isHost&&!solo){endRace();sendLobby();}};
$('bmenu').onclick=()=>{endRace();resetNet();showMenu('main');};
function fillBots(ps,total){const out=ps.slice(),names=['Marta','Rui','Inês','Tiago','Sofia','Duarte','Beatriz','Miguel','Carolina','João','Leonor','Pedro','Mariana','Tomás'];let k=0;for(let s=0;s<MAXB&&out.length<total;s++)if(!out.some(p=>p.slot===s))out.push({id:'bot'+s,name:names[k++%names.length],slot:s,bot:true});return out;}
function saveName(){try{localStorage.setItem('regata-nome',myName());}catch(e){}}
// escolha do jogo: cartões no início; as mesmas opções servem para treinar e para a sala
function pickGame(m){$('smode').value=m;document.querySelectorAll('[data-g]').forEach(c=>c.setAttribute('aria-pressed',c.dataset.g===m));document.querySelectorAll('[data-for]').forEach(e=>e.hidden=!e.dataset.for.split(' ').includes(m));}
document.querySelectorAll('[data-g]').forEach(c=>c.onclick=()=>pickGame(c.dataset.g));pickGame('sea');
try{$('name').value=localStorage.getItem('regata-nome')||'';}catch(e){}
{const q=new URLSearchParams(location.search).get('sala');if(q)$('jcode').value=q.toUpperCase();}

/* ---------- corrida ---------- */
let lastPs=null,paused=false,raceT=-99,t0=0,camMode=0,netT=0,hudT=0,mapT=0,snap=true,finShown=false;
function startRace(ps,lp,it,mode,veh,lveh,fa,sk,tk,pip,seed){
  if(mode==='rabelo'||veh==='rabelo'){mode='sea';veh='rabelo';tk='douro';}
  if(mode==='voy'||veh==='ship'&&(mode==='sea'||!mode)){mode='sea';veh='ship';tk='mar';lp=1;fa=false;}else if(veh==='ship')veh='sail';
  clearBoats();cfg={mode:mode||'sea',veh:veh||'sail',lveh:lveh||'bike',fauna:fa!==false,sk,pipas:clamp(+pip||6,2,12),trk:mode==='sea'||!mode?tk||'funchal':'funchal'};setTrack(cfg.trk);cfg.hm=mode==='hide'&&ARENAS[tk]?tk:'city';setArena(cfg.hm);document.getElementById('locn').textContent=(mode==='hide'?ARENAS[cfg.hm].nm:TK.name).toUpperCase();cfg.seed=seed||1;shuffleMarks(cfg.seed);toastT=0;document.getElementById('toast').classList.remove('on');waveAmp=cfg.trk==='mar'?.8:(cfg.veh==='jet'&&cfg.mode!=='land'&&cfg.mode!=='hide'?1.35:.38)*(cfg.trk==='funchal'?1:.55);document.body.classList.toggle('ship',cfg.veh==='ship'&&cfg.mode==='sea');laps=lp;itemsOn=it!==false&&mode!=='hide'&&mode!=='cesto';const hide=mode==='hide';hideWin='';closePaint(true);ring.visible=hide;$('spdp').hidden=hide;$('hidep').hidden=!hide;$('blind').hidden=true;document.body.classList.remove('land');
  if(hide){$('windw').hidden=true;$('next').hidden=true;$('item').hidden=true;$('keys').textContent='A/D virar · W/S andar · Espaço tintas (caçador: disparar tinta) · F objeto ao acaso (2 vezes) · Q voltar a boneco · C câmara · Esc menu';whSaid=false;whMarks.length=0;}clearItems();racing=true;finShown=false;lastPs=ps;setPause(false);
  const dir=MARKS[LAPS[0][0]].clone().sub(GATE).normalize(),perp=V(-dir.z,0,dir.x),brg=Math.atan2(-dir.z,dir.x);
  for(const p of ps){const b=addBoat(p);b.remote=!(p.id===myId||(isHost&&p.bot));
    const gi=ps.indexOf(p),row=Math.floor(gi/5),col=gi%5-2,gs=cfg.veh==='ship'?1.9:1;b.x=GATE.x-dir.x*(45+row*20*gs)+perp.x*col*14*gs;b.z=GATE.z-dir.z*(45+row*20*gs)+perp.z*col*14*gs;if(cfg.veh==='ship'){b.s=1;setSide(b,p.slot%2);flagDefault(b.fctx,b.side,b.hex);b.ftex.needsUpdate=true;}
    {const wd=angDiff(brg,W0);b.hd=brg;b.tack=Math.sign(wd||1);}b.tx=b.x;b.tz=b.z;b.thd=b.hd;
    if(cfg.mode==='cesto'){enterCesto(b,gi);b.outer.visible=false;}
    if(cfg.mode==='land'){const row=Math.floor(gi/4),s=TRAIL[5+row*2];enterLand(b,5+row*2);b.x+=s.nx*(gi%4-1.5)*4.5;b.z+=s.nz*(gi%4-1.5)*4.5;b.tx=b.x;b.tz=b.z;b.outer.visible=false;}
    if(hide){b.foot=1;b.outer.visible=false;b.role=b.role0=p.id===sk?1:0;const sp=b.role?rndSpot(25):rndSpot();b.x=b.tx=sp[0];b.z=b.tz=sp[1];b.hd=b.thd=Math.random()*TAU;b.y=HM(b.x,b.z);b.v=0;setCol(b,b.role?SEEKC:COLORS[p.slot]);}
    if(p.id===myId)me=b;}
  const voy=cfg.veh==='ship'&&cfg.mode==='sea',pre=voy?(solo?120:20):4;t0=performance.now()+pre*1000;raceT=-pre;snap=true;pL.fill(0);if(voy&&me)openFlag();else closeFlag();
  $('menu').hidden=true;$('results').hidden=true;$('hud').hidden=false;}
function endRace(){racing=false;closePaint(true);closeFlag();document.body.classList.remove('ship');ring.visible=false;$('blind').hidden=true;stepFauna(0);clearItems();setPause(false);clearBoats();$('hud').hidden=true;$('results').hidden=true;$('cd').textContent='';}
const fmt=t=>t==null?'—':String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(2).padStart(5,'0');
function onFinish(){const pos=[...boats].sort((a,c)=>progress(c)-progress(a)).indexOf(me)+1;toast('Chegada! '+pos+'.º lugar'+(cfg.veh==='rabelo'&&!me.land?' · '+me.pipas+' pipas entregues (−3 s cada)':''),3);}
function renderResults(){if(cfg.mode==='hide'){$('rtable').innerHTML=`<tr class="me"><td colspan="3">${hideWin==='h'?'Ganharam os escondidos':'Ganharam os caçadores'}</td></tr>`+boats.map(b=>`<tr${b===me?' class="me"':''}><td>${b.role0?'🔎':b.role?'✖':'✔'}</td><td>${esc(b.name)}</td><td>${b.role0?'Caçador':b.role?'Apanhado':'Sobreviveu'}</td></tr>`).join('');$('bagain').hidden=!(solo||isHost);$('rwait2').hidden=solo||isHost;$('bagain').textContent=solo?'Repetir':'Nova corrida';return;}
  const ord=[...boats].sort((a,c)=>progress(c)-progress(a));
  $('rtable').innerHTML=ord.map((b,i)=>`<tr${b===me?' class="me"':''}><td>${i+1}.º</td><td><span class="dot" style="background:#${new THREE.Color(b.hex).getHexString()}"></span>${esc(b.name)}</td><td>${b.fin!=null?fmt(b.fin):'a navegar…'}</td></tr>`).join('');
  $('bagain').hidden=!(solo||isHost);$('rwait2').hidden=solo||isHost;$('bagain').textContent=solo?'Repetir':'Nova corrida';}
let toastT=0;function toast(s,dur){const e=$('toast');if(e.textContent===s&&toastT>0)return;e.textContent=s;e.classList.add('on');toastT=dur||1.6;}

/* ---------- HUD ---------- */
const pointName=d=>d<40?'Contra o vento':d<70?'Bolina':d<120?'Través':d<155?'Largo':'Popa';
const mapC=$('map'),mg=mapC.getContext('2d');
function drawMap(){if(cfg.mode==='hide'){mapHide();return;}const land=me&&me.land,c2=land===2,MX=TK.bg?TK.MX:c2?[-1180,500]:land?[470,1050]:[-750,750],MZ=TK.bg?TK.MZ:c2?[-1760,-420]:land?[-595,-235]:[-420,480];const w=mapC.width,h=mapC.height,sx=x=>(x-MX[0])/(MX[1]-MX[0])*w,sz=z=>(z-MZ[0])/(MZ[1]-MZ[0])*h;
  mg.clearRect(0,0,w,h);if(TK.bg)mg.drawImage(TK.bg,0,0);else{mg.fillStyle='rgba(11,79,102,.55)';mg.fillRect(0,0,w,h);mg.fillStyle='rgba(70,110,60,.9)';mg.beginPath();mg.moveTo(0,0);for(let x=MX[0];x<=MX[1];x+=25)mg.lineTo(sx(x),sz(zsF(x)));mg.lineTo(w,0);mg.fill();}
  mg.fillStyle='#ffb347';for(const m of TK.mov){mg.beginPath();mg.arc(sx(m.x),sz(m.z),4,0,7);mg.fill();}
  mg.fillStyle='rgba(170,165,150,.95)';for(const c of COL){mg.beginPath();mg.arc(sx(c[0]),sz(c[1]),Math.max(1.2,c[2]/(MX[1]-MX[0])*w),0,7);mg.fill();}
  mg.strokeStyle='#c9a06a';mg.lineWidth=land?4:2;mg.beginPath();TRAIL.forEach((p,i)=>i?mg.lineTo(sx(p.x),sz(p.z)):mg.moveTo(sx(p.x),sz(p.z)));mg.closePath();if(cfg.mode!=='sea'&&!c2)mg.stroke();if(c2){mg.beginPath();CS.forEach((p,i)=>i?mg.lineTo(sx(p.x),sz(p.z)):mg.moveTo(sx(p.x),sz(p.z)));mg.lineWidth=5;mg.strokeStyle='#b8b2a6';mg.stroke();}mg.lineWidth=1;
  mg.strokeStyle='rgba(255,255,255,.35)';mg.setLineDash([4,4]);mg.beginPath();const RT=land?[]:me?route(me.lap):route(0);if(!land)mg.moveTo(sx(GATE.x),sz(GATE.z));RT.forEach(p=>mg.lineTo(sx(p.x),sz(p.z)));mg.stroke();mg.setLineDash([]);
  RT.forEach((p,i)=>{const nx=me&&me.mark===i&&me.fin==null;mg.fillStyle=i===RT.length-1?'#fff':'#ff6a1f';mg.beginPath();mg.arc(sx(p.x),sz(p.z),nx?6:4,0,7);mg.fill();if(nx){mg.strokeStyle='#ffe14a';mg.lineWidth=2;mg.stroke();mg.lineWidth=1;}});
  if(!land)for(const c of fauna.all){if(!c.act)continue;mg.fillStyle='#ff4d4d';mg.beginPath();mg.arc(sx(c.x),sz(c.z),c.R>10?5:3,0,7);mg.fill();}
  for(const b of boats){mg.save();mg.translate(sx(b.x),sz(b.z));mg.rotate(-b.hd);mg.fillStyle='#'+new THREE.Color(b.hex).getHexString();mg.beginPath();mg.moveTo(7,0);mg.lineTo(-4,4);mg.lineTo(-4,-4);mg.fill();if(b===me){mg.strokeStyle='#fff';mg.stroke();}mg.restore();}
  const wx=w-18,wy=18;mg.strokeStyle='#5fd0ff';mg.lineWidth=2.5;mg.beginPath();mg.moveTo(wx+windFrom.x*12,wy+windFrom.z*12);mg.lineTo(wx-windFrom.x*8,wy-windFrom.z*8);mg.stroke();mg.lineWidth=1;}
function hud(look){const el=x=>$(x);
  if(fOpen)$('fnote').textContent=solo?'A partida é dada quando carregares em Pronto.':'Partida para todos daqui a '+Math.max(0,Math.ceil(-raceT))+' s.';if(raceT<0)el('cd').textContent=fOpen?'':Math.ceil(-raceT);else if(raceT<1.2)el('cd').textContent='Partida!';else el('cd').textContent='';
  if(cfg.mode==='hide'){hudHide();return;}
  const lap=Math.min(me.lap+1,laps);el('clock').textContent=(me.fin!=null?'CHEGADA · '+fmt(me.fin):me.land===2?'DESCIDA · '+fmt(Math.max(0,raceT)):me.land&&cfg.mode==='both'?'MOTA · '+fmt(Math.max(0,raceT)):(cfg.veh==='ship'?'TRAVESSIA':'VOLTA '+lap+'/'+laps)+' · '+fmt(Math.max(0,raceT)));
  const d=Math.round(me.twa*180/Math.PI);el('twa').textContent=d+'°';el('pt').textContent=pointName(d);
  el('kn').firstChild.nodeValue=(me.v*KN).toFixed(1)+' ';el('effb').style.width=Math.round(clamp(me.eff,0,1)*100)+'%';el('wspd').textContent=TK.wl+' '+Math.round(TK.wk*gust)+' nós';
  const camYaw=Math.atan2(look.x-cam.position.x,-(look.z-cam.position.z)),wYaw=Math.atan2(windFrom.x,-windFrom.z);el('warrow').setAttribute('transform','rotate('+((wYaw-camYaw)*180/Math.PI).toFixed(1)+')');
  const it=me.item;$('islot').textContent=it?ITEMS[it].ic:'';$('iname').textContent=it?ITEMS[it].nm:(me.shield>0?'Proteção '+Math.ceil(me.shield)+' s':me.boost>0?'Turbo!':me.fav>0?'Vento de feição!':'—');$('item').hidden=!itemsOn;
  const sail=cfg.veh==='sail'&&!me.land;$('windw').hidden=!!me.land;$('efl').textContent=sail?'EFICIÊNCIA DA VELA':'VELOCIDADE';$('keys').textContent=cfg.veh==='ship'&&!me.land?'A/D ou ←/→ leme · W iça as velas · S arria · Q dispara a bombordo (esquerda) · E a estibordo (direita) · Shift defende · Espaço objeto · C câmara':me.land===2?'A ou ← trava o patim esquerdo (vira à esquerda) · D ou → o direito · os dois juntos travam a fundo · C câmara · Esc menu':cfg.veh==='rabelo'&&!me.land?'A/D ou ←/→ espadela (responde devagar) · W ou ↑ iça a vela · S ou ↓ arria · Espaço objeto · C câmara · Esc menu':sail?'A/D ou ←/→ leme · W/S ou ↑/↓ caçar/folgar a vela · Espaço objeto · C câmara · Esc menu':'A/D ou ←/→ virar · W ou ↑ acelerar · S ou ↓ travar'+(me.land?' · Shift derrapar · F mortal no ar':'')+' · Espaço objeto · C câmara · Esc menu';document.body.classList.toggle('land',!!me.land);
  if(!sail){el('kn').firstChild.nodeValue=me.land?Math.round(me.v*3.6)+' ':(me.v*1.6).toFixed(0)+' ';el('knu').textContent=me.land?'km/h':'nós';el('effb').style.width=Math.round(clamp(me.land?me.v/34:me.eff,0,1)*100)+'%';}else el('knu').textContent='nós';
  let tip='';if(cfg.veh==='ship'&&!me.land)tip=me.sunk>0?'A reparar o casco: '+Math.ceil(me.sunk)+' s':'♥'.repeat(me.hp==null?3:me.hp)+' · Bombordo '+(me.cdL>0?'○':'●')+' · Estibordo '+(me.cdR>0?'○':'●')+' · Defesa '+(me.blk>0?'ativa':me.blkCd>0?'○':'●');else if(me.land===2)tip=me.hL>.55||me.hR>.55?'Patins a escaldar: travam menos':me.fast?'Faixa rápida!':me.dr?'A derrapar!':'';else if(cfg.veh==='rabelo'&&!me.land)tip=me.twa>1.15&&me.s<.8?'Vento pelas costas: iça a vela (W)':me.twa<1.05&&me.s>.2?'Vento contra: arria a vela (S)':me.pipas+' pipas a bordo: curvas suaves';else if(!sail)tip=me.land&&!me.on?'Fora da pista!':me.land&&me.mud?'Lama: pouca aderência':me.land&&me.dr?'A derrapar!':me.land&&me.air?'No ar: F faz um mortal':'';else if(me.twa<.61)tip='Estás contra o vento: vira para um dos lados';else if(me.s>me.ideal+.1)tip='Caça a vela (W ou ↑)';else if(me.s<me.ideal-.1)tip='Folga a vela (S ou ↓)';else tip='Vela bem afinada';el('tip').textContent=tip;el('tip').className=tip==='Vela bem afinada'?'ok':'';
  if(me.fin==null&&me.land===2){const p=CS[Math.min(CN-1,me.ti+6)],dx=p.x-me.x,dz=p.z-me.z;el('nxt').textContent='Meta · '+Math.round(Math.max(0,CN-6-me.ti)*CSTEP)+' m';el('narrow').style.transform='rotate('+((Math.atan2(dx,-dz)-camYaw)*180/Math.PI).toFixed(1)+'deg)';el('next').hidden=false;}
  else if(me.fin==null&&me.land){const p=TW(me.ti+6),dx=p.x-me.x,dz=p.z-me.z,need=cfg.mode==='both'?2:laps;el('nxt').textContent=(me.ll+1>=need?'Meta':'Fim da volta')+' · '+Math.round(Math.max(0,(me.ll+1)*TN+3-me.tp)*TSTEP)+' m';
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
  markObjs.forEach((b,i)=>{b.position.y=Math.sin(T*1.6+i)*.25+getWaveHeight(b.position.x,b.position.z,racing?raceT:T);b.rotation.z=Math.sin(T*1.3+i)*.08;});
  if(!racing){stepWaves(T,0,0);setWind(T);const a=T*.05;cam.position.set(80+Math.cos(a)*520,160,80+Math.sin(a)*420);cam.lookAt(0,40,-250);draw();return;}
  raceT=(now-t0)/1000;setWind(Math.max(0,raceT));if(me)stepWaves(raceT,me.x,me.z);
  const go=raceT>=0;
  for(const b of boats){
    if(b.remote){b.tx+=Math.cos(b.thd)*b.v*dt;b.tz-=Math.sin(b.thd)*b.v*dt;const k=Math.min(1,dt*6);b.x+=(b.tx-b.x)*k;b.z+=(b.tz-b.z)*k;b.hd+=angDiff(b.thd,b.hd)*k;}
    else if(go){const fin=b.fin!=null;physics(b,dt,fin?0:b.bot?botCtl(b):inRud(),fin?0:inSheet(),!b.bot&&inDrift());}
    else if(b===me){b.s=clamp(b.s+inSheet()*dt*.55,0,1);const fx=Math.cos(b.hd),fz=-Math.sin(b.hd);b.twa=Math.acos(clamp(fx*windFrom.x+fz*windFrom.z,-1,1));b.ideal=idealSheet(b.twa);b.eff=0;}
    else{b.twa=1;b.ideal=.4;b.eff=0;}
    visual(b,dt);}
  if(go)stepItems(dt);if(cballs.length)stepCballs(dt);if(fOpen&&raceT>-.6){closeFlag();sendFlag();}
  stepMov(Math.max(0,raceT));
  stepFauna(dt);
  if(!reduce)for(let k=0;k<5;k++)emit(cam.position.x+(Math.random()-.5)*120,2+Math.random()*16,cam.position.z+(Math.random()-.5)*120,windTo.x*34*gust,0,windTo.z*34*gust,2.5,.22,2);
  stepParticles(dt);
  if(!me){draw();return;}
  const cur=me.foot?me.man.position:me.land?me.bike.position:me.outer.position;
  if(me.foot)beacon.visible=false;else if(me.land===2)beacon.visible=false;else if(me.land){const p=TRAIL[3];beacon.visible=me.fin==null&&me.tp>TN*.8;beacon.position.set(p.x,HM(p.x,p.z),p.z);}
  else{const nm=tgt(me),lastM=me.mark===route(me.lap).length-1;beacon.visible=me.fin==null&&(!lastM||cfg.mode==='both'&&me.lap===laps-1);beacon.position.set(nm.x,0,nm.z);}
  beacon.getObjectByName('arrow').position.y=24+Math.sin(T*3)*2;
  const mp=cur,f=me.fwd,F=me.foot,L=me.land||F;let want,look;
  if(pOpen&&F){want=mp.clone().addScaledVector(f,9);want.y=mp.y+4;look=mp.clone();look.y=mp.y+2.4;}
  else if(camMode===0){const SH=cfg.veh==='ship'&&!L;want=mp.clone().addScaledVector(f,F?-10:L?-15:SH?-52:-26);want.y=mp.y+(F?6:L?7:SH?24:10);look=mp.clone().addScaledVector(f,SH?34:24);look.y=mp.y+(L?3:SH?8:6);}
  else if(camMode===1){want=mp.clone().addScaledVector(f,-70);want.y=mp.y+55;look=mp.clone().addScaledVector(f,30);}
  else{want=mp.clone().add(V(0,240,140));look=mp.clone();}
  if(L)want.y=Math.max(want.y,HM(want.x,want.z)+3);
  if(snap||L!==wasLand)cam.position.copy(want);else cam.position.lerp(want,Math.min(1,dt*(L?5:3)));wasLand=L;cam.lookAt(look);snap=false;
  sun.position.copy(mp).addScaledVector(sunDir,600);sun.target.position.copy(mp);
  for(let i=splats.length-1;i>=0;i--)if(T>splats[i].t){scene.remove(splats[i].m);splats.splice(i,1);}
  if(capQ.length){const b=capQ.shift();if(boats.includes(b)&&b.foot&&!b.role)capture(b);}
  draw();
  const w=host.clientWidth,h=host.clientHeight;
  for(const b of boats){tmp.copy(b.foot?b.man.position:b.land?b.bike.position:b.outer.position);tmp.y+=b.foot?6:b.land?7:cfg.veh==='ship'?27:cfg.veh==='sail'?20:8;tmp.project(cam);const vis=(!b.foot||b===me||b.role)&&tmp.z<1&&Math.abs(tmp.x)<1.05&&Math.abs(tmp.y)<1.05;b.lb.hidden=!vis;b.lb.style.left=((tmp.x+1)/2*w)+'px';b.lb.style.top=((1-tmp.y)/2*h)+'px';}
  hudT-=dt;if(hudT<=0){hudT=.15;hud(look);}
  mapT-=dt;if(mapT<=0){mapT=.1;drawMap();}
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('on');}
  netT-=dt;if(netT<=0&&!solo){netT=.066;if(isHost&&conns.length)bcast({t:'s',b:boats.filter(b=>!b.remote||b.seen).map(pack)});else if(hostConn&&hostConn.open)hostConn.send({t:'s',b:[pack(me)]});}
}
let T=0;showMenu('main');requestAnimationFrame(frame);
window.__regata={t:()=>raceT,get boats(){return boats;},get me(){return me;},sim(sec){for(let t=0;t<sec;t+=1/30){t0-=1000/30;raceT+=1/30;setWind(Math.max(0,raceT));if(raceT<0)continue;for(const b of boats)if(!b.remote)physics(b,1/30,b.fin!=null?0:b.bot?botCtl(b):0,0);stepMov(Math.max(0,raceT));stepItems(1/30);if(cballs.length)stepCballs(1/30);stepFauna(0);}},setTrack,hideSpot,fireSide,nb:()=>cballs.length,wh:()=>whMarks.length,get cfg(){return cfg;},laps:()=>JSON.stringify(LAPS)};
})();
