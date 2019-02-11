/*
 * Soft Shadow Test
 * https://www.shadertoy.com/view/4l23zy
 */

#version 330

out vec4 fragColor;

// time (in seconds)
uniform float iTime;
// shader playback frame
uniform int iFrame;
// viewport resolution (in pixels)
uniform vec2 iResolution;
// mouse pixel coords. xy: current (if LMB down), zw: click
uniform vec4 iMouse;
// input channels
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

const float pi = 3.14159;

mat3 xrot(float t)
{
    return mat3(1.0, 0.0, 0.0,
                0.0, cos(t), -sin(t),
                0.0, sin(t), cos(t));
}

mat3 yrot(float t)
{
    return mat3(cos(t), 0.0, -sin(t),
                0.0, 1.0, 0.0,
                sin(t), 0.0, cos(t));
}

mat3 zrot(float t)
{
    return mat3(cos(t), -sin(t), 0.0,
                sin(t), cos(t), 0.0,
                0.0, 0.0, 1.0);
}

float sphereDistance(vec3 pos)
{
    return length(pos) - 0.6;   
}

float sdBox( vec3 p, vec3 b )
{
    vec3 d = abs(p) - b;

    return min(max(d.x, max(d.y,d.z)), 0.0)
            + length(max(d,0.0));
}

float planeDistance(vec3 pos)
{
    vec3 origin = vec3(0.0, -0.5, 0.0);
    vec3 normal = vec3(0.0, 1.0, 0.0);
    vec3 delta = pos - origin;
    float prod = dot(delta, normal);

    return prod;
}

float map(vec3 pos)
{
    vec3 rpos = (pos - vec3(0.0,0.5,0.0));
    rpos *= zrot(iTime) * xrot(pi*0.25) * yrot(pi*0.25+iTime);

    float cube = sdBox(rpos, vec3(0.5));
    float acut = sdBox(rpos, vec3(1.0, 0.25, 0.25));
    float bcut = sdBox(rpos, vec3(0.25, 1.0, 0.25));
    float ccut = sdBox(rpos, vec3(0.25, 0.25, 1.0));
    float carve = min(acut, min(bcut, ccut));
    float x = max(-carve, cube);

    return min(x, planeDistance(pos));
}

vec3 normal(vec3 p)
{
    vec3 o = vec3(0.01, 0.0, 0.0);
    vec3 n = vec3(0.0);

    n.x = map(p+o) - map(p-o);
    n.y = map(p+o.zxy) - map(p-o.zyx);
    n.z = map(p+o.yzx) - map(p-o.yzx);

    return normalize(n);
}

float trace(vec3 o, vec3 r)
{
    float t = 0.0;

    for (int i = 0; i < 32; ++i) {
        vec3 pos = o + r * t;
        float d = map(pos);
        t += d;
    }

    return t;
}

vec2 ltrace(vec3 o, vec3 r)
{
    /* http://iquilezles.org/www/articles/rmshadows/rmshadows.htm */
    float t = 0.0;
    float md = 1000.0;
    float lt = 0.0;

    for (int i = 0; i < 32; ++i) {
        vec3 pos = o + r * t;
        float d = map(pos);

        md = min(md, 16.0*d/t);
        t += min(d, 0.1); /* <-- you need to clamp the distance for it to work :) */
    }

    return vec2(t,clamp(md,0.0,1.0));
}

float light(vec3 world, vec3 sn, vec3 lpos)
{
    vec3 ldel = world + sn * 0.01 - lpos;
    float ldist = length(ldel);
    ldel /= ldist;

    vec2 lt = ltrace(lpos, ldel);
    float lm = 1.0;

    if (lt.x < ldist) {
        lm = lt.y;
    }

    float lp = max(dot(ldel, -sn), 0.0);
    float fl = lp * lm / (1.0 + ldist * ldist * 0.1);

    return fl;
}

void main(void)
{
    vec2 fragCoord = gl_FragCoord.xy;

    vec2 uv = fragCoord.xy / iResolution.xy * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    vec3 ray = normalize(vec3(uv, 1.3));
    ray *= xrot(pi*0.27);

    mat3 rotr = mat3(1.0);//yrot(iTime);

    if (iMouse.z >= 1.0) {
        vec2 mp = iMouse.xy / iResolution.xy * 2.0 - 1.0;
        rotr = xrot(-mp.y) * yrot(-mp.x*3.0);
    }
    
    ray *= rotr;

    vec3 origin = vec3(0.0, 0.0, -1.4) * rotr;
    origin.y += 2.0;
    
    float t = trace(origin, ray);
    vec3 world = origin + ray * t;
    vec3 sn = normal(world);
    float fd = map(world);
    
    float la = light(world, sn, vec3(-1.0, 3.0, 0.0));
    float lb = light(world, sn, vec3(1.0, 3.0, 0.0));
    float fog = 1.0 / (1.0 + t * t * 0.01 + fd * 5.0);
    vec3 diff = vec3(1.0, 1.0, 1.0) * 0.1;
    float dp = max(dot(ray,-sn),0.0);

    vec3 rc = diff * dp;
    rc += la * vec3(1.0, 0.5, 0.3);
    rc += lb * vec3(0.0, 0.5, 0.7);
    rc *= fog;

    fragColor = vec4(rc, 1.0);
}
