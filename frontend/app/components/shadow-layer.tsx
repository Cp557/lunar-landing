"use client";

import { useEffect, useRef, useState } from "react";

import { HALF_EXTENT_M, HEIGHTS_SIZE as SIZE, R_M } from "../lib/polar";

const VERTEX = `#version 300 es
in vec2 p;
out vec2 uv;
void main() {
  uv = vec2((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.5); // uv (0,0) = top-left, like the image
  gl_Position = vec4(p, 0.0, 1.0);
}`;

/**
 * GLSL shared by the 2D shadow layer and the 3D south pole: is the Sun hidden by terrain for a lander
 * 2 m above the ground at map position `uv` (0..1 from the top-left)? A ray is marched toward the Sun
 * (Moon-fixed unit vector `sunDir`) across the heights texture; positions are exact on the 1737.4 km
 * sphere (polar stereographic, same as the relief map), so the Moon's curvature is included.
 */
export const SHADOW_GLSL = `
uniform highp sampler2D heights;
uniform vec3 sunDir;
uniform float halfExtent;
uniform float R;

vec3 toSphere(vec2 m) {  // map meters (x right, y up = toward 0°E) -> Moon-fixed unit vector
  float rho2 = dot(m, m) / (4.0 * R * R);
  return vec3(m.y / R, m.x / R, -(1.0 - rho2)) / (1.0 + rho2);
}
vec2 toUv(vec3 u) {
  float k = 2.0 * R / (1.0 - u.z);
  return vec2(k * u.y / (2.0 * halfExtent) + 0.5, 0.5 - k * u.x / (2.0 * halfExtent));
}
bool inShadow(vec2 uv) {
  vec2 m = vec2((uv.x - 0.5) * 2.0 * halfExtent, (0.5 - uv.y) * 2.0 * halfExtent);
  vec3 P = toSphere(m) * (R + texture(heights, uv).r + 2.0);
  float d = 300.0;
  for (int i = 0; i < 110; i++) {   // 300 m .. ~300 km, growing steps
    vec3 Q = P + sunDir * d;
    float rq = length(Q);
    vec2 t = toUv(Q / rq);
    if (t.x < 0.0 || t.x > 1.0 || t.y < 0.0 || t.y > 1.0) return false;
    if (R + texture(heights, t).r > rq) return true;
    d *= 1.065;
  }
  return false;
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
${SHADOW_GLSL}
in vec2 uv;
out vec4 color;
void main() {
  // Dark navy where shadowed, a faint warm tint where sunlit.
  color = inShadow(uv) ? vec4(0.0, 0.01, 0.06, 0.8) : vec4(1.0, 0.85, 0.5, 0.08);
}`;

type Gl = { gl: WebGL2RenderingContext; sunDir: WebGLUniformLocation | null };

function setup(canvas: HTMLCanvasElement, heights: Float32Array): Gl | null {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, SIZE, SIZE, 0, gl.RED, gl.FLOAT, heights);
  for (const [k, v] of [
    [gl.TEXTURE_MIN_FILTER, gl.NEAREST],
    [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
  ])
    gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.uniform1f(gl.getUniformLocation(program, "halfExtent"), HALF_EXTENT_M);
  gl.uniform1f(gl.getUniformLocation(program, "R"), R_M);
  gl.uniform1i(gl.getUniformLocation(program, "heights"), 0);
  return { gl, sunDir: gl.getUniformLocation(program, "sunDir") };
}

/** Live terrain shadows over the south-pole map for the Sun's direction (sub-solar point). */
export function ShadowLayer({ subsolarLat, subsolarLon }: { subsolarLat: number; subsolarLon: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [gl, setGl] = useState<Gl | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/south-pole-heights.bin")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        if (cancelled || !canvas.current) return;
        const ctx = setup(canvas.current, Float32Array.from(new Int16Array(buf)));
        if (ctx) setGl(ctx);
        else setError("Shadows need a browser with WebGL2.");
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gl) return;
    const lat = (subsolarLat * Math.PI) / 180;
    const lon = (subsolarLon * Math.PI) / 180;
    gl.gl.uniform3f(gl.sunDir, Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    gl.gl.drawArrays(gl.gl.TRIANGLE_STRIP, 0, 4);
  }, [gl, subsolarLat, subsolarLon]);

  return (
    <>
      <canvas ref={canvas} width={SIZE} height={SIZE} className="pointer-events-none absolute inset-0 size-full" />
      {error && <span className="absolute inset-x-0 bottom-8 text-center text-xs text-destructive">{error}</span>}
    </>
  );
}
