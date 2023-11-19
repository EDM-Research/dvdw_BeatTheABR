export class VideoElement {
    videos: HTMLVideoElement[];
    sources: string[];

    current: number;
    time: number;
    max: number;
    loading: number;
    boot: number;

    constructor(parent: any, sources: string[]) {
        this.sources = sources;

        this.videos = [];
        for (let i = 0; i < this.sources.length; i++) {
            const vs = this.sources[i];

            let vid = document.createElement('video');
            vid.src = vs;
            vid.poster = './videos/blank.png';
            vid.style.display = ' none';
            vid.muted = true; //TODO
            //loading
            if (i === this.sources.length - 2) {
                vid.muted = true;
                vid.loop = true;
            }
            //boot
            if (i === this.sources.length - 1) {
                vid.poster = './videos/logo.png';
                vid.muted = true;
                vid.loop = true;
            }

            parent.appendChild(vid);
            this.videos.push(vid);
        }

        this.max = this.sources.length - 2;
        this.loading = this.sources.length - 2;
        this.boot = this.sources.length - 1;

        this.current = this.boot;
        this.time = 0;

        this.load();
    }

    public reset() {
        this.videos.forEach(v => {
            v.load();
            v.style.display = 'none';
        });

        this.current = this.boot;

        this.load();
    }

    public play() {
        // console.log(this.current);
        this.videos.forEach(v => {
            v.pause();
            v.style.display = 'none';
        });
        let vid = this.videos[this.current];
        vid.style.display = 'block';
        try {
            vid.play();
        } catch {
            console.warn('play error');
        }
    }

    public pause() {
        // console.log(this.current);
        this.videos.forEach(v => {
            v.pause();
            v.style.display = 'none';
        });
        let vid = this.videos[this.current];
        vid.style.display = 'block';
        try {
            vid.pause();
        } catch {
            console.warn('play error');
        }
    }

    public load() {
        // console.log(this.current);
        this.videos.forEach(v => {
            v.pause();
            v.style.display = 'none';
        });
        let vid = this.videos[this.current];
        vid.style.display = 'block';
        try {
            vid.load();
        } catch {
            console.warn('load error');
        }
    }

    public change(to: number) {
        if (to === this.current) {
            return;
        }
        let from = this.current;
        // console.log(from, to);
        this.current = to;
        let fvid = this.videos[from];
        let tvid = this.videos[to];
        if (from < this.max) {
            this.time = fvid.currentTime;
        }
        tvid.currentTime = this.time;
        if (fvid.paused) {
            tvid.pause();
        } else {
            tvid.play();
        }
        fvid.style.display = 'none';
        tvid.style.display = 'block';
        fvid.pause();
    }
}
