require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

(async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS recibos (
            id SERIAL PRIMARY KEY,
            cliente TEXT NOT NULL,
            casillero TEXT,
            sucursal TEXT,
            monto NUMERIC(10, 2) NOT NULL,
            concepto TEXT,
            metodo_pago TEXT,
            fecha TEXT,
            email_cliente TEXT
        );`;
    try {
        await pool.query(createTableQuery);
        console.log('Tabla "recibos" verificada/creada con éxito.');
    } catch (err) {
        console.error('Error al crear la tabla:', err);
    }
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
    let browser = null;
    try {
        const datos = req.body;
        const insertQuery = `
            INSERT INTO recibos (cliente, casillero, sucursal, monto, concepto, metodo_pago, fecha, email_cliente) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await pool.query(insertQuery, [datos.cliente, datos.casillero, datos.sucursal, datos.monto, datos.concepto, datos.metodo_pago, datos.fecha, datos.email_cliente]);
        console.log('Recibo guardado en la base de datos PostgreSQL.');

        const htmlTemplate = fs.readFileSync(path.join(__dirname, 'recibo-template.html'), 'utf-8');
        const cssTemplate = fs.readFileSync(path.join(__dirname, 'recibo-style.css'), 'utf-8');
        const logoPath = path.join(__dirname, 'imagenes', 'logo.png');
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        const logoDataUri = `data:image/png;base64,${logoBase64}`;

        let finalHtml = htmlTemplate.replace('{{cliente}}', datos.cliente).replace('{{casillero}}', datos.casillero).replace('{{sucursal}}', datos.sucursal).replace('{{monto}}', parseFloat(datos.monto).toFixed(2)).replace('{{concepto}}', datos.concepto).replace('{{metodo_pago}}', datos.metodo_pago).replace('{{fecha}}', datos.fecha).replace('{{logo}}', logoDataUri);
        finalHtml = finalHtml.replace('<link rel="stylesheet" href="recibo-style.css">', `<style>${cssTemplate}</style>`);
        
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
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
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});