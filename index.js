const notes = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const scales = {
  major: [0,2,4,5,7,9,11],
  natural_minor: [0,2,3,5,7,8,10],
  harmonic_minor: [0,2,3,5,7,8,11],
  melodic_minor: [0,2,3,5,7,9,11],
  major_pentatonic: [0,2,4,7,9],
  minor_pentatonic: [0,2,3,7,9],
  whole_tone: [0,2,4,6,8,10],
  diminished_whole_half: [0,2,3,5,6,8,9,11],
  diminished_half_whol: [0,1,3,4,6,7,9,10],
}

const intro = [
  { note: 'D-5', ms: 400 },
  { note: 'E-5', ms: 400 },
  { note: 'C-5', ms: 700 },
  { note: 'C-4', ms: 800 },
  { note: 'G-4', ms: 1000 },
];

const TUNING_HZ = 440;
const MIDI_A4 = 69;
const K_EQUAL_TEMP = Math.pow(2, (1/12));

const range = {
  start: 53,
  end: 89
}

let ctx = new AudioContext();
let root = 48;

let showingNoteNames = true;
let showingScale = false;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const noteIndex = (m) => parseInt(m) % 12;
const octave = (m) => Math.floor(m / 12) - 1;
const getNoteName = (m) => `${ notes[noteIndex(m)] }-${ octave(m) }`;
const getMidiNote = (note) => {
  let keys = document.getElementsByClassName('key');
  for (let key of keys) {
    if (key.dataset.note == note) return key.dataset.midi;
  }
}
const getKeyElement = (data) => {
  let keys = document.getElementsByClassName('key');
  for (let key of keys) {
    if (key.dataset.note == data || key.dataset.midi == data) return key;
  }
}
const getScale = _=> scales[document.getElementById('scaleSelect').value];
const prettyScaleName = str => {
  let words = str.split('_');
  let prettyName = '';
  words.forEach( word => {
    prettyName += word[0].toUpperCase() + word.substring(1) + ' ';
  });
  return prettyName;
}

let listenForRoot = false;

const computeHz = midi => {
  let offset = parseInt(midi) - MIDI_A4;
  return TUNING_HZ * Math.pow(K_EQUAL_TEMP, offset);
}

const pickRoot = _=> {
  listenForRoot = true;
}

const setRoot = (midi, note) => {
  root = parseInt(midi);
  while (root >= range.start) root -= 12;
  document.getElementById('rootLabel').innerHTML = note.split('-')[0];
  if (showingScale) updateScale();
}

const toggleScale = ()=> {
  showingScale = !showingScale;
  updateScale();
}

const updateScale = ()=>{
  let keys = document.getElementsByClassName('key');
  //first handle turning them off
  for (let k of keys) {
    k.classList.remove('root');
    k.classList.remove('diatonic');
    k.classList.remove('non-diatonic');
    if (showingScale) {
      let midi = parseInt(k.dataset.midi);
      let interval = (midi - root) % 12;
      if (interval == 0) k.classList.add('root')
      else if (getScale().includes(interval)) k.classList.add('diatonic');
      else k.classList.add('non-diatonic');
    }
  };
}

const toggleNoteNames = _=> {
  showingNoteNames = !showingNoteNames;
  makeKeyboard();
}

const changeScale = _=> {
    updateScale();
}

const playFromElement = (el) => {
  let { midi, note } = el.target.dataset;
  play(midi, note);
}

const play = (midi, note) => {
  if (listenForRoot){
    listenForRoot = false;
    setRoot(midi, note);
  } 

  let fader = ctx.createGain();
  fader.connect(ctx.destination);
  fader.gain.value = 0;

  let osc = ctx.createOscillator();
  osc.frequency.value = computeHz(midi);
  osc.connect(fader);
  osc.start();
  osc.stop(ctx.currentTime + 1.0); 
  fader.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
  fader.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
}

const makeNoteLabel = (midi) => {
  let note = document.createElement('span');
  note.classList.add('note-name');
  note.innerHTML = getNoteName(midi);
  note.dataset.midi = midi;
  return note;
}

const makeKey = (midi) => {
  let key = document.createElement('div');
  key.dataset.midi = midi;
  key.dataset.note = getNoteName(midi);
  key.classList.add('key');
  key.classList.add( key.dataset.note.includes('b') ? 'black-key' : 'white-key');
  key.onclick = playFromElement;
  return key;
}

const makeKeyboard = _=> {
  let previousContainers = document.getElementsByClassName('container');
  if (previousContainers && previousContainers.length) {
    
    for (let c of previousContainers) {
       c.remove();
    }
  }

  const container = document.createElement('div');
  container.classList.add('container');
  document.getElementById('keyboard').append(container);

  for (let midi = range.start; midi <= range.end; midi++ ){
    let key = makeKey(midi);
    if (showingNoteNames) {    
      let note = makeNoteLabel(midi);
      key.append(note);
    }
    container.append(key);
  }

  updateScale();
}

const makeScaleSelect = _=> {
  let s = document.getElementById('scaleSelect');
  Object.keys(scales).forEach( scale => {
    let option = document.createElement('option');
    option.text = prettyScaleName(scale);
    option.value = scale;
    s.onchange = changeScale;
    s.add(option);
  });
}

const playSequence = async (sequence) => {
  settingRoot = false;

  for (let i = 0; i < sequence.length; i++){
    let obj = sequence[i];
    let {note, ms} = obj;
    let el = getKeyElement(note);
    console.log('playing', note);
    el.classList.add('playing');
    el.click();
    await sleep(ms);
    console.log('next');
    el.classList.remove('playing');
  }
}

(_=> {
  makeKeyboard();
  makeScaleSelect();
  setRoot(root, getNoteName(root));

  document.getElementById('rootButton').onclick = pickRoot;
  document.getElementById('toggleScaleButton').onclick = toggleScale;
  document.getElementById('toggleNoteNamesButton').onclick = toggleNoteNames;

  document.body.onfocus = playSequence(intro);
})()
