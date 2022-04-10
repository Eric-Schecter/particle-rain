import React, { useRef, useEffect, useState } from 'react';
import styles from './index.module.scss';
import {
  Mesh, Scene, ShaderMaterial, WebGLRenderer, 
  PlaneBufferGeometry, PerspectiveCamera, BufferGeometry, Points, BufferAttribute, MeshBasicMaterial, Vector2, Clock
} from 'three';
import fragment from './shader/fragment.frag';
import vertex from './shader/vertex.vert';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';

class Particle {
  private gravity = Math.random() + 1;
  private vel = new Vector2();
  private pos = new Vector2();
  private pharse = Math.random() * Math.PI * 2;
  constructor( _x:number, _y:number){
    this.pos.set(_x,_y);
  }
  public update = (width:number,height:number,img:Array<Array<number>>,canvas:HTMLCanvasElement,time:number) =>{
    if(this.pos.y<-height/2){
      this.gravity = Math.random() + 1;
      this.pos.x = (Math.random() - 0.5) * width;
      this.pos.y = height/2;
    }
    const {width:imgWidth,height:imgHeight} = canvas;
    const x = Math.floor((this.pos.x + width/2 ) / width * imgWidth)%imgWidth;
    const y = Math.floor((this.pos.y + height/2 ) / height * imgHeight) %imgHeight;
    this.vel.set(0,0);
    
    let gravity = this.gravity;
    if(img[x]!==undefined){
      const value = img[x][imgHeight - 1 - y] || 0;
      
      this.vel.x = Math.sin(time + this.pharse)*value;
      this.vel.y = value;
      gravity = Math.max(gravity - value,0.01);
    }
    this.vel.y-=gravity;
    this.pos.add(this.vel);
    return this.pos;
  }
}

class ParticleSystem {
  private members:Particle[] = [];
  public add = (particle:Particle) =>{
    this.members.push(particle);
  }
  public update = (positions:BufferAttribute,width:number,height:number,img:Array<Array<number>>,canvas:HTMLCanvasElement,time:number) =>{
    this.members.forEach((member,i)=>{
     const {x,y} =  member.update(width,height,img,canvas,time);
     positions.set([x,y,0],i*3);
    });
  }
}

class World {
  private scene: Scene;
  private camera: PerspectiveCamera;
  private timer = 0;
  private renderer: WebGLRenderer;
  private material: ShaderMaterial;
  private geometry: BufferGeometry;
  private positions:BufferAttribute;
  private particleSystem = new ParticleSystem();
  private height:number;
  private width:number;
  private img:Array<Array<number>> = new Array(0).fill(0).map(()=>new Array(0));
  private canvas = document.createElement('canvas');
  private clock = new Clock();
  constructor(container: HTMLDivElement) {
    const { offsetWidth: width, offsetHeight: height } = container;
    this.height= height;
    this.width = width;
    this.renderer = new WebGLRenderer({
      preserveDrawingBuffer:true,
      alpha:true,
    });
    this.renderer.autoClear =false;
    this.renderer.setClearColor(0x222222);
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height);
    container.append(this.renderer.domElement);

    this.camera = new PerspectiveCamera(70, width / height, 0.1, 2000);
    this.camera.position.set(0, 0, 600);
    this.camera.lookAt(0, 0, 0);
    this.scene = new Scene();

    this.geometry = new BufferGeometry();
    const count = 3000;
    const position = new Float32Array(count *3);
    this.positions = new BufferAttribute(position,3);
    const color = new Float32Array(count *3);
    for(let i =0;i<count;i++){
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height; 
      position.set([x,y,0],i*3);
      color.set([Math.random(),Math.random(),Math.random()],i*3);
      this.particleSystem.add(new Particle(x,y));
    }
    this.geometry.setAttribute('position',this.positions);
    this.geometry.setAttribute('color',new BufferAttribute(color,3));

    this.material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
    })
    const points = new Points(this.geometry, this.material);
    this.scene.add(points);
    new OrbitControls(this.camera,this.renderer.domElement)
    const geo = new PlaneBufferGeometry(2000,2000);
    const mat = new MeshBasicMaterial({
      opacity:0.04,
      transparent:true,
      color:0x000000,
    })
    const mesh  = new Mesh(geo,mat);
    this.scene.add(mesh);
  }
  private setCameraFov =(imgWidth:number,imgHeight:number)=>{
    if(imgWidth/imgHeight < this.width/this.height){
      this.camera.fov =  (Math.atan(this.width / 300 / this.camera.aspect) * 2 * 180) / Math.PI;
    } else{
      this.camera.fov = (Math.atan(this.height / 300 ) * 2 * 180) / Math.PI;
    }
  }
  public createImg = (img:HTMLImageElement) =>{
    const {width,height} = img;
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if(!ctx){
      console.log('get context fail');
      return;
    }
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width,height);
    this.img = new Array(width).fill(0).map(()=>new Array(height).fill(0));
    for(let i =0;i<imageData.data.length;i+=4){
      const x = (i/4)%width;
      const y = Math.floor(i/4/width);
      const v =( imageData.data[i] +imageData.data[i+1]+imageData.data[i+2])/3;
      this.img[x][y] = v/255;
    }
    this.setCameraFov(width,height);
  }
  public draw = () => {
    const time = this.clock.getElapsedTime();
    this.particleSystem.update(this.positions,this.width,this.height,this.img,this.canvas,time);
    this.geometry.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
    this.timer = requestAnimationFrame(this.draw);
  }
  public dispose = () => {
    cancelAnimationFrame(this.timer);
  }
}

export const App = () => {
  const ref = useRef<HTMLDivElement>(null);
  const refWorld = useRef<World>();
  useEffect(() => {
    if (!ref.current) { return }
    const container = ref.current;
    refWorld.current = new World(container);
    refWorld.current.draw();
    return () => refWorld.current?.dispose();
  }, [ref])
  
  const [img,setImg] = useState<HTMLImageElement | null>(null);
  const load = (e:React.SyntheticEvent<HTMLImageElement>) =>{
    setImg(e.currentTarget);
  }
  useEffect(()=>{
    if(!refWorld.current || !img){
      return;
    }
    refWorld.current?.createImg(img);
  },[img,refWorld])


  return <div className={styles.root}>
    <div
      ref={ref}
      className={styles.container}
    />
    <div className={styles.imgContainer}>
      <img alt='img' src='character.jpg' className={styles.img} onLoad={load}/>
    </div>
  </div>
}