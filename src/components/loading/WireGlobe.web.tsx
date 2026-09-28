import { useEffect, useRef, useState } from 'react';
import { SvgGlobe } from './SvgGlobe';
import {
  globeLines,
  initialAngle,
  latitudeSegments,
  longitudeSegments,
  loadingColors,
  rotationSpeed,
  type GlobeProps,
} from './globe';

export default function WireGlobe({ size, spinning }: GlobeProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<{ setSpinning: (value: boolean) => void } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let cleanup = () => {};
    // Load the 3D engine only when this screen is mounted. SVG appears immediately.
    void import('three')
      .then((THREE) => {
        if (disposed) return;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
        if (!context) return;
        const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0, 0);
        canvas.style.cssText = 'display:block;width:100%;height:100%';
        canvas.dataset.testid = 'globe-webgl';
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, 0.1, 10);
        camera.position.z = 4;
        const globe = new THREE.Group();
        globe.rotation.y = initialAngle;
        scene.add(globe);
        const material = new THREE.MeshBasicMaterial({ color: loadingColors.wire });
        const geometries = globeLines.map((points) => {
          // Equal-length straight chords join the grid intersections, with no spline smoothing.
          const curve = new THREE.CurvePath<InstanceType<typeof THREE.Vector3>>();
          for (let i = 1; i < points.length; i++) {
            curve.add(
              new THREE.LineCurve3(
                new THREE.Vector3(...points[i - 1]),
                new THREE.Vector3(...points[i]),
              ),
            );
          }
          const geometry = new THREE.TubeGeometry(curve, points.length - 1, 0.0018, 4, true);
          globe.add(new THREE.Mesh(geometry, material));
          return geometry;
        });
        // Depth-only facets hide rear lines without covering the shared paper background.
        const coreGeometry = new THREE.SphereGeometry(0.999, longitudeSegments, latitudeSegments);
        const coreMaterial = new THREE.MeshBasicMaterial({ colorWrite: false });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.renderOrder = -1;
        globe.add(core);
        let request = 0;
        let last = 0;
        let animating = false;
        const draw = () => renderer.render(scene, camera);
        const tick = (now: number) => {
          if (!last) last = now;
          if (now - last >= 1000 / 30) {
            globe.rotation.y += (Math.min(now - last, 100) * rotationSpeed) / 1000;
            last = now;
            draw();
          }
          request = requestAnimationFrame(tick);
        };
        controller.current = {
          setSpinning(value) {
            if (animating === value) return;
            animating = value;
            cancelAnimationFrame(request);
            last = 0;
            if (value) request = requestAnimationFrame(tick);
          },
        };
        const resize = () => {
          renderer.setSize(container.clientWidth, container.clientHeight, false);
          draw();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        container.appendChild(canvas);
        resize();
        const lost = (event: Event) => {
          event.preventDefault();
          controller.current?.setSpinning(false);
          setReady(false);
        };
        canvas.addEventListener('webglcontextlost', lost);
        cleanup = () => {
          cancelAnimationFrame(request);
          observer.disconnect();
          canvas.removeEventListener('webglcontextlost', lost);
          geometries.forEach((geometry) => geometry.dispose());
          coreGeometry.dispose();
          coreMaterial.dispose();
          material.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          canvas.remove();
          controller.current = null;
        };
        setReady(true);
      })
      .catch(() => {
        // A blocked graphics driver or failed chunk keeps the SVG version visible.
        cleanup();
        if (!disposed) setReady(false);
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    controller.current?.setSpinning(ready && spinning);
  }, [ready, spinning]);

  return (
    <div aria-hidden="true" style={{ width: size, height: size, position: 'relative' }}>
      {!ready && <SvgGlobe size={size} spinning={spinning} />}
      <div
        ref={host}
        style={{ position: 'absolute', inset: 0, visibility: ready ? 'visible' : 'hidden' }}
      />
    </div>
  );
}
