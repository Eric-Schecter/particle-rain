import React, { useRef, useEffect } from 'react';
import styles from './index.module.scss';
import {
  Mesh, Scene, ShaderMaterial, WebGLRenderer, 
  PlaneBufferGeometry, PerspectiveCamera, BufferGeometry, Points, BufferAttribute, MeshBasicMaterial
} from 'three';
import fragment from './shader/fragment.frag';
import vertex from './shader/vertex.vert';

class Particle {
  private gravity = Math.random() + 1;
  constructor(private _x:number,private _y:number){}
  public update = (width:number,height:number) =>{
    if(this._y<-height/2){
      this.gravity = Math.random() + 1;
      this._x = (Math.random() - 0.5) * width;
      this._y = height/2;
    }
    this._y-=this.gravity;
    return {x:this._x,y:this._y};
  }
}

class ParticleSystem {
  private members:Particle[] = [];
  public add = (particle:Particle) =>{
    this.members.push(particle);
  }
  public update = (positions:BufferAttribute,width:number,height:number) =>{
    this.members.forEach((member,i)=>{
     const {x,y} =  member.update(width,height);
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
    this.camera.position.set(0, 0, 400);
    this.camera.lookAt(0, 0, 0);
    this.scene = new Scene();

    this.geometry = new BufferGeometry();
    const count = 1000;
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

    const geo = new PlaneBufferGeometry(2000,2000);
    const mat = new MeshBasicMaterial({
      opacity:0.05,
      transparent:true,
      color:0x000000,
    })
    const mesh  = new Mesh(geo,mat);
    this.scene.add(mesh);
  }
  public draw = () => {
    this.particleSystem.update(this.positions,this.width,this.height);
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

  return <div
    ref={ref}
    className={styles.container}
  />
}