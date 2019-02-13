/*
 * Path Tracer Demo
 * https://www.shadertoy.com/view/MsySzd
 */

#version 330

out vec4 fragColor;

// time (in seconds)
uniform float iTime;
// viewport resolution (in pixels)
uniform vec2 iResolution;
// input channels
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

void main(void)
{
    // normalized pixel coordinates (from 0 to 1)
    vec2 uv = gl_FragCoord.xy / iResolution;
    vec4 r = texture(iChannel0, uv);

    // gamma
    r = clamp(r, 0.0, 1.0);
    r = vec4(pow(r, vec4(1.0 / 2.2)));

    fragColor = r;
}
