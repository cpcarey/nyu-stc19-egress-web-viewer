
precision highp float;
precision highp int;

#define max_clip_polygons 8
#define PI 3.141592653589793

attribute vec3 position;
attribute vec3 color;
attribute float intensity;
attribute float classification;
attribute float returnNumber;
attribute float numberOfReturns;
attribute float pointSourceID;
attribute vec4 indices;
attribute float spacing;
attribute float gpsTime;
attribute vec3 normal;
attribute float aExtra;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 uViewInv;

uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float fov;
uniform float near;
uniform float far;

uniform bool uDebug;

uniform bool uUseOrthographicCamera;
uniform float uOrthoWidth;
uniform float uOrthoHeight;

#define CLIPTASK_NONE 0
#define CLIPTASK_HIGHLIGHT 1
#define CLIPTASK_SHOW_INSIDE 2
#define CLIPTASK_SHOW_OUTSIDE 3

#define CLIPMETHOD_INSIDE_ANY 0
#define CLIPMETHOD_INSIDE_ALL 1
#
uniform float uDensityKernelRadius;
uniform float uDensityKernelMax;

uniform int clipTask;
uniform int clipMethod;
#if defined(num_clipboxes) && num_clipboxes > 0
  uniform mat4 clipBoxes[num_clipboxes];
#endif
#
#if defined(num_densityspheres) && num_densityspheres > 0
  uniform mat4 uDensitySpheres[num_densityspheres];
#endif

#if defined(num_densityspheres_attr_class_1) && num_densityspheres_attr_class_1 > 0
  uniform mat4 uDensitySpheresAttrClass1[num_densityspheres_attr_class_1];
#endif

#if defined(num_densityspheres_attr_class_2) && num_densityspheres_attr_class_2 > 0
  uniform mat4 uDensitySpheresAttrClass2[num_densityspheres_attr_class_2];
#endif

#if defined(num_clippolygons) && num_clippolygons > 0
  uniform int uClipPolygonVCount[num_clippolygons];
  uniform vec3 uClipPolygonVertices[num_clippolygons * 8];
  uniform mat4 uClipPolygonWVP[num_clippolygons];
#endif


uniform float size;
uniform float minSize;
uniform float maxSize;

uniform float uPCIndex;
uniform float uOctreeSpacing;
uniform float uNodeSpacing;
uniform float uOctreeSize;
uniform vec3 uBBSize;
uniform float uLevel;
uniform float uVNStart;
uniform bool uIsLeafNode;

uniform vec3 uColor;
uniform float uOpacity;

uniform vec2 elevationRange;
uniform vec2 intensityRange;

uniform vec2 uFilterReturnNumberRange;
uniform vec2 uFilterNumberOfReturnsRange;
uniform vec2 uFilterPointSourceIDClipRange;
uniform vec2 uFilterGPSTimeClipRange;
uniform float uGpsScale;
uniform float uGpsOffset;

uniform vec2 uNormalizedGpsBufferRange;

uniform vec3 uIntensity_gbc;
uniform vec3 uRGB_gbc;
uniform vec3 uExtra_gbc;

uniform float uTransition;
uniform float wRGB;
uniform float wIntensity;
uniform float wElevation;
uniform float wClassification;
uniform float wReturnNumber;
uniform float wSourceID;

uniform vec2 uExtraNormalizedRange;
uniform vec2 uExtraRange;
uniform float uExtraScale;
uniform float uExtraOffset;

uniform vec3 uShadowColor;

uniform sampler2D visibleNodes;
uniform sampler2D gradient;
uniform sampler2D classificationLUT;

#if defined(color_type_matcap)
uniform sampler2D matcapTextureUniform;
#endif
uniform bool backfaceCulling;

#if defined(num_shadowmaps) && num_shadowmaps > 0
uniform sampler2D uShadowMap[num_shadowmaps];
uniform mat4 uShadowWorldView[num_shadowmaps];
uniform mat4 uShadowProj[num_shadowmaps];
#endif

varying vec3  vColor;
varying float vLogDepth;
varying vec3  vViewPosition;
varying float   vRadius;
varying float   vPointSize;


float round(float number){
  return floor(number + 0.5);
}

