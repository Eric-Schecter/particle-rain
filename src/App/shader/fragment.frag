varying vec3 vColor;

void main(){
  float dist = length(gl_PointCoord.xy-vec2(0.5));
  if(dist>0.5){
    discard;
  }
  gl_FragColor=vec4(vColor,.1);
}