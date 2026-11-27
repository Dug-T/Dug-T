// Your own Wally: if wally-theft-auto/models/wally.glb exists, it replaces the built-in model.
// It should be a rigged, skinned glTF (e.g. made in Blender, or rigged and animated with Mixamo).
// The built-in skeleton still runs underneath for the game logic; your model is shown instead and
// plays its own animation clips, picked by name. Optional models/wally.json can tweak it:
//   { "height": 1.85, "turn": 0, "clips": { "idle": "Idle", "walk": "Walking", ... }, "hand": "RightHand", "grip": [0, 0, 0] }
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// which clip to play for each state, matched by name (first match wins) unless wally.json names them
const CLIP_NAMES = {
  idle: /idle|stand/i, walk: /walk/i, run: /run|sprint|jog/i, jump: /jump/i, fly: /fly|fall|float|jump/i,
  punch: /punch|attack|hit|melee/i, shoot: /shoot|fire|aim/i, drive: /sit|drive|seat/i, dead: /death|die|dead/i,
};

export function loadCustomModel(player, url = 'models/wally.glb') {
  fetch(url, { method: 'HEAD', cache: 'no-store' }).then((r) => {
    if (!r.ok) return null;
    return fetch('models/wally.json', { cache: 'no-store' }).then((j) => (j.ok ? j.json() : {})).catch(() => ({}));
  }).then((cfg) => {
    if (!cfg) return;
    new GLTFLoader().load(url + '?v=' + Date.now(), (gltf) => attach(player, gltf, cfg), undefined, (e) => console.warn('wally.glb could not be loaded', e));
  }).catch(() => {});
}

function attach(player, gltf, cfg) {
  const h = player.h, model = gltf.scene;
  // size it to Wally's height and stand it on the ground
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
  const k = (cfg.height || 1.85) / (size.y || 1);
  model.scale.multiplyScalar(k);
  model.position.y -= box.min.y * k;
  model.rotation.y = (cfg.turn || 0) * Math.PI / 180;
  model.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } });
  // hide the built-in body, but keep the weapons in his hand
  const grip = h.arms[1].grip;
  const keep = new Set(); grip.traverse((m) => keep.add(m));
  h.root.traverse((m) => { if (m.isMesh && !keep.has(m)) m.visible = false; });
  if (h.cape) h.cape.visible = false;
  h.root.add(model);
  // weapons go in the model's right hand
  let hand = null;
  const want = cfg.hand ? new RegExp('^' + cfg.hand + '$', 'i') : /(right.?hand|hand.?r(ight)?$|hand_r|r_hand|mixamorig:?righthand)/i;
  model.traverse((b) => { if (!hand && b.isBone && want.test(b.name)) hand = b; });
  if (!hand) model.traverse((b) => { if (!hand && b.isBone && /hand/i.test(b.name) && /r/i.test(b.name.replace(/hand/i, ''))) hand = b; });
  if (hand) {
    hand.add(grip);
    grip.position.set(...(cfg.grip || [0, 0, 0]));
    // keep the weapons their normal size whatever scale the model's bones are at
    h.root.updateMatrixWorld(true);
    const ws = hand.getWorldScale(new THREE.Vector3()).x / (h.root.getWorldScale(new THREE.Vector3()).x || 1);
    grip.scale.setScalar(ws ? 1 / ws : 1);
    grip.rotation.set(0, 0, 0);
  }
  // animation clips
  const mixer = new THREE.AnimationMixer(model), clips = {};
  for (const [state, re] of Object.entries(CLIP_NAMES)) {
    const named = cfg.clips && cfg.clips[state];
    const clip = named ? gltf.animations.find((c) => c.name === named) : gltf.animations.find((c) => re.test(c.name));
    if (clip) clips[state] = mixer.clipAction(clip);
  }
  for (const s of ['jump', 'punch', 'shoot']) if (clips[s]) { clips[s].setLoop(THREE.LoopOnce); clips[s].clampWhenFinished = true; }
  if (clips.dead) { clips.dead.setLoop(THREE.LoopOnce); clips.dead.clampWhenFinished = true; }
  let current = null;
  const play = (s, fade = 0.2) => {
    const a = clips[s] || clips.idle; if (!a || a === current) return;
    a.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (current) current.fadeOut(fade);
    current = a;
  };
  player.custom = {
    model, mixer, clips,
    update(dt, st) {
      let s = 'idle';
      if (st.dead) s = 'dead';
      else if (st.car) s = 'drive';
      else if (st.fly) s = 'fly';
      else if (st.air) s = 'jump';
      else if (st.punch && clips.punch) s = 'punch';
      else if (st.speed > 5.5) s = 'run';
      else if (st.speed > 0.4) s = 'walk';
      play(s);
      if (current && (s === 'walk' || s === 'run')) current.timeScale = Math.max(0.6, Math.min(1.6, st.speed / (s === 'run' ? 6.5 : 2.2)));
      mixer.update(dt);
    },
  };
  console.info('Wally: using models/wally.glb with clips', Object.keys(clips).join(', ') || '(none)');
}
