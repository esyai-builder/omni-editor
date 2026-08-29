import type { Clip, Project, MediaAsset, Track } from '@shared/types';

const VERT = `#version 300 es
in vec2 a_pos;
in vec2 a_uv;
out vec2 v_uv;
uniform mat3 u_transform;
void main() {
  vec3 p = u_transform * vec3(a_pos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  v_uv = a_uv;
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_tex;
uniform float u_opacity;
uniform vec4 u_color;
uniform float u_hue;
void main() {
  vec4 c = texture(u_tex, v_uv);
  if (c.a < 0.001) discard;
  c.rgb *= pow(2.0, u_color.w);
  c.rgb += u_color.x;
  c.rgb = (c.rgb - 0.5) * (1.0 + u_color.y) + 0.5;
  float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb = mix(vec3(gray), c.rgb, 1.0 + u_color.z);
  float h = radians(u_hue);
  mat3 toYIQ = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
  mat3 toRGB = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);
  vec3 yiq = toYIQ * c.rgb;
  float cs = cos(h), sn = sin(h);
  yiq.yz = mat2(cs, -sn, sn, cs) * yiq.yz;
  c.rgb = toRGB * yiq;
  c.rgb = clamp(c.rgb, 0.0, 1.0);
  c.a *= u_opacity;
  outColor = c;
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`Shader compile error: ${log}`);
  }
  return s;
}

function link(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`Program link error: ${log}`);
  }
  return p;
}

interface LayerTexture { texture: WebGLTexture; width: number; height: number; }

export class Compositor {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private textureCache = new Map<string, LayerTexture>();
  private fallbackSolidTexture: WebGLTexture;
  private canvasWidth = 1920;
  private canvasHeight = 1080;

  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    this.program = link(gl, vs, fs);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const data = new Float32Array([
      -1, -1, 0, 1,  1, -1, 1, 1,  -1,  1, 0, 0,
      -1,  1, 0, 0,  1, -1, 1, 1,   1,  1, 1, 0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(this.program, 'a_pos');
    const aUv = gl.getAttribLocation(this.program, 'a_uv');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);
    this.vao = vao;
    this.uniforms.u_transform = gl.getUniformLocation(this.program, 'u_transform');
    this.uniforms.u_tex = gl.getUniformLocation(this.program, 'u_tex');
    this.uniforms.u_opacity = gl.getUniformLocation(this.program, 'u_opacity');
    this.uniforms.u_color = gl.getUniformLocation(this.program, 'u_color');
    this.uniforms.u_hue = gl.getUniformLocation(this.program, 'u_hue');
    this.fallbackSolidTexture = this.createSolidTexture([40, 40, 40, 255]);
  }

  resize(w: number, h: number) { this.canvasWidth = w; this.canvasHeight = h; this.canvas.width = w; this.canvas.height = h; }

  private createSolidTexture(rgba: [number, number, number, number]): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  uploadImage(key: string, source: TexImageSource, width: number, height: number) {
    const gl = this.gl;
    let entry = this.textureCache.get(key);
    if (!entry) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      entry = { texture: tex, width, height };
      this.textureCache.set(key, entry);
    }
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  clearCache() { this.textureCache.clear(); }
  deleteTexture(key: string) { const e = this.textureCache.get(key); if (e) { this.gl.deleteTexture(e.texture); this.textureCache.delete(key); } }

  beginFrame(clearColor: [number, number, number, number] = [0, 0, 0, 1]) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
    gl.clearColor(clearColor[0]/255, clearColor[1]/255, clearColor[2]/255, clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  drawLayer(texture: WebGLTexture, textureW: number, textureH: number, posX: number, posY: number, scale: number, rotation: number, opacity: number, color: { brightness: number; contrast: number; saturation: number; exposure: number; hue: number }) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.uniforms.u_tex, 0);
    const cw = this.canvasWidth, ch = this.canvasHeight;
    const fitScale = Math.min(cw / textureW, ch / textureH);
    const drawW = textureW * fitScale * scale;
    const drawH = textureH * fitScale * scale;
    const cx = (posX / cw) * 2 - 1;
    const cy = 1 - (posY / ch) * 2;
    const sx = drawW / cw;
    const sy = drawH / ch;
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const m = new Float32Array([ sx*cos, sx*sin, 0,  -sy*sin, sy*cos, 0,  cx, cy, 1 ]);
    gl.uniformMatrix3fv(this.uniforms.u_transform, false, m);
    gl.uniform1f(this.uniforms.u_opacity, Math.max(0, Math.min(1, opacity)));
    gl.uniform4f(this.uniforms.u_color, color.brightness, color.contrast, color.saturation, color.exposure);
    gl.uniform1f(this.uniforms.u_hue, color.hue);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  endFrame() {}
  getFallbackTexture() { return this.fallbackSolidTexture; }
}

export function activeClipsAtTime(project: Project, timeMs: number): Array<{ track: Track; clip: Clip; media: MediaAsset | undefined }> {
  const out: Array<{ track: Track; clip: Clip; media: MediaAsset | undefined }> = [];
  for (const t of project.tracks) {
    if (!t.enabled) continue;
    for (const c of t.clips) {
      if (timeMs >= c.start_ms && timeMs < c.start_ms + c.duration_ms) {
        const media = project.media.find((m) => m.id === c.media_id);
        out.push({ track: t, clip: c, media });
      }
    }
  }
  out.sort((a, b) => {
    const order = (k: Track['kind']) => (k === 'overlay' ? 2 : k === 'video' ? 1 : 0);
    return order(a.track.kind) - order(b.track.kind);
  });
  return out;
}