vec3 ACC_COLOR_MAX = vec3(1.0, 0.5, 0.0);
vec3 ACC_COLOR_MAX_1 = vec3(1.0, 0.5, 0.0);
vec3 ACC_COLOR_MAX_MID = vec3(1.0, 1.0, 1.0);
vec3 ACC_COLOR_MAX_2 = vec3(0.0, 0.5, 1.0);

// 
//    ###    ########     ###    ########  ######## #### ##     ## ########     ######  #### ######## ########  ######  
//   ## ##   ##     ##   ## ##   ##     ##    ##     ##  ##     ## ##          ##    ##  ##       ##  ##       ##    ## 
//  ##   ##  ##     ##  ##   ##  ##     ##    ##     ##  ##     ## ##          ##        ##      ##   ##       ##       
// ##     ## ##     ## ##     ## ########     ##     ##  ##     ## ######       ######   ##     ##    ######    ######  
// ######### ##     ## ######### ##           ##     ##   ##   ##  ##                ##  ##    ##     ##             ## 
// ##     ## ##     ## ##     ## ##           ##     ##    ## ##   ##          ##    ##  ##   ##      ##       ##    ## 
// ##     ## ########  ##     ## ##           ##    ####    ###    ########     ######  #### ######## ########  ######  
//                                      


// ---------------------
// OCTREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_level_of_detail)) && defined(tree_type_octree)
/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
int numberOfOnes(int number, int index){
  int numOnes = 0;
  int tmp = 128;
  for(int i = 7; i >= 0; i--){
    
    if(number >= tmp){
      number = number - tmp;

      if(i <= index){
        numOnes++;
      }
    }
    
    tmp = tmp / 2;
  }

  return numOnes;
}


/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(int number, int index){

  // weird multi else if due to lack of proper array, int and bitwise support in WebGL 1.0
  int powi = 1;
  if(index == 0){
    powi = 1;
  }else if(index == 1){
    powi = 2;
  }else if(index == 2){
    powi = 4;
  }else if(index == 3){
    powi = 8;
  }else if(index == 4){
    powi = 16;
  }else if(index == 5){
    powi = 32;
  }else if(index == 6){
    powi = 64;
  }else if(index == 7){
    powi = 128;
  }else{
    return false;
  }

  int ndp = number / powi;

  return mod(float(ndp), 2.0) != 0.0;
}


/**
 * find the LOD at the point position
 */
float getLOD(){
  
  vec3 offset = vec3(0.0, 0.0, 0.0);
  int iOffset = int(uVNStart);
  float depth = uLevel;
  for(float i = 0.0; i <= 30.0; i++){
    float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel + 0.0);
    
    vec3 index3d = (position-offset) / nodeSizeAtLevel;
    index3d = floor(index3d + 0.5);
    int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));
    
    vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
    int mask = int(round(value.r * 255.0));

    if(isBitSet(mask, index)){
      // there are more visible child nodes at this position
      int advanceG = int(round(value.g * 255.0)) * 256;
      int advanceB = int(round(value.b * 255.0));
      int advanceChild = numberOfOnes(mask, index - 1);
      int advance = advanceG + advanceB + advanceChild;

      iOffset = iOffset + advance;
      
      depth++;
    }else{
      // no more visible child nodes at this position
      //return value.a * 255.0;

      float lodOffset = (255.0 * value.a) / 10.0 - 10.0;

      return depth  + lodOffset;
    }
    
    offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
  }
    
  return depth;
}

float getSpacing(){
  vec3 offset = vec3(0.0, 0.0, 0.0);
  int iOffset = int(uVNStart);
  float depth = uLevel;
  float spacing = uNodeSpacing;
  for(float i = 0.0; i <= 30.0; i++){
    float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel + 0.0);
    
    vec3 index3d = (position-offset) / nodeSizeAtLevel;
    index3d = floor(index3d + 0.5);
    int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));
    
    vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
    int mask = int(round(value.r * 255.0));
    float spacingFactor = value.a;

    if(i > 0.0){
      spacing = spacing / (255.0 * spacingFactor);
    }
    

    if(isBitSet(mask, index)){
      // there are more visible child nodes at this position
      int advanceG = int(round(value.g * 255.0)) * 256;
      int advanceB = int(round(value.b * 255.0));
      int advanceChild = numberOfOnes(mask, index - 1);
      int advance = advanceG + advanceB + advanceChild;

      iOffset = iOffset + advance;

      //spacing = spacing / (255.0 * spacingFactor);
      //spacing = spacing / 3.0;
      
      depth++;
    }else{
      // no more visible child nodes at this position
      return spacing;
    }
    
    offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
  }
    
  return spacing;
}

