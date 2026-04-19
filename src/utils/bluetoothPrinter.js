// Utility untuk mencetak ke Printer Thermal Bluetooth via Web Bluetooth API
// Menggunakan standar perintah ESC/POS

const CMDS = {
    RESET: '\x1B\x40',
    TEXT_FORMAT: '\x1B\x21', // + byte (0=normal, 16=double height, 32=double width)
    ALIGN_LEFT: '\x1B\x61\x00',
    ALIGN_CENTER: '\x1B\x61\x01',
    ALIGN_RIGHT: '\x1B\x61\x02',
    BOLD_ON: '\x1B\x45\x01',
    BOLD_OFF: '\x1B\x45\x00',
    LF: '\x0A', // Line Feed (Ganti Baris)
    CUT: '\x1D\x56\x41\x00', // Potong Kertas (jika support)
};

export const BluetoothPrinter = {
    device: null,
    characteristic: null,

    // 1. KONEKSI KE PRINTER
    async connect() {
        try {
            console.log('Mencari perangkat Bluetooth...');
            // Meminta user memilih perangkat (Wajib User Gesture)
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // UUID umum printer thermal
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });

            this.device = device;

            // Connect ke GATT Server
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            this.characteristic = characteristic;
            console.log('Printer Terhubung:', device.name);
            return device.name;

        } catch (error) {
            console.error('Gagal koneksi bluetooth:', error);
            throw error;
        }
    },

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }
        this.device = null;
        this.characteristic = null;
    },

    isConnected() {
        return this.device && this.device.gatt.connected;
    },

    // 2. ENCODER (Text -> ESC/POS Bytes)
    encode(text) {
        const encoder = new TextEncoder();
        return encoder.encode(text);
    },

    // 3. FUNGSI CETAK STRUK UTAMA
    async printReceipt(data) {
        if (!this.characteristic) {
            throw new Error("Printer tidak terhubung. Buka Pengaturan -> Printer.");
        }

        try {
            let receipt = '';

            // --- HEADER ---
            receipt += CMDS.RESET;
            receipt += CMDS.ALIGN_CENTER;
            receipt += CMDS.BOLD_ON;
            receipt += (data.outlet_info?.name || 'CAFE 86') + CMDS.LF;
            receipt += CMDS.BOLD_OFF;
            receipt += (data.outlet_info?.address || '-') + CMDS.LF;
            receipt += (data.outlet_info?.phone || '-') + CMDS.LF;
            receipt += '--------------------------------' + CMDS.LF;

            // --- INFO ---
            receipt += CMDS.ALIGN_LEFT;
            receipt += `No: ${data.invoice_no}` + CMDS.LF;
            receipt += `Tgl: ${data.date}` + CMDS.LF;
            receipt += `Kasir: ${data.cashier_name}` + CMDS.LF;
            receipt += '--------------------------------' + CMDS.LF;

            // --- ITEM ---
            // Pastikan data.items ada dan berupa array
            if (data.items && data.items.length > 0) {
                data.items.forEach(item => {
                    receipt += `${item.name}` + CMDS.LF;
                    const qtyPrice = `${item.qty} x ${parseInt(item.price).toLocaleString('id-ID')}`;
                    const subtotal = (item.qty * item.price).toLocaleString('id-ID');

                    receipt += `${qtyPrice} = ${subtotal}` + CMDS.LF;

                    // Varian/Modifier
                    if (item.variant_name) receipt += `  + ${item.variant_name}` + CMDS.LF;
                    if (item.modifiers_name) {
                        // Cek jika modifiers_name string JSON atau array
                        let mods = item.modifiers_name;
                        if (typeof mods === 'string') {
                            try { mods = JSON.parse(mods); } catch (e) { mods = []; }
                        }
                        if (Array.isArray(mods)) {
                            mods.forEach(mod => receipt += `  + ${mod}` + CMDS.LF);
                        }
                    }
                });
            }

            receipt += '--------------------------------' + CMDS.LF;

            // --- TOTAL ---
            receipt += CMDS.ALIGN_RIGHT;
            receipt += `Subtotal: ${parseInt(data.sub_total).toLocaleString('id-ID')}` + CMDS.LF;
            if (data.discount_amount > 0) receipt += `Diskon: -${parseInt(data.discount_amount).toLocaleString('id-ID')}` + CMDS.LF;
            if (data.redeem_value > 0) receipt += `Poin: -${parseInt(data.redeem_value).toLocaleString('id-ID')}` + CMDS.LF;
            if (data.tax > 0) receipt += `Pajak: ${parseInt(data.tax).toLocaleString('id-ID')}` + CMDS.LF;
            if (data.service_charge > 0) receipt += `Service: ${parseInt(data.service_charge).toLocaleString('id-ID')}` + CMDS.LF;

            receipt += CMDS.BOLD_ON;
            receipt += `TOTAL: ${parseInt(data.total_amount).toLocaleString('id-ID')}` + CMDS.LF;
            receipt += CMDS.BOLD_OFF;

            receipt += `Bayar (${data.payment_method}): ${parseInt(data.cash_received || data.total_amount).toLocaleString('id-ID')}` + CMDS.LF;
            if (data.change > 0) receipt += `Kembali: ${parseInt(data.change).toLocaleString('id-ID')}` + CMDS.LF;

            // --- FOOTER ---
            receipt += CMDS.LF;
            receipt += CMDS.ALIGN_CENTER;
            receipt += (data.outlet_info?.receipt_footer || 'Terima Kasih') + CMDS.LF;
            receipt += CMDS.LF + CMDS.LF + CMDS.LF; // Feed kertas

            // KIRIM KE PRINTER DENGAN CHUNKING & DELAY
            const encoded = this.encode(receipt);

            // UPDATE: Ukuran chunk diperkecil menjadi 50 byte (default BLE MTU aman sekitar 20-100)
            // Jika terlalu besar, paket akan drop.
            const chunkSize = 50;

            for (let i = 0; i < encoded.length; i += chunkSize) {
                const chunk = encoded.slice(i, i + chunkSize);
                await this.characteristic.writeValue(chunk);

                // UPDATE: Tambahkan delay 50ms antar paket agar buffer printer tidak penuh
                await new Promise(resolve => setTimeout(resolve, 50));
            }

        } catch (error) {
            console.error("Print Error:", error);
            throw error;
        }
    }
};