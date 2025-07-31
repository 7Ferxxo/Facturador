const formulario = document.querySelector('#facturaForm');
const botonEnviar = formulario.querySelector('button');

formulario.addEventListener('submit', (evento) => {
    evento.preventDefault(); 

    botonEnviar.disabled = true;
    botonEnviar.textContent = 'Enviando...';

    const datosRecibo = {
        cliente: document.querySelector('#cliente').value,
        casillero: document.querySelector('#casillero').value,
        sucursal: document.querySelector('#sucursal').value,
        monto: document.querySelector('#monto').value,
        concepto: document.querySelector('#concepto').value,
        metodo_pago: document.querySelector('#metodo_pago').value,
        fecha: document.querySelector('#fecha').value,
        email_cliente: document.querySelector('#email_cliente').value
    };

    fetch('http://localhost:3000/crear-factura', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosRecibo)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Respuesta del servidor:', data);
        alert('Recibo de compra enviado con éxito!');
        formulario.reset();
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Hubo un error al enviar el recibo.');
    })
    .finally(() => {
        botonEnviar.disabled = false;
        botonEnviar.textContent = 'Generar Recibo';
    });
});