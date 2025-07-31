# Proyecto Facturador PGT Logistics

Esta es una aplicación web full-stack que permite generar recibos de compra en formato PDF, guardarlos en una base de datos PostgreSQL y enviarlos por correo electrónico al cliente.

## Tecnologías Utilizadas
*Frontend*: HTML, CSS, JavaScript
  *Backend*: Node.js, Express
  *Base de Datos*: PostgreSQL
  *Generación de PDF*: PDFKit
  *Envío de Correo*: Nodemailer
* 
# Cómo Instalar y Correr Localmente

1.  Clonar el repositorio:
    `git clone https://github.com/7Ferxxo/Facturador.git`

2.  Navegar a la carpeta del proyecto:
    `cd Facturador`

3.  Instalar las dependencias:
    `npm install`

4.  Crear un archivo `.env` en la raíz del proyecto y configurarlo con las variables de entorno para la base de datos y el correo.

5.  Iniciar el servidor:
    `node server.js`

La aplicación estará corriendo en `http://localhost:3000`.
