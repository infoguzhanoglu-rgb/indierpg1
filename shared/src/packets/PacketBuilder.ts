/**
 * MMORPG Veri Yazıcı (Packet Builder)
 * Manuel byte ofseti ve boyut hesaplamalarını otomatikleştirir.
 */
export class PacketBuilder {
    private buffer: ArrayBuffer;
    private view: DataView;
    private offset: number = 0;
    private static textEncoder = new TextEncoder();

    constructor(initialSize: number = 64) {
        this.buffer = new ArrayBuffer(initialSize);
        this.view = new DataView(this.buffer);
    }

    private ensureCapacity(additionalBytes: number) {
        if (this.offset + additionalBytes > this.buffer.byteLength) {
            // Buffer'ı her seferinde 2 katına çıkar (Pool mantığına yakın)
            const newSize = Math.max(this.buffer.byteLength * 2, this.offset + additionalBytes);
            const newBuffer = new ArrayBuffer(newSize);
            const newView = new Uint8Array(newBuffer);
            newView.set(new Uint8Array(this.buffer));
            this.buffer = newBuffer;
            this.view = new DataView(this.buffer);
        }
    }

    public writeUint8(value: number): this {
        this.ensureCapacity(1);
        this.view.setUint8(this.offset++, value);
        return this;
    }

    public writeUint16(value: number): this {
        this.ensureCapacity(2);
        this.view.setUint16(this.offset, value, true);
        this.offset += 2;
        return this;
    }

    public writeUint32(value: number): this {
        this.ensureCapacity(4);
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
        return this;
    }

    public writeFloat32(value: number): this {
        this.ensureCapacity(4);
        this.view.setFloat32(this.offset, value, true);
        this.offset += 4;
        return this;
    }

    /**
     * Maksimum 255 karakterlik kısa metin (Uint8 length prefix)
     */
    public writeString8(text: string): this {
        const bytes = PacketBuilder.textEncoder.encode(text);
        this.writeUint8(bytes.length);
        this.ensureCapacity(bytes.length);
        new Uint8Array(this.buffer, this.offset, bytes.length).set(bytes);
        this.offset += bytes.length;
        return this;
    }

    /**
     * Uzun metinler için (Uint16 length prefix)
     */
    public writeString16(text: string): this {
        const bytes = PacketBuilder.textEncoder.encode(text);
        this.writeUint16(bytes.length);
        this.ensureCapacity(bytes.length);
        new Uint8Array(this.buffer, this.offset, bytes.length).set(bytes);
        this.offset += bytes.length;
        return this;
    }

    /**
     * Paketi finalize eder ve dolu olan kısmın buffer'ını döner.
     */
    public build(): ArrayBuffer {
        return this.buffer.slice(0, this.offset);
    }
}
