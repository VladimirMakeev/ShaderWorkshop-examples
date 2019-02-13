#version 330

out vec4 fragColor;

// time (in seconds)
uniform float iTime;
uniform int iFrame;
// viewport resolution (in pixels)
uniform vec2 iResolution;
uniform vec4 iMouse;
// input channels
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

void main(void)
{
    vec4 old = texture(iChannel0, vec2(0.5, 0.5));

    if (iMouse.z > 0.0) {
        old = vec4( (iMouse.z - iMouse.x) / 100.0,
                    (iMouse.w - iMouse.y) / 250.0,
                    float(iFrame), 0.0);
    }

    fragColor = old;
}