float getPointSizeAttenuation(){
  return pow(2.0, getLOD());
}


#endif


// ---------------------
// KD-TREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_level_of_detail)) && defined(tree_type_kdtree)

float getLOD(){
  vec3 offset = vec3(0.0, 0.0, 0.0);
  float iOffset = 0.0;
  float depth = 0.0;
    
    
  vec3 size = uBBSize;  
  vec3 pos = position;
    
  for(float i = 0.0; i <= 1000.0; i++){
    
    vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));
    
    int children = int(value.r * 255.0);
    float next = value.g * 255.0;
    int split = int(value.b * 255.0);
    
    if(next == 0.0){
      return depth;
    }
    
    vec3 splitv = vec3(0.0, 0.0, 0.0);
    if(split == 1){
      splitv.x = 1.0;
    }else if(split == 2){
      splitv.y = 1.0;
    }else if(split == 4){
      splitv.z = 1.0;
    }
    
    iOffset = iOffset + next;
    
    float factor = length(pos * splitv / size);
    if(factor < 0.5){
      // left
    if(children == 0 || children == 2){
        return depth;
      }
    }else{
      // right
      pos = pos - size * splitv * 0.5;
      if(children == 0 || children == 1){
        return depth;
      }
      if(children == 3){
        iOffset = iOffset + 1.0;
      }
    }
    size = size * ((1.0 - (splitv + 1.0) / 2.0) + 0.5);
    
    depth++;
  }
    
    
  return depth; 
}

float getPointSizeAttenuation(){
  return 0.5 * pow(1.3, getLOD());
}

#endif



// 
//    ###    ######## ######## ########  #### ########  ##     ## ######## ########  ######  
//   ## ##      ##       ##    ##     ##  ##  ##     ## ##     ##    ##    ##       ##    ## 
//  ##   ##     ##       ##    ##     ##  ##  ##     ## ##     ##    ##    ##       ##       
// ##     ##    ##       ##    ########   ##  ########  ##     ##    ##    ######    ######  
// #########    ##       ##    ##   ##    ##  ##     ## ##     ##    ##    ##             ## 
// ##     ##    ##       ##    ##    ##   ##  ##     ## ##     ##    ##    ##       ##    ## 
// ##     ##    ##       ##    ##     ## #### ########   #######     ##    ########  ######                                                                               
// 



// formula adapted from: http://www.dfstudios.co.uk/articles/programming/image-programming-algorithms/image-processing-algorithms-part-5-contrast-adjustment/
float getContrastFactor(float contrast){
  return (1.0158730158730156 * (contrast + 1.0)) / (1.0158730158730156 - contrast);
}

vec3 getRGB(){
  vec3 rgb = color;
  
  rgb = pow(rgb, vec3(uRGB_gbc.x));
  rgb = rgb + uRGB_gbc.y;
  rgb = (rgb - 0.5) * getContrastFactor(uRGB_gbc.z) + 0.5;
  rgb = clamp(rgb, 0.0, 1.0);

  return rgb;
}

float getIntensity(){
  float w = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
  w = pow(w, uIntensity_gbc.x);
  w = w + uIntensity_gbc.y;
  w = (w - 0.5) * getContrastFactor(uIntensity_gbc.z) + 0.5;
  w = clamp(w, 0.0, 1.0);

  return w;
}

vec3 getGpsTime(){

  float w = (gpsTime + uGpsOffset) * uGpsScale;


  vec3 c = texture2D(gradient, vec2(w, 1.0 - w)).rgb;


  // vec2 r = uNormalizedGpsBufferRange;
  // float w = gpsTime * (r.y - r.x) + r.x;
  // w = clamp(w, 0.0, 1.0);
  // vec3 c = texture2D(gradient, vec2(w,1.0-w)).rgb;
  
  return c;
}

