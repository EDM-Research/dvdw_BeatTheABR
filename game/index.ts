/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { ControlsElement } from "./controls";
import { GameElement } from "./game";
import { VideoElement } from "./video";

let videoparent = document.getElementById('video');
if (!videoparent) {
  throw Error('no video parent element');
}
let video = new VideoElement(videoparent,
  [
    // high to low
    './videos/360p.mp4',
    './videos/180p.mp4',
    './videos/90p.mp4',
    './videos/44p.mp4',
    // loading
    './videos/loading.mp4',
    // start
    './videos/loading.mp4',
  ]);

let controlsparent = document.getElementById('controls');
if (!controlsparent) {
  throw Error('no controls parent element');
}
let controls = new ControlsElement(controlsparent);

let gameparent = document.getElementById('abr');
  if (!gameparent) {
    throw Error('no abr parent element');
  }

let game = new GameElement(gameparent, video, controls);