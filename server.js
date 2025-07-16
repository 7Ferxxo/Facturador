require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = 3000;

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
            monto REAL NOT NULL,
            concepto TEXT,
            fecha TEXT,
            email_cliente TEXT
        )
    `);
})();


app.use(cors());
app.use(express.json());

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
            'INSERT INTO recibos (cliente, casillero, monto, concepto, fecha, email_cliente) VALUES (?, ?, ?, ?, ?, ?)',
            [datos.cliente, datos.casillero, datos.monto, datos.concepto, datos.fecha, datos.email_cliente]
        );
        console.log('Recibo guardado en la base de datos.');

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const nombreArchivo = `recibo-${datos.casillero}-${Date.now()}.pdf`;
        const stream = fs.createWriteStream(nombreArchivo);
        doc.pipe(stream);

        doc.image('imagenes/logo.png', 50, 45, { width: 100 });
        doc.fontSize(20).font('Helvetica-Bold').text('RECIBO DE COMPRA', 200, 57, { align: 'right' });
        doc.fontSize(10).font('Helvetica').text('PGT Logistics', 200, 80, { align: 'right' });

        doc.moveTo(50, 150).lineTo(550, 150).stroke();

        const customerInfoTop = 170;
        doc.fontSize(11).font('Helvetica-Bold').text('Recibo Para:', 50, customerInfoTop);
        doc.font('Helvetica').text(datos.cliente, 50, customerInfoTop + 15);
        doc.text(`Casillero: ${datos.casillero}`, 50, customerInfoTop + 30);

        doc.font('Helvetica-Bold').text('Fecha:', 400, customerInfoTop);
        doc.font('Helvetica').text(datos.fecha, 450, customerInfoTop);

        doc.moveDown(4);

        doc.font('Helvetica-Bold').text('Concepto', 50, doc.y);
        doc.moveDown(0.5);
        doc.font('Helvetica').text(datos.concepto, { width: 400 });

        const totalY = doc.y + 30;
        doc.fontSize(14).font('Helvetica-Bold').text('Total a Pagar:', 50, totalY, { align: 'right', width: 420 });
        doc.text(`$${parseFloat(datos.monto).toFixed(2)}`, 0, totalY, { align: 'right' });

        const footerY = doc.page.height - 100;
        doc.moveTo(50, footerY).lineTo(550, footerY).stroke();
        doc.fontSize(10).font('Helvetica-Oblique').text('¡Gracias por preferirnos y por su compra!', 50, footerY + 15, {
            align: 'center',
            width: 500
        });
        
        doc.end();

        stream.on('finish', () => {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: datos.email_cliente,
                subject: `Nuevo Recibo de Compra PGT Logistics para ${datos.cliente}`,
                text: `Estimado(a) ${datos.cliente},\n\nAdjunto encontrará su recibo de compra en formato PDF.\n\nGracias por su preferencia,\nPGT Logistics`,
                attachments: [{ filename: nombreArchivo, path: nombreArchivo }]
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error al enviar el email:', error);
                    return res.status(500).json({ message: 'Error al enviar el email.' });
                }
                console.log('Email enviado: ' + info.response);
                fs.unlinkSync(nombreArchivo);
                res.json({ message: 'Recibo creado, guardado y enviado por email con éxito.' });
            });
        });

    } catch (dbError) {
        console.error('Error con la base de datos:', dbError);
        res.status(500).json({ message: 'Error al guardar el recibo en la base de datos.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});