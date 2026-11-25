// Spoken dialogue with the browser's built-in speech synthesis. Every spoken line still appears as text
// on screen, so nothing is lost with the voices off or for players who cannot hear them.
// Each survivor has their own voice: a preferred accent, a pitch and a pace.

const CAST = {
  'Dr Amara Osei': { pitch: 1.0, rate: 1.0, female: true, prefer: /en[-_](GB|NG|ZA)/i },
  'Kai Tane': { pitch: 0.85, rate: 1.02, female: false, prefer: /en[-_](NZ|AU)/i },
  'Tomas Reyes': { pitch: 0.75, rate: 0.9, female: false, prefer: /en[-_](US|MX)|es[-_]/i },
  'Lena Hart': { pitch: 1.15, rate: 1.08, female: true, prefer: /en[-_](US|CA)/i },
  'Old Pete': { pitch: 0.6, rate: 0.82, female: false, prefer: /en[-_](AU|GB|IE)/i },
  Narrator: { pitch: 0.8, rate: 0.92, female: false, prefer: /en[-_]GB/i },
  You: { pitch: 0.95, rate: 1.0, female: false, prefer: /en[-_]GB/i },
};

// things speech engines read badly
const SAY_AS = [
  [/\*coughs\*/gi, 'cough.'], [/\*[^*]*\*/g, ''], [/\(You need a bandage[^)]*\)/g, 'You need a bandage. Craft one from cloth.'], [/\(Press again: come with me\)/g, ''],
  [/\.\.\./g, ', '], [/\bNOW\b/g, 'now'], [/\bGO\b/g, 'go'], [/\bIN\b/g, 'in'], [/\bYES\b/g, 'yes'], [/\bkm\/h\b/g, 'kilometres an hour'], [/Kalani/g, 'Ka-lah-nee'],
];

export class Voice {
  constructor(on = true) {
    this.on = on; this.voices = []; this.ok = typeof window !== 'undefined' && 'speechSynthesis' in window; this.current = null;
    if (!this.ok) return;
    const load = () => { this.voices = speechSynthesis.getVoices(); this.pick(); };
    load(); speechSynthesis.onvoiceschanged = load;
  }
  pick() {
    const en = this.voices.filter((v) => /^en/i.test(v.lang));
    const pool = en.length ? en : this.voices;
    const isF = (v) => /female|woman|fiona|kate|serena|libby|sonia|susan|samantha|karen|moira|tessa|victoria|zira|hazel|ava|allison|nicky|emma|joanna|salli|kendra|kimberly|amy|olivia|aria|jenny|sonia|libby|natasha|catherine|hayley|molly|emily/i.test(v.name) && !/male\b/i.test(v.name.replace(/female/i, ''));
    const isM = (v) => /\bmale|daniel|george|arthur|ryan|oliver|thomas|james|david|mark|alex|fred|tom|rishi|aaron|guy|brian|matthew|joey|russell|william|liam|noah|eric|roger|christopher|lee/i.test(v.name) && !/female/i.test(v.name);
    this.cast = {};
    for (const [name, c] of Object.entries(CAST)) {
      const want = pool.filter((v) => c.female ? isF(v) : isM(v));
      const any = pool.filter((v) => (c.female ? !isM(v) : !isF(v)));
      const list = want.length ? want : (any.length ? any : pool);
      // the preferred accent if the device has it, else a different voice from the list per character so they don't all sound alike
      const idx = Object.keys(CAST).indexOf(name);
      this.cast[name] = list.find((v) => c.prefer.test(v.lang)) || list[idx % list.length] || null;
    }
  }
  setOn(on) { this.on = on; if (!on) this.stop(); }
  // speak a line as a character. Important lines (prio) cut off whatever is being said.
  say(text, who = 'Narrator', prio = true) {
    if (!this.ok || !this.on || !text) return;
    if (!prio && speechSynthesis.speaking) return;
    if (prio) speechSynthesis.cancel();
    let spoken = text; for (const [re, rep] of SAY_AS) spoken = spoken.replace(re, rep);
    spoken = spoken.replace(/\s+/g, ' ').trim(); if (!spoken) return;
    const c = CAST[who] || CAST.Narrator;
    const u = new SpeechSynthesisUtterance(spoken);
    const v = this.cast && this.cast[who]; if (v) { u.voice = v; u.lang = v.lang; }
    u.pitch = c.pitch; u.rate = c.rate; u.volume = 1;
    this.current = u; // keep a reference: some browsers garbage-collect an utterance mid-sentence otherwise
    try { speechSynthesis.speak(u); } catch (e) { /* not available */ }
  }
  stop() { if (this.ok) try { speechSynthesis.cancel(); } catch (e) { /* */ } }
  // phones suspend speech when the page is hidden; wake it up again
  resume() { if (this.ok && speechSynthesis.paused) try { speechSynthesis.resume(); } catch (e) { /* */ } }
}
