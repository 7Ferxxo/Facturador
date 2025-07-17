require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

let db;

(async () => {
    db = await open({
        filename: './recibos.db',
        driver: sqlite3.Database
    });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS recibos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente TEXT NOT NULL,
            casillero TEXT,
            sucursal TEXT,
            monto REAL NOT NULL,
            concepto TEXT,
            metodo_pago TEXT,
            fecha TEXT,
            email_cliente TEXT
        )
    `);
})();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post('/crear-factura', async (req, res) => {
    try {
        const datos = req.body;
        await db.run(
            'INSERT INTO recibos (cliente, casillero, sucursal, monto, concepto, metodo_pago, fecha, email_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [datos.cliente, datos.casillero, datos.sucursal, datos.monto, datos.concepto, datos.metodo_pago, datos.fecha, datos.email_cliente]
        );
        console.log('Recibo guardado en la base de datos.');

        const htmlTemplate = fs.readFileSync(path.join(__dirname, 'recibo-template.html'), 'utf-8');
        const cssTemplate = fs.readFileSync(path.join(__dirname, 'recibo-style.css'), 'utf-8');
        const logoPath = path.join(__dirname, 'imagenes', 'logo.png');
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        const logoDataUri = `data:image/png;base64,${logoBase64}`;

        let finalHtml = htmlTemplate
            .replace('{{cliente}}', datos.cliente)
            .replace('{{casillero}}', datos.casillero)
            .replace('{{sucursal}}', datos.sucursal)
            .replace('{{monto}}', parseFloat(datos.monto).toFixed(2))
            .replace('{{concepto}}', datos.concepto)
            .replace('{{metodo_pago}}', datos.metodo_pago)
            .replace('{{fecha}}', datos.fecha)
            .replace('{{logo}}', logoDataUri);
        
        finalHtml = finalHtml.replace('<link rel="stylesheet" href="recibo-style.css">', `<style>${cssTemplate}</style>`);
        
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: datos.email_cliente,
            subject: `Nuevo Recibo de Compra PGT Logistics para ${datos.cliente}`,
            text: `Estimado(a) ${datos.cliente},\n\nAdjunto encontrará su recibo de compra en formato PDF.\n\nGracias por su preferencia,\nPGT Logistics`,
            attachments: [{
                filename: `recibo-${datos.casillero}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error al enviar el email:', error);
                return res.status(500).json({ message: 'Error al enviar el email.' });
            }
            console.log('Email enviado: ' + info.response);
            res.json({ message: 'Recibo creado, guardado y enviado por email con éxito.' });
        });

    } catch (error) {
        console.error('Error en el proceso de creación de factura:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});