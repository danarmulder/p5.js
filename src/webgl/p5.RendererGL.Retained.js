//Retained Mode. The default mode for rendering 3D primitives
//in WEBGL.
'use strict';

var p5 = require('../core/core');

var hashCount = 0;
/**
 * _initBufferDefaults
 * @description initializes buffer defaults. runs each time a new geometry is
 * registered
 * @param  {String} gId  key of the geometry object
 */
p5.RendererGL.prototype._initBufferDefaults = function(gId) {
  //@TODO remove this limit on hashes in gHash
  hashCount ++;
  if(hashCount > 1000){
    var key = Object.keys(this.gHash)[0];
    delete this.gHash[key];
    hashCount --;
  }
  var gl = this.GL;
  //create a new entry in our gHash
  this.gHash[gId] = {};
  this.gHash[gId].vertexBuffer = gl.createBuffer();
  this.gHash[gId].normalBuffer = gl.createBuffer();
  this.gHash[gId].lineNormalBuffer = gl.createBuffer();
  this.gHash[gId].uvBuffer = gl.createBuffer();
  this.gHash[gId].indexBuffer = gl.createBuffer();
  this.gHash[gId].lineVertexBuffer = gl.createBuffer();
};

/**
 * createBuffers description
 * @param  {String} gId    key of the geometry object
 * @param  {p5.Geometry}  obj contains geometry data
 */
p5.RendererGL.prototype.createBuffers = function(gId, obj) {
  var gl = this.GL;
  this._setDefaultCamera();
  //initialize the gl buffers for our geom groups
  this._initBufferDefaults(gId);

  this.gHash[gId].numberOfItems = obj.faces.length * 3;
  this.gHash[gId].lineVertexCount = obj.lineVertices.length;

  if (this.curFillShader === this._getImmediateModeShader()) {
    // there are different immediate mode and retain mode color shaders.
    // if we're using the immediate mode one, we need to switch to
    // one that works for retain mode.
    this.setFillShader(this._getColorShader());
  }
  this._bindBuffer(this.gHash[gId].lineVertexBuffer, gl.ARRAY_BUFFER,
    flatten(obj.lineVertices), Float32Array, gl.STATIC_DRAW);
  this.curStrokeShader.enableAttrib(
    this.curStrokeShader.attributes.aPosition.location,
    3, gl.FLOAT, false, 0, 0);
  this._bindBuffer(this.gHash[gId].lineNormalBuffer, gl.ARRAY_BUFFER,
    flatten(obj.lineNormals), Float32Array, gl.STATIC_DRAW);
  this.curStrokeShader.enableAttrib(
    this.curStrokeShader.attributes.aDirection.location,
    4, gl.FLOAT, false, 0, 0);
  // allocate space for vertex positions
  this._bindBuffer(this.gHash[gId].vertexBuffer, gl.ARRAY_BUFFER,
    vToNArray(obj.vertices), Float32Array, gl.STATIC_DRAW);
  this.curFillShader.enableAttrib(this.curFillShader.attributes.aPosition.location,
    3, gl.FLOAT, false, 0, 0);
  // allocate space for faces
  this._bindBuffer( this.gHash[gId].indexBuffer, gl.ELEMENT_ARRAY_BUFFER,
    flatten(obj.faces), Uint16Array, gl.STATIC_DRAW);
  // allocate space for normals
  this._bindBuffer(this.gHash[gId].normalBuffer, gl.ARRAY_BUFFER,
    vToNArray(obj.vertexNormals), Float32Array, gl.STATIC_DRAW);
  this.curFillShader.enableAttrib(this.curFillShader.attributes.aNormal.location,
    3, gl.FLOAT, false, 0, 0);
  // tex coords
  this._bindBuffer(this.gHash[gId].uvBuffer, gl.ARRAY_BUFFER,
    flatten(obj.uvs), Float32Array, gl.STATIC_DRAW);
  this.curFillShader.enableAttrib(this.curFillShader.attributes.aTexCoord.location,
  2, gl.FLOAT, false, 0, 0);
  //}
};

