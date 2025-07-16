const formulario = document.querySelector('#facturaForm');
formulario.addEventListener('submit', (evento) => {

    evento.preventDefault();

    const datosFactura = {
        cliente: document.querySelector('#cliente').value,
        casillero: document.querySelector('#casillero').value,
        monto: document.querySelector('#monto').value,
        concepto: document.querySelector('#concepto').value,
        fecha: document.querySelector('#fecha').value
    };

    fetch('http://localhost:3000/crear-factura', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosFactura)
    })
        .then(response => response.json())
        .then(data => {
            console.log('Respuesta del servidor:', data);
            alert('Factura enviada al servidor con éxito!');
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Hubo un error al enviar la factura.');
        });
});
