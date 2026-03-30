import './ChatUI.css';
import { ContextMenu } from './ContextMenu';

export interface ChatMessage {
    username: string;
    content: string;
    time: string;
    isMe: boolean;
}

export class ChatUI {
    private container: HTMLDivElement;
    private tabsDiv: HTMLDivElement;
    private messagesDiv: HTMLDivElement;
    private inputField: HTMLInputElement;
    private onSendMessage?: (msg: string) => void;
    private onSendPrivateMessage?: (targetUsername: string, msg: string) => void;
    public onRainCommand?: (status: boolean) => void;
    public onNoticeCommand?: (msg: string) => void;

    private currentTab: string = 'Genel';
    private tabs: Map<string, { messages: ChatMessage[], unread: boolean }> = new Map();
    private localUsername: string = "Ben";

    constructor(
        onSendMessage: (msg: string) => void,
        onSendPrivateMessage: (target: string, msg: string) => void
    ) {
        this.onSendMessage = onSendMessage;
        this.onSendPrivateMessage = onSendPrivateMessage;

        this.tabs.set('Genel', { messages: [], unread: false });

        this.container = document.createElement('div');
        this.container.className = 'chat-container ui-master-panel';

        this.tabsDiv = document.createElement('div');
        this.tabsDiv.className = 'chat-tabs ui-sub-panel';
        this.container.appendChild(this.tabsDiv);

        this.messagesDiv = document.createElement('div');
        this.messagesDiv.className = 'chat-messages';
        this.container.appendChild(this.messagesDiv);

        const inputContainer = document.createElement('div');
        inputContainer.className = 'chat-input-container ui-sub-panel';

        this.inputField = document.createElement('input');
        this.inputField.id = 'chatInput';
        this.inputField.type = 'text';
        this.inputField.placeholder = 'Bir mesaj yaz... (PM: /kullanıcı mesaj)';
        this.inputField.autocomplete = 'off';

        inputContainer.appendChild(this.inputField);
        this.container.appendChild(inputContainer);

        document.body.appendChild(this.container);

        this.renderTabs();
        this.setupEvents();
    }

    public setLocalUsername(name: string) {
        this.localUsername = name;
    }

    public focusWithUser(username: string) {
        this.inputField.value = `/${username} `;
        this.inputField.focus();
    }

