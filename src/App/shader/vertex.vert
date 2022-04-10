#pragma glslify:snoise3=require(glsl-noise/simplex/3d)

uniform float uRand;

attribute vec3 color;

varying vec2 vUv;
varying vec3 vColor;

void main(){
  vUv = uv;
  vColor=color;
  float size = 2000.;
  vec4 mvPosition = modelViewMatrix*vec4(position,1.);
  gl_PointSize = size/ (-mvPosition.z);
  gl_Position=projectionMatrix*mvPosition;
}