vec3 getElevation(){
  vec4 world = modelMatrix * vec4( position, 1.0 );
  float w = (world.z - elevationRange.x) / (elevationRange.y - elevationRange.x);
  vec3 cElevation = texture2D(gradient, vec2(w,1.0-w)).rgb;
  
  return cElevation;
}

vec4 getClassification(){
  vec2 uv = vec2(classification / 255.0, 0.5);
  vec4 classColor = texture2D(classificationLUT, uv);
  
  return classColor;
}

vec3 getReturns(){

  // 0b 00_000_111
  float rn = mod(returnNumber, 8.0);
  // 0b 00_111_000
  float nr = mod(returnNumber / 8.0, 8.0);

  if(nr <= 1.0){
    return vec3(1.0, 0.0, 0.0);
  }else{
    return vec3(0.0, 1.0, 0.0);
  }

  // return vec3(nr / 4.0, 0.0, 0.0);

  // if(nr == 1.0){
  //  return vec3(1.0, 1.0, 0.0);
  // }else{
  //  if(rn == 1.0){
  //    return vec3(1.0, 0.0, 0.0);
  //  }else if(rn == nr){
  //    return vec3(0.0, 0.0, 1.0);
  //  }else{
  //    return vec3(0.0, 1.0, 0.0);
  //  }
  // }

  // if(numberOfReturns == 1.0){
  //  return vec3(1.0, 1.0, 0.0);
  // }else{
  //  if(returnNumber == 1.0){
  //    return vec3(1.0, 0.0, 0.0);
  //  }else if(returnNumber == numberOfReturns){
  //    return vec3(0.0, 0.0, 1.0);
  //  }else{
  //    return vec3(0.0, 1.0, 0.0);
  //  }
  // }
}

vec3 getReturnNumber(){
  if(numberOfReturns == 1.0){
    return vec3(1.0, 1.0, 0.0);
  }else{
    if(returnNumber == 1.0){
      return vec3(1.0, 0.0, 0.0);
    }else if(returnNumber == numberOfReturns){
      return vec3(0.0, 0.0, 1.0);
    }else{
      return vec3(0.0, 1.0, 0.0);
    }
  }
}

vec3 getNumberOfReturns(){
  float value = numberOfReturns;

  float w = value / 6.0;

  vec3 color = texture2D(gradient, vec2(w, 1.0 - w)).rgb;

  return color;
}

vec3 getSourceID(){
  float w = mod(pointSourceID, 10.0) / 10.0;
  return texture2D(gradient, vec2(w,1.0 - w)).rgb;
}

vec3 getCompositeColor(){
  vec3 c;
  float w;

  c += wRGB * getRGB();
  w += wRGB;
  
  c += wIntensity * getIntensity() * vec3(1.0, 1.0, 1.0);
  w += wIntensity;
  
  c += wElevation * getElevation();
  w += wElevation;
  
  c += wReturnNumber * getReturnNumber();
  w += wReturnNumber;
  
  c += wSourceID * getSourceID();
  w += wSourceID;
  
  vec4 cl = wClassification * getClassification();
  c += cl.a * cl.rgb;
  w += wClassification * cl.a;

  c = c / w;
  
  if(w == 0.0){
    //c = color;
    gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
  }
  
  return c;
}


vec3 getNormal(){
  //vec3 n_hsv = vec3( modelMatrix * vec4( normal, 0.0 )) * 0.5 + 0.5; // (n_world.xyz + vec3(1.,1.,1.)) / 2.;
  vec3 n_view = normalize( vec3(modelViewMatrix * vec4( normal, 0.0 )) );
  return n_view;
}
bool applyBackfaceCulling() {
  // Black not facing vertices / Backface culling
  vec3 e = normalize(vec3(modelViewMatrix * vec4( position, 1. )));
  vec3 n = getNormal(); // normalize( vec3(modelViewMatrix * vec4( normal, 0.0 )) );

  if((uUseOrthographicCamera && n.z <= 0.) || (!uUseOrthographicCamera && dot( n, e ) >= 0.)) { 
    return true;
  } else {
    return false;
  }
}

