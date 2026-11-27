# Your own 3D Wally

Put a rigged, skinned glTF binary here called `wally.glb` and the game uses it instead of the built-in Wally.

- Animations are picked by name: anything containing *Idle*, *Walk*, *Run*, *Jump*, *Fly*/*Fall*, *Punch*/*Attack*, *Sit*/*Drive* and *Death*.
- Weapons are put in the bone called something like *RightHand* (Mixamo's `mixamorig:RightHand` works).
- Optional `wally.json` next to it: `{ "height": 1.85, "turn": 0, "clips": { "idle": "MyIdleClip" }, "hand": "RightHand", "grip": [0, 0, 0] }`. Set `turn` (in degrees) if the model faces the wrong way.
- Keep it under about 10 MB and 50,000 triangles so phones cope, and only use a model you have the rights to.
