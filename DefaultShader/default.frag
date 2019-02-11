#version 330 core

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

void main(void)
{
    // normalized pixel coordinates (from 0 to 1)
    vec2 uv = gl_FragCoord.xy / iResolution;

    // time varying pixel color
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0.0, 2.0, 4.0));

    // output to screen
    fragColor = vec4(col, 1.0);
}
