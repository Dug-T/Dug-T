// Dr Amara Osei's field journal: twelve pages scattered over the island, telling the story of the mountain waking.
import { POIS } from './island.js';

const at = (poi, dx, dz) => ({ x: POIS[poi].x + dx, z: POIS[poi].z + dz });
export const PAGES = [
  { ...at('camp', -6, 4), title: 'Day 1', text: 'Arrived on Kalani with the seismometer kit. The mountain steams like a kettle left on low. The fishermen call her the Ancestor. Lovely people. Terrible coffee.' },
  { x: -196, z: -34, title: 'Day 4', text: 'Installed station two on the western cliffs. A swarm of small quakes overnight, all shallow. Lena says the goats moved to the far headland. I noted it as a joke. I should not have.' },
  { ...at('bunker', 8, -6), title: 'Day 7', text: 'Old Pete showed me the 1943 shelter. Two metres of rock and a door that still seals. He keeps it stocked out of habit, he says. I suspect he is the only sensible person on this island.' },
  { x: 62, z: -52, title: 'Day 9', text: 'The tilt meters show the summit inflating. Centimetres a day. Magma is rising into the shallow chamber. I radioed the mainland. They said: keep monitoring.' },
  { ...at('spring', 4, -3), title: 'Day 12', text: 'A sulphur smell at the spring this morning. The water is still sweet. For now. If it turns sour, run.' },
  { ...at('village', 14, 10), title: 'Day 15', text: 'Kai took me out past the reef. From the water you can see the old lava channels from 1887, running to the sea on every side. She does not erupt from one vent. She bleeds everywhere.' },
  { ...at('wreck', 5, 6), title: 'Day 18', text: 'The supply plane came in too low over the ranger tower. The pilot walked away. The mast did not. Tomas is a good man, and embarrassed about the mast. He should be.' },
  { ...at('village', -15, 6), title: 'Day 20', text: 'The ferry left early because of the swell. I stayed to finish the survey. I am writing this down so somebody knows it was my choice, not my mistake.' },
  { ...at('pool', 3, 3), title: 'Day 21', text: 'Harmonic tremor since dawn. That is not rock breaking any more. That is fluid moving. I would give it days. Possibly less.' },
  { x: -120, z: -10, title: 'Day 22', text: 'If you are reading this and I am not with you: the surge is what kills. Ash you can breathe through cloth. Lava you can walk away from. The surge moves faster than you can run. Be underground, or be gone.' },
  { ...at('helipad', 8, -4), title: 'Day 22, night', text: 'Could not sleep. The crater glows red against the clouds. It is beautiful. I hate that it is beautiful.' },
  { ...at('tower', -8, 4), title: 'Day 23', text: 'Packing the logger. Thirty days of readings. Whatever happens here, the next island will know what this looked like before it happened. That has to count for something.' },
];