#if defined(color_type_matcap)
// Matcap Material
vec3 getMatcap(){ 
  vec3 eye = normalize( vec3( modelViewMatrix * vec4( position, 1. ) ) ); 
  if(uUseOrthographicCamera) { 
    eye = vec3(0., 0., -1.);
  }
  vec3 r_en = reflect( eye, getNormal() ); // or r_en = e - 2. * dot( n, e ) * n;
  float m = 2. * sqrt(pow( r_en.x, 2. ) + pow( r_en.y, 2. ) + pow( r_en.z + 1., 2. ));
  vec2 vN = r_en.xy / m + .5;
  return texture2D(matcapTextureUniform, vN).rgb; 
}
#endif

vec3 getExtra(){

  float w = (aExtra + uExtraOffset) * uExtraScale;
  w = clamp(w, 0.0, 1.0);

  vec3 color = texture2D(gradient, vec2(w,1.0-w)).rgb;

  // vec2 r = uExtraNormalizedRange;

  // float w = aExtra * (r.y - r.x) + r.x;

  // w = (w - uExtraRange.x) / (uExtraRange.y - uExtraRange.x);

  // w = clamp(w, 0.0, 1.0);

  // vec3 color = texture2D(gradient, vec2(w,1.0-w)).rgb;

  return color;
}

vec3 getColor(){
  vec3 color;
  
  #ifdef color_type_rgba
    color = getRGB();
  #elif defined color_type_height || defined color_type_elevation
    color = getElevation();
  #elif defined color_type_rgb_height
    vec3 cHeight = getElevation();
    color = (1.0 - uTransition) * getRGB() + uTransition * cHeight;
  #elif defined color_type_depth
    float linearDepth = gl_Position.w;
    float expDepth = (gl_Position.z / gl_Position.w) * 0.5 + 0.5;
    color = vec3(linearDepth, expDepth, 0.0);
    //color = vec3(1.0, 0.5, 0.3);
  #elif defined color_type_intensity
    float w = getIntensity();
    color = vec3(w, w, w);
  #elif defined color_type_gps_time
    color = getGpsTime();
  #elif defined color_type_intensity_gradient
    float w = getIntensity();
    color = texture2D(gradient, vec2(w,1.0-w)).rgb;
  #elif defined color_type_color
    color = uColor;
  #elif defined color_type_level_of_detail
    float depth = getLOD();
    float w = depth / 10.0;
    color = texture2D(gradient, vec2(w,1.0-w)).rgb;
  #elif defined color_type_indices
    color = indices.rgb;
  #elif defined color_type_classification
    vec4 cl = getClassification(); 
    color = cl.rgb;
  #elif defined color_type_return_number
    color = getReturnNumber();
  #elif defined color_type_returns
    color = getReturns();
  #elif defined color_type_number_of_returns
    color = getNumberOfReturns();
  #elif defined color_type_source_id
    color = getSourceID();
  #elif defined color_type_point_source_id
    color = getSourceID();
  #elif defined color_type_normal
    color = (modelMatrix * vec4(normal, 0.0)).xyz;
  #elif defined color_type_phong
    color = color;
  #elif defined color_type_composite
    color = getCompositeColor();
  #elif defined color_type_matcap
    color = getMatcap();
  #else 
    color = getExtra();
  #endif
  
  if (backfaceCulling && applyBackfaceCulling()) {
    color = vec3(0.);
  }

  return color;
}

float getPointSize(){
  float pointSize = 1.0;
  
  float slope = tan(fov / 2.0);
  float projFactor = -0.5 * uScreenHeight / (slope * vViewPosition.z);

  float scale = length(
    modelViewMatrix * vec4(0, 0, 0, 1) - 
    modelViewMatrix * vec4(uOctreeSpacing, 0, 0, 1)
  ) / uOctreeSpacing;
  projFactor = projFactor * scale;
  
  float r = uOctreeSpacing * 1.7;
  vRadius = r;
  #if defined fixed_point_size
    pointSize = size;
  #elif defined attenuated_point_size
    if(uUseOrthographicCamera){
      pointSize = size;
    }else{
      pointSize = size * spacing * projFactor;
      //pointSize = pointSize * projFactor;
    }
  #elif defined adaptive_point_size
    if(uUseOrthographicCamera) {
      float worldSpaceSize = 1.0 * size * r / getPointSizeAttenuation();
      pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
    } else {
      float worldSpaceSize = 1.0 * size * r / getPointSizeAttenuation();
      pointSize = worldSpaceSize * projFactor;
    }
  #endif

  pointSize = max(minSize, pointSize);
  pointSize = min(maxSize, pointSize);
  
  vRadius = pointSize / projFactor;

  return pointSize;
}

