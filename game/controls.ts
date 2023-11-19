const controlStyle = ['border', 'border-dark', 'my-3'];

export class ControlsElement {
    scoreElement: HTMLElement;
    scoreValue: number;
    stateSelect: HTMLSelectElement;
    resetBtn: HTMLButtonElement;
    nameInput: HTMLInputElement;
    scoreSubmit: HTMLButtonElement;

    constructor(parent: HTMLElement) {
        this.scoreElement = document.createElement('div');
        this.scoreValue = 0;
        this.styleMessage(this.scoreElement);
        parent.appendChild(this.scoreElement);
        this.score = 0;

        this.nameInput = document.createElement('input');
        this.styleInput(this.nameInput);
        this.nameInput.placeholder = 'Name';
        this.nameInput.type = 'text';
        this.nameInput.disabled = true;
        parent.appendChild(this.nameInput);

        this.scoreSubmit = document.createElement('button');
        this.styleButton(this.scoreSubmit);
        this.scoreSubmit.innerText = 'Submit Score';
        this.scoreSubmit.disabled = true;
        this.scoreSubmit.onclick = () => {
            if (!this.nameInput.value) {
                return;
            }
            fetch('./scoreboard/post', {
                method: 'POST',
                body: JSON.stringify({
                    'game': this.stateSelect.value,
                    'name': this.nameInput.value,
                    'score': Math.round(this.scoreValue),
                }),
            });
            this.nameInput.value = '';
            this.nameInput.disabled = true;
            this.scoreSubmit.disabled = true;
        };
        parent.appendChild(this.scoreSubmit);

        parent.appendChild(document.createElement('br'));
        parent.appendChild(document.createElement('br'));

        this.stateSelect = document.createElement('select');
        this.styleButton(this.stateSelect);
        this.stateSelect.classList.add('text-center');
        parent.appendChild(this.stateSelect);

        this.resetBtn = document.createElement('button');
        this.styleButton(this.resetBtn);
        this.resetBtn.innerText = 'Reset';
        parent.appendChild(this.resetBtn);
    }

    public reset() {
        this.score = 0;
        this.nameInput.disabled = true;
        this.scoreSubmit.disabled = true;
    }

    public get score(): number {
        return this.scoreValue;
    }

    public set score(v: number) {
        this.scoreValue = v;
        this.scoreElement.innerText = 'Score: ' + Math.round(this.scoreValue);
    }

    public enableScoreSubmit() {
        this.nameInput.disabled = false;
        this.scoreSubmit.disabled = false;
    }

    public setStates(states: any) {
        for (const s in states) {
            if (Object.prototype.hasOwnProperty.call(states, s)) {
                const sk = states[s];
                let option = document.createElement('option');
                option.value = s;
                option.innerText = sk;
                this.stateSelect.appendChild(option);
            }
        }
    }

    private styleButton(element: HTMLElement) {
        controlStyle.forEach(styleCLass => {
            element.classList.add(styleCLass);
        });
        element.classList.add('controls-button');
    }

    private styleMessage(element: HTMLElement) {
        controlStyle.forEach(styleCLass => {
            element.classList.add(styleCLass);
        });
        element.classList.add('controls-message', 'text-center', 'fw-bold', 'fs-4', 'py-5');
    }

    private styleInput(element: HTMLElement) {
        element.classList.add('controls-input');
    }
}