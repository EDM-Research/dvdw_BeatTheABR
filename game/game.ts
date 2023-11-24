import { ControlsElement } from "./controls";
import { VideoElement } from "./video";
import * as ph from "phaser";

const Height = 400;
const Width = 888;
const Margin = 75;

export class GameElement {
    video: VideoElement;
    controls: ControlsElement;
    engine: ph.Game;

    state: string;

    constructor(parent: HTMLElement, video: VideoElement, controls: ControlsElement) {
        this.video = video;
        this.controls = controls;

        let states: any = {
            'demo': 'Demo',
            'flappy': 'Flappy ABR',
            'karaoke': 'Bit Rate Optimizer',
        };

        // setup controls
        this.controls.resetBtn.onclick = () => { this.reset(); };
        this.controls.setStates(states);
        this.controls.stateSelect.onchange = () => {
            let nstate = this.controls.stateSelect.selectedOptions[0].value;
            this.engine.scene.switch(this.state, nstate);
            this.state = nstate;

            this.reset();
        };

        this.controls.setDifficulties(['Easy', 'Medium', 'Hard']);

        this.engine = new ph.Game({
            width: Width,
            height: Height,
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false,
                }
            },
            parent: parent,
        });

        this.engine.scene.add('karaoke', new KaraokeScene(this));
        this.engine.scene.add('flappy', new FlappyScene(this));
        this.engine.scene.add('demo', new DemoScene(this), true);
        this.state = 'demo';
    }

    public reset() {
        this.video.reset();
        this.controls.reset();

        (<Scene>this.engine.scene.getScene(this.state)).reset();
    }
}

class Scene extends ph.Scene {
    public reset(): void {
        console.error('missing reset() implementation');
    }
}

const Beige = 0xfadab4;
const Brown = 0x8e4a27;
const Sand = 0xf8b860;
const Yellow = 0xf8f400;
const White = 0xffffff;
const Black = 0x000000;
const Red = 0xe60115;
const Blue = 0x2cbbe5;
const DarkBlue = 0x005ca9;
const Green = 0x00a962;

class DemoScene extends Scene {
    ge: GameElement;

    lineGraphics: ph.GameObjects.Graphics | undefined;
    lineActiveGraphics: ph.GameObjects.Graphics | undefined;

    lines: ph.Geom.Line[];
    pointerPlay: ph.GameObjects.Sprite | undefined;
    pointerPause: ph.GameObjects.Sprite | undefined;

    playing: boolean;
    current: number;

    static readonly PointerX = Width / 3;

    constructor(game: GameElement) {
        super();
        this.ge = game;

        this.lines = [];
        this.playing = false;
        this.current = this.ge.video.max - 1;
    }

    public init() {
        this.cameras.main.setBackgroundColor(Blue);

        this.lineGraphics = this.add.graphics({ lineStyle: { width: 4, color: Yellow } });
        this.lineActiveGraphics = this.add.graphics({ lineStyle: { width: 4, color: Red } });
    }

    public preload() {
        this.load.image('play', './assets/play.png');
        this.load.image('pause', './assets/pause.png');
    }

    public create() {
        // setup quality lines
        const lineHeight = (Height - 2 * Margin) / (this.ge.video.max - 1);

        for (let i = 0; i < this.ge.video.max; i++) {

            const h = Margin + i * lineHeight;
            const l = new Phaser.Geom.Line(0, h, Width, h);

            this.lines?.push(l);

            if (i === 0) {
                this.add.text(10, h, 'High Quality', { fontSize: 30, color: Black.toString() });
            } else if (i === this.ge.video.max - 1) {
                this.add.text(10, h, 'Low Quality', { fontSize: 30, color: Black.toString() });
            }
        }

        this.pointerPlay = this.add.sprite(100, 100, 'play');
        this.pointerPause = this.add.sprite(100, 100, 'pause');

        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            let index = this.current;

            if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.SPACE) {
                event.preventDefault();
                this.playing = !this.playing;
                if (this.playing) {
                    this.ge.video.change(this.current);
                    this.ge.video.play();
                } else {
                    this.ge.video.change(this.ge.video.loading);
                }
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.UP) {
                event.preventDefault();
                index = Math.max(0, this.current - 1);
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.DOWN) {
                event.preventDefault();
                index = Math.min(this.ge.video.max - 1, this.current + 1);
            }