#if defined(num_clippolygons) && num_clippolygons > 0
bool pointInClipPolygon(vec3 point, int polyIdx) {

  mat4 wvp = uClipPolygonWVP[polyIdx];
  //vec4 screenClipPos = uClipPolygonVP[polyIdx] * modelMatrix * vec4(point, 1.0);
  //screenClipPos.xy = screenClipPos.xy / screenClipPos.w * 0.5 + 0.5;

  vec4 pointNDC = wvp * vec4(point, 1.0);
  pointNDC.xy = pointNDC.xy / pointNDC.w;

  int j = uClipPolygonVCount[polyIdx] - 1;
  bool c = false;
  for(int i = 0; i < 8; i++) {
    if(i == uClipPolygonVCount[polyIdx]) {
      break;
    }

    //vec4 verti = wvp * vec4(uClipPolygonVertices[polyIdx * 8 + i], 1);
    //vec4 vertj = wvp * vec4(uClipPolygonVertices[polyIdx * 8 + j], 1);

    //verti.xy = verti.xy / verti.w;
    //vertj.xy = vertj.xy / vertj.w;

    //verti.xy = verti.xy / verti.w * 0.5 + 0.5;
    //vertj.xy = vertj.xy / vertj.w * 0.5 + 0.5;

    vec3 verti = uClipPolygonVertices[polyIdx * 8 + i];
    vec3 vertj = uClipPolygonVertices[polyIdx * 8 + j];

    if( ((verti.y > pointNDC.y) != (vertj.y > pointNDC.y)) && 
      (pointNDC.x < (vertj.x-verti.x) * (pointNDC.y-verti.y) / (vertj.y-verti.y) + verti.x) ) {
      c = !c;
    }
    j = i;
  }

  return c;
}
#endif

void doClipping(){

  {
    vec4 cl = getClassification(); 
    if(cl.a == 0.0){
      gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
      
      return;
    }
  }

  #if defined(clip_return_number_enabled)
  { // return number filter
    vec2 range = uFilterReturnNumberRange;
    if(returnNumber < range.x || returnNumber > range.y){
      gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
      
      return;
    }
  }
  #endif

  #if defined(clip_number_of_returns_enabled)
  { // number of return filter
    vec2 range = uFilterNumberOfReturnsRange;
    if(numberOfReturns < range.x || numberOfReturns > range.y){
      gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
      
      return;
    }
  }
  #endif

  #if defined(clip_gps_enabled)
  { // GPS time filter
    float time = (gpsTime + uGpsOffset) * uGpsScale;
    vec2 range = uFilterGPSTimeClipRange;

    if(time < range.x || time > range.y){
      gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
      
      return;
    }
  }
  #endif

  #if defined(clip_point_source_id_enabled)
  { // point source id filter
    vec2 range = uFilterPointSourceIDClipRange;
    if(pointSourceID < range.x || pointSourceID > range.y){
      gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
      
      return;
    }
  }
  #endif

  int clipVolumesCount = 0;
  int insideCount = 0;

  #if defined(num_clipboxes) && num_clipboxes > 0
    for(int i = 0; i < num_clipboxes; i++){
      vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4( position, 1.0 );
      bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
      inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
      inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;

      insideCount = insideCount + (inside ? 1 : 0);
      clipVolumesCount++;
    } 
  #endif

  #if defined(num_clippolygons) && num_clippolygons > 0
    for(int i = 0; i < num_clippolygons; i++) {
      bool inside = pointInClipPolygon(position, i);

      insideCount = insideCount + (inside ? 1 : 0);
      clipVolumesCount++;
    }
  #endif

  bool insideAny = insideCount > 0;
  bool insideAll = (clipVolumesCount > 0) && (clipVolumesCount == insideCount);

  if(clipMethod == CLIPMETHOD_INSIDE_ANY){
    if(insideAny && clipTask == CLIPTASK_HIGHLIGHT){
      vColor.r += 0.5;
    }else if(!insideAny && clipTask == CLIPTASK_SHOW_INSIDE){
      gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
    }else if(insideAny && clipTask == CLIPTASK_SHOW_OUTSIDE){
      gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
    }
  }else if(clipMethod == CLIPMETHOD_INSIDE_ALL){
    if(insideAll && clipTask == CLIPTASK_HIGHLIGHT){
      vColor.r += 0.5;
    }else if(!insideAll && clipTask == CLIPTASK_SHOW_INSIDE){
      gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
    }else if(insideAll && clipTask == CLIPTASK_SHOW_OUTSIDE){
      gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
    }
  }
}

