// One grid for picture, score and sound: 96 BPM, 4/4, bar = 2.5 s. Bar 1 starts at 0.
export const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;
export const at = (bar, beat = 1) => (bar - 1) * BAR + (beat - 1) * BEAT;

export const T = {
  open: 0,                 // 1  low wide: storm wall over the last field (gust, horn call)
  tag1: at(1, 3),          //    tagline in
  cut2: at(3),             // 2  5.0  the hero, the gesture
  dip: at(3, 2),           //    anticipation (arm drops)
  point: at(3, 3),         //    6.25 the arm snaps up: the call (ostinato enters)
  cut3: at(5),             // 3  10.0 reapers on the beat
  tag2: at(5, 2),
  whip4: at(6),            // 4  12.5 whip to the wagon, sheaves tossed
  toss: [at(6, 1.5), at(6, 3.5)],
  whip5: at(7),            // 5  15.0 whip to the sky: the sun goes under
  bolt: at(7, 3),          //    lightning
  cut6: at(8),             // 6  17.5 silence: push to her profile
  drop: at(10, 4),         //    24.38 the first drop on her cheek
  cut7: at(11),            // 7  25.0 the last sheaf
  breath: at(12),          //    27.5 one beat of held breath
  lift: at(12, 2),         //    28.13 the sheaf goes up, the light breaks
  whip8: at(14),           // 8  32.5 whip out to the poster
  title: at(14, 3),        //    title letters bounce in on eighths
  chord: at(15),           //    35.0 final chord
  end: at(17),             //    40.0
};
export const DUR = T.end;