            if (index !== this.current) {
                this.ge.video.change(index);
                this.current = index;
            }
        });
    }

    public reset() {
        this.playing = false;
        this.current = this.ge.video.max - 1;
    }

    public update(time: number, delta: number): void {
        this.lineGraphics?.clear();
        this.lineActiveGraphics?.clear();

        let currentY = 0;

        for (let i = 0; i < this.lines.length; i++) {
            const l = this.lines[i];
            if (i === this.current) {
                this.lineActiveGraphics?.strokeLineShape(l);
                currentY = l.y1;
            } else {
                this.lineGraphics?.strokeLineShape(l);
            }
        }

        if (this.playing) {
            this.pointerPause?.setVisible(false);
            this.pointerPlay?.setVisible(true);

            this.pointerPlay?.setPosition(DemoScene.PointerX, currentY);
        } else {
            this.pointerPlay?.setVisible(false);
            this.pointerPause?.setVisible(true);

            this.pointerPause?.setPosition(DemoScene.PointerX, currentY);
        }
    }
}

class FlappyScene extends Scene {
    ge: GameElement;

    bird: ph.Physics.Arcade.Sprite | undefined;
    ceiling: ph.Types.Physics.Arcade.ImageWithStaticBody | undefined;
    ground: ph.Types.Physics.Arcade.ImageWithStaticBody | undefined;
    ceilingPipes: ph.Types.Physics.Arcade.ImageWithDynamicBody[];
    groundPipes: ph.Types.Physics.Arcade.ImageWithDynamicBody[];
    timerText: ph.GameObjects.Text | undefined;

    started: boolean;
    firstStart: boolean;
    ended: boolean;
    timer: number;
    lastJump: number;
    bufferTime: number;
    lqTime: number;

    diffMod: number;

    static readonly CeilingGroundHeight = Height / 20;

    static readonly GameTime = 60 * 1000;

    static readonly JumpTime = 500;
    static readonly Jump = 300;
    static readonly Gravity = 0.5918;

    static readonly PipeStart = 500;
    static readonly PipeBuffer = 100;
    static readonly PipeSpacer = 100;
    static readonly PipeWidth = 100;
    static readonly PipeDMin = 100;
    static readonly PipeDMax = 100;

    static readonly BufferTime = 200;

    constructor(game: GameElement) {
        super();
        this.ge = game;

        this.ceilingPipes = [];
        this.groundPipes = [];

        this.started = false;
        this.firstStart = false;
        this.ended = false;
        this.timer = FlappyScene.GameTime;
        this.lastJump = 0;
        this.bufferTime = 0;
        this.lqTime = 0

        this.diffMod = 1;
    }

    public init() {
        this.cameras.main.setBackgroundColor(Blue);
    }

    public preload() {
        this.load.image('bird1', './assets/bird1.png');
        this.load.image('bird2', './assets/bird2.png');
        this.load.image('green', './assets/green.png');
        this.load.image('green50', './assets/green50.png');
        this.load.image('red', './assets/red.png');
        this.load.image('red50', './assets/red50.png');
    }

