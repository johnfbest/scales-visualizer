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

// TODO: Hash table for not values, combine w/ tempo? To use to compute durations


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

let range = {
  start: 48,
  end: 84
}

let ctx = new AudioContext();
let root = 60;

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
const getScaleName = _=> prettyScaleName(document.getElementById('scaleSelect').value);

const getScale = _=> scales[document.getElementById('scaleSelect').value];

const prettyScaleName = str => {
  if (!str) return '';
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

const changeKey = _=> {
  listenForRoot = true;
  document.getElementById('chooseKeyMessage').hidden = false;
}

const updateKeyLabel = ()=> {
  document.getElementById('rootLabel').innerHTML = `${notes[noteIndex(root)]} ${getScaleName()}`;
}

const setRoot = (midi, note) => {
  root = parseInt(midi);
  while (root > range.start) root -= 12;
  updateKeyLabel();
  if (showingScale) updateScale();
  if (root < range.start) root +=12;
}

const playScale = () => {
  let sequence = [];
  getScale().forEach( interval => {
    sequence.push({ note: getNoteName(root+interval), ms: 600 });
  });
  // include octave at end
  sequence.push({ note: getNoteName(root+12), ms: 600 });
  playSequence(sequence);
}



const toggleScale = ()=> {
  showingScale = !showingScale;
  updateScale();
}

const updateScale = ()=>{
  updateKeyLabel();

  let b = document.getElementById('toggleScaleButton');
  b.innerHTML = showingScale ? 'Hide Scale' : 'Show Scale';
  
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

let metronome = null;
const toggleMetronome = el => {
  if (metronome == null) {
    metronome = setInterval(_=> {
      click();
    }, 500);
  } else {
    clearInterval(metronome);
    metronome = null;
  }

}

const changeScale = _=> {
    updateScale();
}

const playFromElement = (el) => {
  let { midi, note } = el.target.dataset;
  play(midi, note);
}

const click = ()=> {
  let fader = ctx.createGain();
  fader.connect(ctx.destination);
  fader.gain.value = 0;

  let osc = ctx.createOscillator();
  osc.frequency.value = 000;
  osc.connect(fader);
  osc.start();
  osc.stop(ctx.currentTime + 0.2); 
  fader.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  fader.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
}

const play = (midi, note) => {
  if (listenForRoot){
    listenForRoot = false;
    document.getElementById('chooseKeyMessage').hidden = true;
    setRoot(midi, note);
  } 

  let fader = ctx.createGain();
  fader.connect(ctx.destination);
  fader.gain.value = 0;

  let osc = ctx.createOscillator();
  osc.frequency.value = computeHz(midi);
  osc.connect(fader);
  osc.start();
  osc.stop(ctx.currentTime + 0.8); 
  fader.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
  fader.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
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
  container.style.width= ((range.end - range.start) * 52) + "px";
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

const adjustRange = el => {
  let b = el.target;
  if (b.dataset.range =='lower' && b.dataset.increment=='expand') range.start--;
  if (b.dataset.range =='lower' && b.dataset.increment=='contract') range.start++;
  if (b.dataset.range =='upper' && b.dataset.increment=='expand') range.end++;
  if (b.dataset.range =='upper' && b.dataset.increment=='contract') range.end--;
  if (range.start > range.end) range.start = range.end-1;
  makeKeyboard();
}

(_=> {
  makeKeyboard();
  makeScaleSelect();
  setRoot(root, getNoteName(root));

  document.getElementById('rootButton').onclick = changeKey;
  document.getElementById('toggleScaleButton').onclick = toggleScale;
  document.getElementById('playScaleButton').onclick = playScale;
  //document.getElementById('toggleNoteNamesButton').onclick = toggleNoteNames;
  //document.getElementById('toggleMetronomeButton').onclick = toggleMetronome;

  let rangeButtons = document.getElementsByClassName('rangeButton');
  for (let r = 0; r < rangeButtons.length; r++) {
    rangeButtons[r].onclick = adjustRange;
  }

  document.getElementById('chooseKeyMessage').hidden = true;

  //document.body.onfocus = playSequence(intro);
})()