float getAccumulation(mat4 densitySphere, vec4 mvPosition) {
  vec4 sphereLocal = densitySphere * mvPosition;

  // Terminate early if possible.
  if (sphereLocal.x > uDensityKernelRadius || sphereLocal.y > uDensityKernelRadius) {
    return 0.0;
  }

  if (sphereLocal.x * sphereLocal.x + sphereLocal.y * sphereLocal.y > uDensityKernelRadius * uDensityKernelRadius) {
    return 0.0;
  }

  float distance = length(sphereLocal.xyz);

  return max(uDensityKernelRadius - distance, 0.0);
}

vec3 getColorFilter(float accumulation, vec3 colorMax, float intensity) {
  vec3 colorGradient =
      texture2D(gradient, vec2(1.0 - accumulation, accumulation)).rgb;
  vec3 colorFilter = (1.0 - colorGradient) * colorMax * intensity;
  return colorFilter;
}

// 
// ##     ##    ###    #### ##    ## 
// ###   ###   ## ##    ##  ###   ## 
// #### ####  ##   ##   ##  ####  ## 
// ## ### ## ##     ##  ##  ## ## ## 
// ##     ## #########  ##  ##  #### 
// ##     ## ##     ##  ##  ##   ### 
// ##     ## ##     ## #### ##    ## 
//

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0 );
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  vLogDepth = log2(-mvPosition.z);

  //gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  //gl_PointSize = 5.0;

  // POINT SIZE
  float pointSize = getPointSize();
  //float pointSize = 2.0;
  gl_PointSize = pointSize;
  vPointSize = pointSize;

  // COLOR
  vColor = getColor();
  // vColor = vec3(1.0, 0.0, 0.0);

  //gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  //gl_Position = vec4(position.xzy / 1000.0, 1.0 );

  //gl_PointSize = 5.0;
  //vColor = vec3(1.0, 1.0, 1.0);

  // only for "replacing" approaches
  // if(getLOD() != uLevel){
  //  gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
  // }


  #if defined hq_depth_pass
    float originalDepth = gl_Position.w;
    float adjustedDepth = originalDepth + 2.0 * vRadius;
    float adjust = adjustedDepth / originalDepth;

    mvPosition.xyz = mvPosition.xyz * adjust;
    gl_Position = projectionMatrix * mvPosition;
  #endif


  // CLIPPING
  doClipping();

  #if defined(num_densityspheres) && num_densityspheres > 0
    float acc = 0.0;
    float acc1 = 0.0;
    float acc2 = 0.0;

    #if !defined(num_densityspheres_attr_class_1) || num_densityspheres_attr_class_1 == 0
    for (int i = 0; i < num_densityspheres; i++) {
      float acc_i = getAccumulation(uDensitySpheres[i], mvPosition);
      acc += acc_i;
    }
    #endif

    #if defined(num_densityspheres_attr_class_1) && num_densityspheres_attr_class_1 > 0
    for (int i = 0; i < num_densityspheres_attr_class_1; i++) {
      float acc_i = getAccumulation(uDensitySpheresAttrClass1[i], mvPosition);
      acc1 += acc_i;
    }
    #endif

    #if defined(num_densityspheres_attr_class_2) && num_densityspheres_attr_class_2 > 0
    for (int i = 0; i < num_densityspheres_attr_class_2; i++) {
      float acc_i = getAccumulation(uDensitySpheresAttrClass2[i], mvPosition);
      acc2 += acc_i;
    }
    #endif

    float acc_max = uDensityKernelMax;
    float intensity = 1.0;

    #if !defined(num_densityspheres_attr_class_1) || num_densityspheres_attr_class_1 == 0
    if (acc > 0.0) {
      vColor += (ACC_COLOR_MAX_1 - vColor) * (acc / acc_max);
    }
    #endif

    #if defined(num_densityspheres_attr_class_1) && num_densityspheres_attr_class_1 > 0
    if (acc1 > 0.0 || acc2 > 0.0) {
      float acc_mix = min(acc1 + acc2, acc_max) / acc_max;

      vec3 majorityClassColor = vec3(0.0, 0.0, 0.0);
      vec3 medianColor = vColor + (ACC_COLOR_MAX_MID - vColor) * acc_mix;

      if (acc1 >= acc2) {
        majorityClassColor = vColor + (ACC_COLOR_MAX_1 - vColor) * acc_mix;
        vColor =
            majorityClassColor +
            (medianColor - majorityClassColor) * (acc2 / acc1);
      }

      if (acc2 > acc1) {
        majorityClassColor = vColor + (ACC_COLOR_MAX_2 - vColor) * acc_mix;
        vColor =
            majorityClassColor +
            (medianColor - majorityClassColor) * (acc1 / acc2);
      }
    }
    #endif
  #endif

  #if defined(num_shadowmaps) && num_shadowmaps > 0

    const float sm_near = 0.1;
    const float sm_far = 10000.0;

    for(int i = 0; i < num_shadowmaps; i++){
      vec3 viewPos = (uShadowWorldView[i] * vec4(position, 1.0)).xyz;
      float distanceToLight = abs(viewPos.z);
      
      vec4 projPos = uShadowProj[i] * uShadowWorldView[i] * vec4(position, 1);
      vec3 nc = projPos.xyz / projPos.w;
      
      float u = nc.x * 0.5 + 0.5;
      float v = nc.y * 0.5 + 0.5;

      vec2 sampleStep = vec2(1.0 / (2.0*1024.0), 1.0 / (2.0*1024.0)) * 1.5;
      vec2 sampleLocations[9];
      sampleLocations[0] = vec2(0.0, 0.0);
      sampleLocations[1] = sampleStep;
      sampleLocations[2] = -sampleStep;
      sampleLocations[3] = vec2(sampleStep.x, -sampleStep.y);
      sampleLocations[4] = vec2(-sampleStep.x, sampleStep.y);

      sampleLocations[5] = vec2(0.0, sampleStep.y);
      sampleLocations[6] = vec2(0.0, -sampleStep.y);
      sampleLocations[7] = vec2(sampleStep.x, 0.0);
      sampleLocations[8] = vec2(-sampleStep.x, 0.0);

      float visibleSamples = 0.0;
      float numSamples = 0.0;

      float bias = vRadius * 2.0;

      for(int j = 0; j < 9; j++){
        vec4 depthMapValue = texture2D(uShadowMap[i], vec2(u, v) + sampleLocations[j]);

        float linearDepthFromSM = depthMapValue.x + bias;
        float linearDepthFromViewer = distanceToLight;

        if(linearDepthFromSM > linearDepthFromViewer){
          visibleSamples += 1.0;
        }

        numSamples += 1.0;
      }

      float visibility = visibleSamples / numSamples;

      if(u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0 || nc.x < -1.0 || nc.x > 1.0 || nc.y < -1.0 || nc.y > 1.0 || nc.z < -1.0 || nc.z > 1.0){
        //vColor = vec3(0.0, 0.0, 0.2);
      }else{
        //vColor = vec3(1.0, 1.0, 1.0) * visibility + vec3(1.0, 1.0, 1.0) * vec3(0.5, 0.0, 0.0) * (1.0 - visibility);
        vColor = vColor * visibility + vColor * uShadowColor * (1.0 - visibility);
      }


    }

  #endif
}