/**
 * Draws buffers given a geometry key ID
 * @param  {String} gId     ID in our geom hash
 * @return {p5.RendererGL} this
 */
p5.RendererGL.prototype.drawBuffers = function(gId) {
  this._setDefaultCamera();
  var gl = this.GL;
  if (this.curFillShader === this._getImmediateModeShader()) {
    // looking at the code within the glsl files, I'm not really
    // sure why these are two different shaders. but, they are,
    // and if we're drawing in retain mode but the shader is the
    // immediate mode one, we need to switch.
    this.setFillShader(this._getColorShader());
  }
  if(this.curStrokeShader.active !== false &&
   this.gHash[gId].lineVertexCount > 0) {
    this.curStrokeShader.bindShader();
    this._bindBuffer(this.gHash[gId].lineVertexBuffer, gl.ARRAY_BUFFER);
    this.curStrokeShader.enableAttrib(
      this.curStrokeShader.attributes.aPosition.location,
      3, gl.FLOAT, false, 0, 0);
    this._bindBuffer(this.gHash[gId].lineNormalBuffer, gl.ARRAY_BUFFER);
    this.curStrokeShader.enableAttrib(
      this.curStrokeShader.attributes.aDirection.location,
      4, gl.FLOAT, false, 0, 0);
    this._drawArrays(gl.TRIANGLES, gId);
    this.curStrokeShader.unbindShader();
  }
  if(this.curFillShader.active !== false) {
    this.curFillShader.bindShader();
    //vertex position buffer
    this._bindBuffer(this.gHash[gId].vertexBuffer, gl.ARRAY_BUFFER);
    this.curFillShader.enableAttrib(
      this.curFillShader.attributes.aPosition.location,
      3, gl.FLOAT, false, 0, 0);
    //vertex index buffer
    this._bindBuffer(this.gHash[gId].indexBuffer, gl.ELEMENT_ARRAY_BUFFER);

    this._bindBuffer(this.gHash[gId].normalBuffer, gl.ARRAY_BUFFER);
    this.curFillShader.enableAttrib(this.curFillShader.attributes.aNormal.location,
      3, gl.FLOAT, false, 0, 0);
    // uv buffer
    this._bindBuffer(this.gHash[gId].uvBuffer, gl.ARRAY_BUFFER);
    this.curFillShader.enableAttrib(
      this.curFillShader.attributes.aTexCoord.location, 2, gl.FLOAT, false, 0, 0);
    this._drawElements(gl.TRIANGLES, gId);
    this.curFillShader.unbindShader();
  }
  return this;
};

p5.RendererGL.prototype._drawArrays = function(drawMode, gId) {
  this.GL.drawArrays(drawMode, 0, this.gHash[gId].lineVertexCount);
  return this;
};

p5.RendererGL.prototype._drawElements = function (drawMode, gId) {
  this.GL.drawElements(
    drawMode, this.gHash[gId].numberOfItems,
    this.GL.UNSIGNED_SHORT, 0);
};

///////////////////////////////
//// UTILITY FUNCTIONS
//////////////////////////////
/**
 * turn a two dimensional array into one dimensional array
 * @param  {Array} arr 2-dimensional array
 * @return {Array}     1-dimensional array
 * [[1, 2, 3],[4, 5, 6]] -> [1, 2, 3, 4, 5, 6]
 */
function flatten(arr){
  if (arr.length>0){
    // below is original flatten function which
    // was too slow for our needs
    // lower is performant but has potential
    // to hit browser call stack limit
    // if a large model is loaded
    // return arr.reduce(function(a, b){
    //   return a.concat(b);
    // });
    return ([].concat.apply([], arr));
  } else {
    return [];
  }
}

/**
 * turn a p5.Vector Array into a one dimensional number array
 * @param  {Array} arr  an array of p5.Vector
 * @return {Array]}     a one dimensional array of numbers
 * [p5.Vector(1, 2, 3), p5.Vector(4, 5, 6)] ->
 * [1, 2, 3, 4, 5, 6]
 */
function vToNArray(arr){
  return flatten(arr.map(function(item){
    return [item.x, item.y, item.z];
  }));
}
module.exports = p5.RendererGL;
