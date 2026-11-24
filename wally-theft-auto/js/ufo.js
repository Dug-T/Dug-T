// The flying saucer that drops Wally off at the start of the game
import * as THREE from 'three';

export function buildUFO() {
  const g = new THREE.Group();
  const hull = new THREE.MeshPhysicalMaterial({ color: '#c9d1da', metalness: 1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3a4049', metalness: 0.9, roughness: 0.35 });
  // saucer body: a lathe of the classic profile (wide thin rim, domed top, shallow belly)
  const prof = [
    [0, -0.9], [1.6, -0.95], [3.4, -0.75], [5.4, -0.25], [6.2, 0], [5.6, 0.3], [4.2, 0.65], [2.8, 0.95], [0, 1.05],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(40), 72), hull);
  g.add(body);
  // panel seams
  for (const r of [2.2, 3.6, 4.9]) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 96), dark);
    seam.rotation.x = Math.PI / 2; seam.position.y = r < 3 ? 0.9 : (r < 4 ? 0.6 : 0.27); g.add(seam);
  }
  // rim band
  const rim = new THREE.Mesh(new THREE.TorusGeometry(6.1, 0.18, 12, 120), dark);
  rim.rotation.x = Math.PI / 2; g.add(rim);
  // glass cockpit dome with a little green pilot inside
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.3, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ color: '#9ff3ff', metalness: 0.1, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.55, emissive: '#2fd8ff', emissiveIntensity: 0.35 }));
  dome.position.y = 0.95; dome.scale.y = 0.8; g.add(dome);
  const alienM = new THREE.MeshStandardMaterial({ color: '#7be35a', roughness: 0.5 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), alienM); head.scale.set(1, 1.25, 1); head.position.y = 1.85; g.add(head);
  const eyeM = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.1 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 10), eyeM); e.scale.set(1, 1.5, 0.6); e.position.set(s * 0.22, 1.95, 0.45); e.rotation.z = s * 0.4; g.add(e); }
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 0.8, 16), alienM); torso.position.y = 1.2; g.add(torso);
  // chasing rim lights
  const lights = [];
  const cols = ['#ff3b5c', '#ffd23f', '#3bff8a', '#3bb8ff'];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const m = new THREE.MeshStandardMaterial({ color: cols[i % 4], emissive: cols[i % 4], emissiveIntensity: 0.5 });
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), m);
    l.position.set(Math.cos(a) * 5.75, 0.05, Math.sin(a) * 5.75); g.add(l); lights.push(l);
  }
  // glowing belly lens and the tractor beam
  const belly = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), new THREE.MeshBasicMaterial({ color: '#9ffcff' }));
  belly.rotation.x = Math.PI / 2; belly.position.y = -0.93; g.add(belly);
  const c = document.createElement('canvas'); c.width = 8; c.height = 128; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)');
  x.fillStyle = gr; x.fillRect(0, 0, 8, 128);
  for (let k = 0; k < 128; k += 16) { x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(0, k, 8, 4); }
  const beamTex = new THREE.CanvasTexture(c); beamTex.wrapT = THREE.RepeatWrapping;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 3.2, 1, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: '#8ff8ff', map: beamTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  beam.position.y = -0.93; g.add(beam);
  const glow = new THREE.PointLight('#8ff8ff', 0, 40, 1.5); glow.position.y = -2; g.add(glow);
  g.traverse((m) => { if (m.isMesh && m !== beam && m !== belly) m.castShadow = true; });

  const ufo = {
    group: g, beamOn: 0, t: 0,
    // height = distance from the saucer down to the ground, so the beam reaches it
    update(dt, height) {
      this.t += dt;
      lights.forEach((l, i) => { l.material.emissiveIntensity = ((i + Math.floor(this.t * 12)) % 4 === 0) ? 4 : 0.4; });
      g.rotation.y += dt * 0.6;
      const h = Math.max(1, height - 0.93);
      beam.scale.set(1, h, 1); beam.position.y = -0.93 - h / 2;
      beam.material.opacity = this.beamOn * (0.35 + Math.sin(this.t * 20) * 0.05);
      beamTex.offset.y = -this.t * 1.5;
      glow.intensity = this.beamOn * 120;
      belly.material.color.setScalar(0.5 + this.beamOn * 0.5);
    },
  };
  return ufo;
}