    private setupEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.activeElement !== this.inputField) {
                this.inputField.focus();
                e.preventDefault();
            }
        });

        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const rawValue = this.inputField.value.trim();
                if (rawValue !== '') {
                    this.processOutgoingMessage(rawValue);
                    this.inputField.value = '';
                }
                this.inputField.blur();
                e.stopPropagation();
            }
        });
    }

    private processOutgoingMessage(text: string) {
        if (text === '/rain on') { this.onRainCommand?.(true); this.addMessage("", "Yağmur sistemi aktif edildi."); return; }
        if (text === '/rain off') { this.onRainCommand?.(false); this.addMessage("", "Yağmur sistemi kapatıldı."); return; }

        if (text.startsWith('/n ')) {
            const msg = text.replace('/n ', '').trim();
            if (msg) this.onNoticeCommand?.(msg);
            return;
        }

        if (text.startsWith('/')) {
            const parts = text.slice(1).trim().split(/\s+/);
            if (parts.length >= 2) {
                const target = parts[0];
                const msg = parts.slice(1).join(' ');
                this.onSendPrivateMessage?.(target, msg);
                return;
            }
        }

        if (this.currentTab === 'Genel') {
            this.onSendMessage?.(text);
        } else {
            this.onSendPrivateMessage?.(this.currentTab, text);
            this.addPrivateMessage(this.currentTab, this.localUsername, text, true);
        }
    }

    private renderTabs() {
        this.tabsDiv.innerHTML = '';
        this.tabs.forEach((data, name) => {
            const tabEl = document.createElement('div');
            tabEl.className = 'chat-tab';
            if (name === this.currentTab) tabEl.classList.add('active');
            
            // YENİ: Okunmamış mesaj varsa kırmızı yap
            if (data.unread) {
                tabEl.classList.add('unread');
            }
            
            tabEl.innerText = name;
            tabEl.onclick = () => this.switchTab(name);
            tabEl.oncontextmenu = (e) => {
                e.preventDefault();
                if (name === 'Genel') return;
                ContextMenu.getInstance().show(e.clientX, e.clientY, name, [{ label: 'Kapat', action: () => this.closeTab(name) }]);
            };
            this.tabsDiv.appendChild(tabEl);
        });
    }

    private closeTab(name: string) {
        if (name === 'Genel') return;
        this.tabs.delete(name);
        if (this.currentTab === name) this.switchTab('Genel');
        else this.renderTabs();
    }

    public switchTab(name: string) {
        this.currentTab = name;
        const tabData = this.tabs.get(name);
        if (tabData) {
            tabData.unread = false; // Sekmeye geçince okunmamış işaretini kaldır
        }
        this.renderTabs();
        this.renderMessages();
    }

    private renderMessages() {
        this.messagesDiv.innerHTML = '';
        const tabData = this.tabs.get(this.currentTab);
        if (!tabData) return;
        tabData.messages.forEach(m => this.createMessageElement(m));
        this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
    }

    private createMessageElement(m: ChatMessage) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-message';
        const timeSpan = document.createElement('span');
        timeSpan.className = 'chat-time';
        timeSpan.innerText = `[${m.time}] `;
        const userSpan = document.createElement('span');
        userSpan.className = 'chat-username';
        if (m.isMe) userSpan.classList.add('chat-user-me');
        else if (this.currentTab === 'Genel') userSpan.classList.add('chat-user-genel');
        else userSpan.classList.add('chat-user-pm');
        userSpan.innerText = m.username ? `${m.username}:` : '';
        const contentSpan = document.createElement('span');
        contentSpan.innerText = ` ${m.content}`;
        msgDiv.appendChild(timeSpan);
        msgDiv.appendChild(userSpan);
        msgDiv.appendChild(contentSpan);
        this.messagesDiv.appendChild(msgDiv);
        this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
    }

    public addMessage(username: string, content: string) {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const isMe = username === this.localUsername;
        const msg: ChatMessage = { username, content, time, isMe };
        
        const tab = this.tabs.get('Genel')!;
        tab.messages.push(msg);
        
        if (this.currentTab === 'Genel') {
            this.createMessageElement(msg);
        } else {
            tab.unread = true; // Genel sekmesinde yeni mesaj var
            this.renderTabs();
        }
    }

    public addPrivateMessage(conversationPartner: string, senderName: string, content: string, fromMe: boolean) {
        if (!this.tabs.has(conversationPartner)) {
            this.tabs.set(conversationPartner, { messages: [], unread: false });
        }

        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const msg: ChatMessage = { username: senderName, content, time, isMe: fromMe };
        
        const tabData = this.tabs.get(conversationPartner)!;
        tabData.messages.push(msg);

        // YENİ: Eğer mesaj benden gidiyorsa OTOMATİK o sekmeye geç
        if (fromMe) {
            this.switchTab(conversationPartner);
        } else if (this.currentTab !== conversationPartner) {
            // Başkasından geliyorsa ve o sekmede değilsek sekme ismini kırmızı yap
            tabData.unread = true;
            this.renderTabs();
        } else {
            // O sekmedeysek direkt mesajı ekle
            this.createMessageElement(msg);
        }
    }

    public openPrivateTab(username: string) {
        if (!this.tabs.has(username)) {
            this.tabs.set(username, { messages: [], unread: false });
        }
        this.switchTab(username);
    }

    public setVisible(visible: boolean) {
        this.container.style.display = visible ? 'flex' : 'none';
    }
}
