/**
 * Veri Okuyucu (Safe Packet Reader)
 * Buffer dışına erişimi denetler ve hata fırlatır.
 */
export class PacketReader {
    private view: DataView;
    private offset: number = 0;
    private static textDecoder = new TextDecoder();

    constructor(data: ArrayBuffer | Uint8Array) {
        if (data instanceof ArrayBuffer) {
            this.view = new DataView(data);
        } else {
            // Uint8Array veya Node.js Buffer handling
            this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        }
    }

    private checkAccess(bytes: number) {
        if (this.offset + bytes > this.view.byteLength) {
            throw new Error(`[PacketReader] Buffer Overflow: Limit ${this.view.byteLength}, Attempt ${this.offset + bytes}`);
        }
    }

    public readUint8(): number {
        this.checkAccess(1);
        return this.view.getUint8(this.offset++);
    }

    public readUint16(): number {
        this.checkAccess(2);
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    public readUint32(): number {
        this.checkAccess(4);
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    public readFloat32(): number {
        this.checkAccess(4);
        const value = this.view.getFloat32(this.offset, true);
        this.offset += 4;
        return value;
    }

    public readString8(): string {
        const len = this.readUint8();
        this.checkAccess(len);
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
        const text = PacketReader.textDecoder.decode(bytes);
        this.offset += len;
        return text;
    }

    public readString16(): string {
        const len = this.readUint16();
        this.checkAccess(len);
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
        const text = PacketReader.textDecoder.decode(bytes);
        this.offset += len;
        return text;
    }

    public get currentOffset() { return this.offset; }
    public get eof() { return this.offset >= this.view.byteLength; }
}