    public create() {
        this.ceiling = this.physics.add.staticImage(0, 0, 'red');
        this.ceiling.setScale(Width, FlappyScene.CeilingGroundHeight);
        this.ceiling.setOrigin(0, 0);
        this.ceiling.body.updateFromGameObject();

        this.ground = this.physics.add.staticImage(0, Height - FlappyScene.CeilingGroundHeight, 'green');
        this.ground.setScale(Width, FlappyScene.CeilingGroundHeight);
        this.ground.setOrigin(0, 0);
        this.ground.body.updateFromGameObject();

        this.anims.create({
            key: 'fly',
            frames: [
                { key: 'bird1' },
                { key: 'bird2' },
            ],
            frameRate: 12,
            repeat: -1
        });
        this.bird = this.physics.add.sprite(Width / 3, Height / 2, 'bird1').play('fly');
        this.bird.body?.setCircle(17, 20, 15);

        this.timerText = this.add.text(10, 20, 'Time Left: ', { fontSize: 30, color: Black.toString() });

        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.SPACE && !this.ended) {
                event.preventDefault();
                this.started = true;
                if (Date.now() - this.lastJump > FlappyScene.JumpTime) {
                    this.bird?.setVelocityY(-FlappyScene.Jump);
                    //this.bird?.setAccelerationY(FlappyScene.Gravity);

                    this.lastJump = Date.now();
                }
            } else if ([Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.TAB].includes(event.keyCode)) {
                event.preventDefault();
            }
        });
    }

    public reset() {
        this.started = false;
        this.firstStart = false;
        this.ended = false;
        this.timer = FlappyScene.GameTime;
        this.lastJump = 0;
        this.bufferTime = 0;
        this.lqTime = 0;

        [this.ceilingPipes, this.groundPipes].forEach((pipes) => {
            pipes.forEach((p) => {
                p.destroy();
            })
        });

        this.ceilingPipes = [];
        this.groundPipes = [];

        this.bird?.setPosition(Width / 3, Height / 2);
        this.bird?.setVelocityY(0);
    }

    public update(time: number, delta: number): void {
        this.timerText?.setText('Time left: ' + Math.round(this.timer / 1000) + 's');

        if (this.started) {
            if (!this.firstStart) {
                this.firstStart = true;
                this.ge.video.change(0);
                this.ge.video.play();

                switch (this.ge.controls.difficultySelect.selectedOptions[0].value) {
                    case 'Easy':
                        this.diffMod = 1;
                        break;
                    case 'Medium':
                        this.diffMod = 2;
                        break;
                    case 'Hard':
                        this.diffMod = 3;
                        break;

                    default:
                        this.diffMod = 1;
                        break;
                }
            }
            this.bird?.setVelocityY(Math.min(<number>this.bird.body?.velocity.y + FlappyScene.Gravity * delta, FlappyScene.Jump));

            [this.ceilingPipes, this.groundPipes].forEach((pipes) => {
                pipes.forEach(p => {
                    p.setVelocityX(-100 * this.diffMod);
                });
            });

            this.timer -= delta;
            if (this.timer <= 0) {
                this.timer = 0;
                this.started = false;
                this.ended = true;
                this.ge.video.pause();

                //setup end
                this.ge.controls.enableScoreSubmit();
            }

            this.bufferTime -= delta;
            //@ts-ignore
            if (this.physics.world.collide(this.bird, this.ceiling) || this.physics.world.overlap(this.bird, this.ceilingPipes)) {
                this.bufferTime = FlappyScene.BufferTime;
            }

            this.lqTime -= delta;
            //@ts-ignore
            if (this.physics.world.collide(this.bird, this.ground) || this.physics.world.overlap(this.bird, this.groundPipes)) {
                this.lqTime = FlappyScene.BufferTime;
            }

            if (this.bufferTime > 0) {
                this.ge.video.change(this.ge.video.loading);
            } else if (this.lqTime > 0) {
                this.ge.video.change(this.ge.video.max - 1);
            } else {
                this.ge.video.change(0);
                this.ge.controls.score += delta * this.diffMod / 1000;
            }

            // //@ts-ignore
            // if (this.physics.world.overlap(this.bird, this.ceilingPipes)) {
            //     this.ge.video.change(this.ge.video.loading);
            // }

            // //@ts-ignore
            // if (this.physics.world.overlap(this.bird, this.groundPipes)) {
            //     this.ge.video.change(this.ge.video.max - 1);
            // }
        } else {
            this.bird?.setVelocityY(0);
            [this.ceilingPipes, this.groundPipes].forEach((pipes) => {
                pipes.forEach(p => {
                    p.setVelocityX(0);
                });
            });
        }

        let rm = false;
        let np = false;
        [this.ceilingPipes, this.groundPipes].forEach((pipes) => {
            if (pipes.length === 0) { np = true; }
            for (let i = 0; i < pipes.length; i++) {
                const p = pipes[i];
                if (i === 0) {
                    if (p.body.position.x + p.body.width < 0) {
                        rm = true;
                    }
                }

                if (i === pipes.length - 1) {
                    if (p.body.position.x + p.body.width < Width + FlappyScene.PipeBuffer) {
                        np = true;
                    }
                }
            }
        });

        if (rm) {
            [this.ceilingPipes, this.groundPipes].forEach((pipes) => {
                pipes[0].destroy();
                pipes = pipes.splice(0, 1);
            });
        }

        if (np) {
            let rnd = ph.Math.RandomXYZ(new ph.Math.Vector3()).add(new ph.Math.Vector3(1, 1, 1)).divide(new ph.Math.Vector3(2, 2, 2));
            let end: ph.Types.Physics.Arcade.ImageWithDynamicBody | undefined = this.ceilingPipes[this.ceilingPipes.length - 1];
            let nx = FlappyScene.PipeStart;
            if (end && end.body.position.x + end.body.width > FlappyScene.PipeStart) {
                nx = end.body.position.x + end.body.width + FlappyScene.PipeSpacer;
            }

            let w = FlappyScene.PipeWidth + FlappyScene.PipeWidth * rnd.z;

            //celing
            let cp = this.physics.add.image(nx, 0, 'red50');
            let cy = rnd.x / 2 * Height;
            cp.setScale(w, cy);
            cp.setOrigin(0, 0);
            cp.body.updateFromGameObject();
            this.ceilingPipes.push(cp);

            //ground
            let gy = FlappyScene.PipeDMin + ph.Math.Between(0, FlappyScene.PipeDMax);
            let gp = this.physics.add.image(nx, cy + gy, 'green50');
            gp.setScale(w, Height - gy);
            gp.setOrigin(0, 0);
            gp.body.updateFromGameObject();
            this.groundPipes.push(gp);
        }
    }
}

