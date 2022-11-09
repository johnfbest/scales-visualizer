const notes = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const scales = {
  major: [0,2,4,5,7,9,11],
  minor: [0,2,3,5,7,9,10]
}

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

const noteIndex = (m) => parseInt(m) % 12;
const octave = (m) => Math.floor(m / 12) - 1;
const getNoteName = (m) => `${ notes[noteIndex(m)] }-${ octave(m) }`;

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
      else if (scales.major.includes(interval)) k.classList.add('diatonic');
      else k.classList.add('non-diatonic');
    }
  };
}

const toggleNoteNames = _=> {
  showingNoteNames = !showingNoteNames;
  makeKeyboard();
}

const play = el => {
  let { midi, note } = el.target.dataset;

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
  osc.stop(ctx.currentTime + 2); 
  fader.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
  fader.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.9);
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
  key.onclick = play;
  return key;
}

const makeKeyboard = _=> {
  let previousContainers = document.getElementsByClassName('container');
  if (previousContainers.length) {
    for (let c in previousContainers) {
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

(_=> {
  makeKeyboard();
  setRoot(root, getNoteName(root));

  document.getElementById('rootButton').onclick = pickRoot;
  document.getElementById('toggleScaleButton').onclick = toggleScale;
  document.getElementById('toggleNoteNamesButton').onclick = toggleNoteNames;
})()
