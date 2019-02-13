#version 330

out vec4 fragColor;

// time (in seconds)
uniform float iTime;
uniform int iFrame;
// viewport resolution (in pixels)
uniform vec2 iResolution;
// input channels
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;

#define SAMPLES 2
#define N_SPHERES 8
#define DIFF 0
#define REFR 1
#define SPEC 2
#define CHECK 3

//-----------------------------------------------------------------------

vec2 camAng;

struct Ray
{
    vec3 origin;
    vec3 direction;
};

struct Sphere
{
    float radius;
    vec3 position;
    vec3 emission;
    vec3 colour;
    int type;
};

Sphere spheres[N_SPHERES];
	
float rand(vec2 co)
{
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

//-----------------------------------------------------------------------
void SetupScene(void)
//-----------------------------------------------------------------------
{
    vec3 z = vec3(0.0,0.0,0.0);
    vec3 L1 = vec3(0.2,0.7,1.2) * 30.0;
    vec3 L2 = vec3(1.2,0.7,0.2) * 1.0;

    spheres[0] = Sphere(10000.0, vec3(50.0, 10000.0, 81.6),   z, vec3(.5,.5,.5),        CHECK); //Floor
    spheres[1] = Sphere(  200.0, vec3(750.0,   450.0, 81.6), L1, vec3(1.0,1.0,1.0),      DIFF); //Light1
    spheres[7] = Sphere(  600.0, vec3(0.0,  750.0, 0),       L2, vec3(1.0,1.0,1.0),      DIFF); //Light2
    spheres[2] = Sphere(   16.5, vec3(27.0,16.5,47.0),        z, vec3(1.0,1.0,1.0)*.999, SPEC); //Mirr
    spheres[3] = Sphere(   16.5, vec3(73.0,16.5,78.0),        z, vec3(1.0,1.0,1.0)*.999, REFR); //Glas
    spheres[4] = Sphere(   10.0, vec3(11.0,10.0,100.0),       z, vec3(0.7,0.7,0.2)*.999, DIFF); //Yellow
    spheres[5] = Sphere(    8.0, vec3(50.0,28.0,70.0),        z, vec3(0.6,0.1,0.8)*.999, DIFF); //Purple
    spheres[6] = Sphere(    5.0, vec3(45.0,5.0,75.0),         z, vec3(0.2,0.8,0.2)*.999, DIFF); //Green
}


//-----------------------------------------------------------------------
float SphereIntersect(float rad, vec3 pos, Ray r)
//-----------------------------------------------------------------------
{
    vec3 op = pos - r.origin;
    float eps = 0.01;
    float b = dot(op , r.direction);
    float det = b * b - dot(op,op) + rad * rad;

    if (det < 0.0) {
        return 0.0;
    }

    det = sqrt(det);

    float t1 = b - det;

    if (t1 > eps) {
        return t1;
    }

    float t2 = b + det;

    if (t2 > eps) {
        return t2;
    }

    return 0.0;	
}
	

//-----------------------------------------------------------------------
bool Intersect(Ray r, inout float t, inout int id, inout Sphere s)
//-----------------------------------------------------------------------
{
    float d;
    float inf = 10000000.0;
    t = inf;

    for (int i = 0; i < N_SPHERES; i++) {
        d = SphereIntersect(spheres[i].radius, spheres[i].position, r);

        if (d != 0.0 && d < t) {
            t = d;
            s = spheres[i];
        }
    }

    return t < inf;
}

//-----------------------------------------------------------------------
vec3 CalculateRadiance(Ray r, vec2 rng)
//-----------------------------------------------------------------------
{
    vec3 finalCol = vec3(0.0,0.0,0.0);
    vec3 fCum = vec3(1.0,1.0,1.0);

    for (int depth = 0; depth < 8; depth++) {
        float t = 0.0;                            // distance to intersection
        int id = 0;                               // id of intersected object
        Sphere obj;

        if (!Intersect(r, t, id, obj)) {
            break;
        }

        vec3 x = r.origin + r.direction * t;
        vec3 n = normalize(x - obj.position);
        vec3 nl = dot(n,r.direction) < 0.0 ? n : n * -1.0;
        vec3 f = obj.colour;
        float p = max(max(f.x,f.y),f.z);

        rng.x = rand( rng );

        if (rng.x < p) {
            f = f / p;
        }
        else {
            break; //R.R.
        }

        fCum = f * fCum;

        if (obj.type == DIFF || obj.type == CHECK) { // Ideal DIFFUSE reflection
            if (obj.type == CHECK) {
                if ((mod(x.x,80.0) < 40.0 && mod(x.z,80.0) < 40.0) || 
                    (mod(x.x,80.0) > 40.0 && mod(x.z,80.0) > 40.0)) {
                    fCum *= 0.3;
                }
            }

            float r1 = 2.0 * 3.1415926536 * rand(rng);
            rng.x = sin(r1 - float(iFrame));

            float r2 = rand(rng);
            rng.y = sin(r2 + float(iFrame));

            float r2s = sqrt(r2);
            vec3 w = nl;
            vec3 u = normalize(cross((abs(w.x) > .1 ? vec3(0.0, 1.0, 0.0) : vec3(1.0,1.0,1.0)), w));
            vec3 v = cross(w,u);
            vec3 d = normalize(u * cos(r1) * r2s + v * sin(r1) * r2s + w * sqrt(1.0 - r2));

            finalCol = finalCol + fCum * obj.emission;
            r = Ray(x, d);
            continue;
        }
        else if (obj.type == SPEC) {// Ideal SPECULAR reflection
            finalCol = finalCol + fCum * obj.emission;
            r = Ray(x, r.direction - n * 2.0 * dot(n,r.direction));
            continue;
        }

        // Ideal dielectric REFRACTION
        Ray reflRay = Ray(x, r.direction - n * 2.0 * dot(n,r.direction));
        bool into = dot(n,nl) > 0.0; // Ray from outside going in?
        float nc = 1.0; // IOR of air
        float nt = 1.5; // IOR of solid
        float nnt = into ? nc / nt : nt / nc;
        float ddn = dot(r.direction , nl);
        float cos2t = 1.0 - nnt * nnt * (1.0 - ddn * ddn);

        if (cos2t < 0.0) { // Total internal reflection
            finalCol = finalCol + fCum * obj.emission;
            r = reflRay;
            continue;
        }

        vec3 tdir = normalize(r.direction * nnt - n * ((into ? 1.0 : -1.0) * (ddn * nnt + sqrt(cos2t))));
        float a = nt - nc;
        float b = nt + nc;
        float R0 = a * a / (b * b);
        float c = 1.0 - (into ? -ddn : dot(tdir,n));
        float Re = R0 + (1.0 - R0) * c * c * c * c * c;
        float Tr = 1.0 - Re;
        float P = .25 + .5 * Re;
        float RP = Re / P;
        float TP = Tr / (1.0 - P);

        rng.y = rand(rng);

        if (rng.y < P) {
            r = reflRay;
            fCum = fCum * RP;
            finalCol = finalCol + fCum * obj.emission;
        }
        else {
            r = Ray(x, tdir);
            fCum = fCum * TP;
            finalCol = finalCol + fCum * obj.emission;
        }

        // we reached something bright, don't spawn any more rays
        if (length(obj.emission) > 100.0) {
            break;
        }
    }

    return finalCol;
}


//-----------------------------------------------------------------------
void main(void)
//-----------------------------------------------------------------------
{
    vec4 bufferB = texture(iChannel1, vec2(0.5,0.5));

    camAng = bufferB.xy;    

    SetupScene();
    float t = 0.0;

    // camera
    vec3 lookAt = vec3(40.0, 5.0, 60.0);
    float elev = camAng.y + 0.4;
    vec3 camLoc = lookAt + vec3(sin(camAng.x)*cos(elev), sin(elev), cos(camAng.x)*cos(elev)) * 90.0;

    Ray cam = Ray(camLoc, normalize(lookAt - camLoc));

    vec3 cy = vec3(0.0,1.0,0.0);
    vec3 cx = normalize(cross(cam.direction, cy));
    cy = normalize(cross(cam.direction, cx));

    cx *= iResolution.x / iResolution.y;
    cx *= 0.8;
    cy *= -0.8;

    vec3 r = vec3(0.0,0.0,0.0);
    // rng seeds
    float r1 = gl_FragCoord.x + iTime;
    float r2 = gl_FragCoord.y + sin(float(iFrame));

    for(int s = 0; s < SAMPLES; s++) {
        r1 = 2.0 * rand(vec2(r1,r2));

        float dx = r1 < 1.0 ? sqrt(r1) - 1.0 : 1.0 - sqrt(2.0 - r1);

        r2 = 2.0 * rand(vec2(r1,r2));

        float dy = r2 < 1.0 ? sqrt(r2) - 1.0 : 1.0 - sqrt(2.0 - r2);

        vec3 d = cx * ((dx + gl_FragCoord.x) / iResolution.x - .5)
               + cy * ((dy + gl_FragCoord.y) / iResolution.y - .5)
               + cam.direction;

        Ray ray = Ray(cam.origin + d * 10.0, normalize(d));
        r = r + CalculateRadiance(ray, vec2(r1,float(s)));
    }

    r /= float(SAMPLES);

    vec4 c2 = vec4(r, 1.0);
    vec2 xy = gl_FragCoord.xy / iResolution.xy;
    vec4 c1 = texture(iChannel0, xy);
    float fDelta = float(iFrame) - bufferB.z;

    if (fDelta < 1.0) {
        fragColor = c2;
    }
    else {
        fragColor = (c1 * fDelta + c2) / (fDelta + 1.0);
    }
}