class KaraokeScene extends Scene {
    ge: GameElement;

    lineGraphics: ph.GameObjects.Graphics | undefined;
    lineActiveGraphics: ph.GameObjects.Graphics | undefined;
    timerText: ph.GameObjects.Text | undefined;

    lines: ph.Geom.Line[];
    pointerPlay: ph.Physics.Arcade.Sprite | undefined;

    errors: ph.Types.Physics.Arcade.ImageWithDynamicBody[];
    users: ph.Types.Physics.Arcade.SpriteWithDynamicBody[];
    chances: number[];

    current: number;
    timer: number;
    bufferTime: number;

    started: boolean;
    firstStart: boolean;
    ended: boolean;

    diffMod: number;

    static readonly GameTime = 60 * 1000;

    static readonly PointerX = Width / 5;

    static readonly ErrorStart = Width;
    static readonly ErrorBuffer = 50;
    static readonly ErrorSpacer = 100;

    static readonly ErrorChance = 0.5;

    static readonly BufferTime = 200;

    constructor(game: GameElement) {
        super();
        this.ge = game;
        this.lines = [];

        this.errors = [];
        this.users = [];
        this.chances = [];

        this.current = 0;
        this.timer = FlappyScene.GameTime;
        this.bufferTime = 0;

        this.started = false;
        this.firstStart = true;
        this.ended = false;

        this.diffMod = 1;
    }

    public reset() {
        this.current = 0;
        this.timer = FlappyScene.GameTime;
        this.bufferTime = 0;

        this.started = false;
        this.firstStart = true;
        this.ended = false;

        this.errors.forEach((e) => { e.destroy(); });
        this.errors = [];

        this.users.forEach((e) => { e.destroy(); });
        this.users = [];

        this.diffMod = 1;
    }

    public init() {
        this.cameras.main.setBackgroundColor(Blue);

        this.lineGraphics = this.add.graphics({ lineStyle: { width: 4, color: Yellow } });
        this.lineActiveGraphics = this.add.graphics({ lineStyle: { width: 4, color: Red } });
    }

    public preload() {
        this.load.image('play', './assets/play.png');
        this.load.image('angry', './assets/angry.png');

        this.load.image('red50', './assets/red50.png');
    }

