import { ChatUI } from '../ui/ChatUI';

export class ChatSystem {
    private chatUI: ChatUI;

    constructor(chatUI: ChatUI) {
        this.chatUI = chatUI;
    }

    public initiatePrivateMessage(username: string) {
        this.chatUI.focusWithUser(username);
    }
}
