import './LoginUI.css';

export class LoginUI {
    private overlay: HTMLDivElement;
    private btnGuest: HTMLButtonElement;
    private userInput: HTMLInputElement;
    private statusText: HTMLParagraphElement;
    private onLogin?: (username: string) => void;

    constructor(onLogin: (username: string) => void) {
        this.onLogin = onLogin;

        // Mevcut DOM öğelerini bağlayalım (index.html'dekiler)
        this.overlay = document.getElementById('loginOverlay') as HTMLDivElement;
        this.btnGuest = document.getElementById('btnGuestLgn') as HTMLButtonElement;
        this.userInput = document.getElementById('usernameInput') as HTMLInputElement;
        this.statusText = document.getElementById('connStatus') as HTMLParagraphElement;

        this.initEvents();
    }

    private initEvents() {
        this.btnGuest.onclick = () => {
            const username = this.userInput.value.trim() || "Misafir";
            if (this.onLogin) this.onLogin(username);
        };

        // Enter tuşuyla da giriş yapılabilsin
        this.userInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.btnGuest.click();
            }
        };
    }

    /**
     * Alt kısımdaki durum metnini günceller
     */
    public setStatus(text: string, color: string = "#888") {
        this.statusText.innerText = text;
        this.statusText.style.color = color;
    }

    /**
     * Giriş başarılı olduğunda ekranı gizler
     */
    public hide() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
    }

    /**
     * Ekranı görünür yapar
     */
    public show() {
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }
    }
}
