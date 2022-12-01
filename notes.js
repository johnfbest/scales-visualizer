let ctx = new AudioContext();

let cents = [
    0, 21, 53, 84, 112, 151, 165, 182,
    204, 231, 267, 294, 316, 347, 386, 417,
    435, 471, 498, 519, 551, 582, 617, 649,
    680, 702, 729, 765, 782, 814, 853, 884,
    906, 933, 969, 996, 1018, 1035, 1049, 1088,
    1115, 1147, 1178 
];

const play = (cents) => {
    let fader = ctx.createGain();
    fader.connect(ctx.destination);
    fader.gain.value = 0;
  
    let osc = ctx.createOscillator();
    osc.frequency.value = 440 * cents;
    osc.connect(fader);
    osc.start();
    osc.stop(ctx.currentTime + 1.0); 
    fader.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
    fader.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
  }