    public create() {
        // setup quality lines
        const lineHeight = (Height - 2 * Margin) / (this.ge.video.max - 1);

        for (let i = 0; i < this.ge.video.max; i++) {

            const h = Margin + i * lineHeight;
            const l = new Phaser.Geom.Line(0, h, Width, h);

            this.lines?.push(l);

            if (i === 0) {
                this.chances.push(KaraokeScene.ErrorChance);
            } else if (i < this.ge.video.max - 1) {
                this.chances.push(this.chances[i - 1] + ((1 - this.chances[i - 1]) * KaraokeScene.ErrorChance));
            }
        }
        this.chances.push(1);

        this.pointerPlay = this.physics.add.sprite(100, 100, 'play');

        this.timerText = this.add.text(10, 20, 'Time Left: ', { fontSize: 30, color: Black.toString() });

        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            let index = this.current;

            if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.SPACE && !this.ended) {
                event.preventDefault();
                this.started = true;
                this.ge.video.change(this.current);
                this.ge.video.play();
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.UP && !this.ended) {
                event.preventDefault();
                index = Math.max(0, this.current - 1);
            } else if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.DOWN && !this.ended) {
                event.preventDefault();
                index = Math.min(this.ge.video.max - 1, this.current + 1);
            } else if ([Phaser.Input.Keyboard.KeyCodes.LEFT, Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.TAB].includes(event.keyCode)) {
                event.preventDefault();
            }

            if (index !== this.current) {
                if (this.started) {
                    this.ge.video.change(index);
                }
                this.current = index;
            }
        });
    }

    public update(time: number, delta: number): void {
        this.lineGraphics?.clear();
        this.lineActiveGraphics?.clear();

        this.timerText?.setText('Time left: ' + Math.round(this.timer / 1000) + 's');

        let currentY = 0;

        for (let i = 0; i < this.lines.length; i++) {
            const l = this.lines[i];
            if (i === this.current) {
                this.lineActiveGraphics?.strokeLineShape(l);
                currentY = l.y1;
            } else {
                this.lineGraphics?.strokeLineShape(l);
            }
        }

        this.pointerPlay?.setPosition(KaraokeScene.PointerX, currentY);

        if (this.started) {
            if (this.firstStart) {
                this.firstStart = false;

                switch (this.ge.controls.difficultySelect.selectedOptions[0].value) {
                    case 'Easy':
                        this.diffMod = 1;
                        break;
                    case 'Medium':
                        this.diffMod = 2;
                        break;
                    case 'Hard':
                        this.diffMod = 3;
                        break;

                    default:
                        this.diffMod = 1;
                        break;
                }
            }

            this.timer -= delta;
            if (this.timer <= 0) {
                this.timer = 0;
                this.started = false;
                this.ended = true;
                this.ge.video.pause();

                //setup end
                this.ge.controls.enableScoreSubmit();
            }

            this.bufferTime -= delta;
            if (this.physics.world.overlap(this.pointerPlay, this.errors)) {
                this.bufferTime = Math.max(this.bufferTime, KaraokeScene.BufferTime * (this.ge.video.max - this.current));
            }

            if (this.bufferTime > 0) {
                this.ge.video.change(this.ge.video.loading);
            } else {
                this.ge.video.change(this.current);
                this.ge.controls.score += delta * this.diffMod * (this.ge.video.max - this.current) / 1000;
            }

            if (this.physics.world.overlap(this.pointerPlay, this.users)) {
                for (let i = 0; i < this.users.length; i++) {
                    const u = this.users[i];
                    if (this.physics.world.overlap(this.pointerPlay, u)) {
                        u.setVisible(false);
                        u.setY(Height * 2);
                        this.ge.controls.score -= 50;
                        break;
                    } else {
                        //
                    }
                }
            }

            let newest = this.errors[this.errors.length - 1];
            if (!newest || newest.body.position.x + newest.body.width < Width + KaraokeScene.ErrorBuffer) {
                //new error
                let rnd = ph.Math.RandomXYZ(new ph.Math.Vector3()).add(new ph.Math.Vector3(1, 1, 1)).divide(new ph.Math.Vector3(2, 2, 2));
                let index = this.chances.findIndex((v: number) => { return v >= rnd.x; });

                let nx = KaraokeScene.ErrorStart;
                if (newest && newest.body.position.x + newest.body.width > KaraokeScene.ErrorStart) {
                    nx = newest.body.position.x + newest.body.width + KaraokeScene.ErrorSpacer;
                }

                let height = 0;
                if (index < this.ge.video.max - 1) {
                    height = this.lines[index].y1 + 20;
                }

                let cp = this.physics.add.image(nx, 0, 'red50');
                cp.setScale(KaraokeScene.ErrorSpacer, height);
                cp.setOrigin(0, 0);
                cp.body.updateFromGameObject();
                cp.setVelocityX(-100 * this.diffMod);
                this.errors.push(cp);

                if (index !== 2 && rnd.y > 0.5) {
                    let us = this.physics.add.sprite(nx, this.lines[this.ge.video.max - 1].y1 - 50, 'angry');
                    us.setOrigin(0, 0);
                    us.body.updateFromGameObject();
                    us.setVelocityX(-100 * this.diffMod);
                    this.users.push(us);
                }
            }

            let oldest = this.errors[0];
            if (oldest && oldest.body.position.x + oldest.body.width < 0 - KaraokeScene.ErrorSpacer) {
                this.errors[0].destroy();
                this.errors.shift();
            }

            let oldestU = this.users[0];
            if (oldestU && oldestU.body.position.x + oldestU.body.width < 0 - KaraokeScene.ErrorSpacer) {
                this.users[0].destroy();
                this.users.shift();
            }

        } else {
            this.errors.forEach((e) => { e.setVelocityX(0); e.setVelocityY(0); });
            this.users.forEach((e) => { e.setVelocityX(0); e.setVelocityY(0); });
        }
    }
}