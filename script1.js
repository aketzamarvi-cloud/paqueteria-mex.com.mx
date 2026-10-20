let enviosGuardados = JSON.parse(localStorage.getItem('envios_paqueteria')) || [];
let contactosGuardados = JSON.parse(localStorage.getItem('contactos_paqueteria')) || [];
let papeleraReciclaje = JSON.parse(localStorage.getItem('papelera_paqueteria')) || [];
let mapaActual = null;

function cambiarPestana(pestana, ev) {
    if (ev) ev.preventDefault();
    document.querySelectorAll('.app-section').forEach(sec => sec.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    if (pestana === 'registro') {
        document.getElementById('seccion-registro').style.display = 'block';
    } else if (pestana === 'rastreo') {
        document.getElementById('seccion-rastreo').style.display = 'block';
    } else if (pestana === 'contactos') {
        document.getElementById('seccion-contactos').style.display = 'block';
        renderizarContactos();
    } else if (pestana === 'admin') {
        document.getElementById('seccion-admin').style.display = 'block';
        renderizarAdminPanel();
    } else if (pestana === 'papelera') {
        document.getElementById('seccion-papelera').style.display = 'block';
        renderizarPapelera();
    }

    if (ev && ev.currentTarget && ev.currentTarget.classList.contains('nav-link')) {
        ev.currentTarget.classList.add('active');
    }
}

function rastreoRapido() {
    const guia = document.getElementById('quickTrackingInput').value.trim();
    if (guia) {
        document.getElementById('inputRastreo').value = guia;
        cambiarPestana('rastreo');
        buscarPaquete();
    } else {
        alert("Ingresa un número de guía.");
    }
}

function filtrarSugerenciasRemitente(query) {
    const box = document.getElementById('sugerenciasRemitente');
    if (!query || query.trim() === '') { box.style.display = 'none'; return; }
    const matches = contactosGuardados.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()));
    if (matches.length === 0) { box.style.display = 'none'; return; }
    box.innerHTML = matches.map(c => `
        <div class="suggestion-item" onclick="seleccionarRemitente('${c.nombre}', '${c.tel}', '${c.dir || ''}')">
            <strong>${c.nombre}</strong> - 📞 ${c.tel}
        </div>
    `).join('');
    box.style.display = 'block';
}

function seleccionarRemitente(nombre, tel, dir) {
    document.getElementById('remNombre').value = nombre;
    document.getElementById('remTel').value = tel;
    if (dir) document.getElementById('remDir').value = dir;
    document.getElementById('busquedaRemitente').value = nombre;
    document.getElementById('sugerenciasRemitente').style.display = 'none';
}

function filtrarSugerenciasDestinatario(query) {
    const box = document.getElementById('sugerenciasDestinatario');
    if (!query || query.trim() === '') { box.style.display = 'none'; return; }
    const matches = contactosGuardados.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()));
    if (matches.length === 0) { box.style.display = 'none'; return; }
    box.innerHTML = matches.map(c => `
        <div class="suggestion-item" onclick="seleccionarDestinatario('${c.nombre}', '${c.tel}', '${c.dir || ''}')">
            <strong>${c.nombre}</strong> - 📞 ${c.tel}
        </div>
    `).join('');
    box.style.display = 'block';
}

function seleccionarDestinatario(nombre, tel, dir) {
    document.getElementById('destNombre').value = nombre;
    document.getElementById('destTel').value = tel;
    if (dir) document.getElementById('destDir').value = dir;
    document.getElementById('busquedaDestinatario').value = nombre;
    document.getElementById('sugerenciasDestinatario').style.display = 'none';
}

function guardarYGenerarEnvio(event) {
    event.preventDefault();
    const remNombre = document.getElementById('remNombre').value.trim();
    const clienteExistente = contactosGuardados.find(c => c.nombre.toLowerCase() === remNombre.toLowerCase());
    
    if (clienteExistente) {
        procederConGuardadoEnvio();
    } else {
        const parecido = contactosGuardados.find(c => c.nombre.toLowerCase().includes(remNombre.toLowerCase()) || remNombre.toLowerCase().includes(c.nombre.toLowerCase()));
        if (parecido) {
            const confirmar = confirm(`El nombre "${remNombre}" es similar a "${parecido.nombre}".\n\n¿Registrar como NUEVO (Aceptar) o vincular al existente (Cancelar)?`);
            if (!confirmar) { seleccionarRemitente(parecido.nombre, parecido.tel, parecido.dir || ''); }
        }
        procederConGuardadoEnvio();
    }
}

function procederConGuardadoEnvio() {
    const idGuia = "GEX-" + Math.floor(100000 + Math.random() * 900000);
    const descProd = document.getElementById('descProducto').value;
    const archivoInput = document.getElementById('fotoPaquete');

    let fotoUrl = "";
    if (archivoInput.files && archivoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            fotoUrl = e.target.result;
            finalizarGuardadoEnvio(idGuia, descProd, fotoUrl);
        };
        reader.readAsDataURL(archivoInput.files[0]);
    } else {
        finalizarGuardadoEnvio(idGuia, descProd, "");
    }
}

function finalizarGuardadoEnvio(idGuia, descProd, fotoUrl) {
    const precioBase = parseFloat(document.getElementById('precioBase').value) || 0;
    const iva = precioBase * 0.16;
    const total = precioBase + iva;

    const nuevoEnvio = {
        guia: idGuia,
        producto: descProd,
        remNombre: document.getElementById('remNombre').value,
        remTel: document.getElementById('remTel').value,
        remDir: document.getElementById('remDir').value,
        destNombre: document.getElementById('destNombre').value,
        destTel: document.getElementById('destTel').value,
        destDir: document.getElementById('destDir').value,
        peso: document.getElementById('peso').value,
        dimensiones: document.getElementById('dimensiones').value,
        estado: document.getElementById('estado').value,
        metodoPago: document.getElementById('metodoPago').value,
        subtotal: precioBase.toFixed(2),
        iva: iva.toFixed(2),
        total: total.toFixed(2),
        foto: fotoUrl,
        fecha: new Date().toLocaleString()
    };

    enviosGuardados.push(nuevoEnvio);
    localStorage.setItem('envios_paqueteria', JSON.stringify(enviosGuardados));

    agregarOActualizarContacto(nuevoEnvio.remNombre, nuevoEnvio.remTel, nuevoEnvio.remDir, "Remitente", descProd, idGuia);
    agregarOActualizarContacto(nuevoEnvio.destNombre, nuevoEnvio.destTel, nuevoEnvio.destDir, "Destinatario", descProd, idGuia);

    document.getElementById('busquedaRemitente').value = "";
    document.getElementById('busquedaDestinatario').value = "";

    mostrarTicketVisual(nuevoEnvio);
    alert("¡Guía generada exitosamente!");
}

function mostrarTicketVisual(envio) {
    document.getElementById('lblGuia').innerText = envio.guia;
    document.getElementById('lblProdDesc').innerText = envio.producto;
    document.getElementById('lblRemNombre').innerText = envio.remNombre;
    document.getElementById('lblRemTel').innerText = envio.remTel;
    document.getElementById('lblRemDir').innerText = envio.remDir;

    document.getElementById('lblDestNombre').innerText = envio.destNombre;
    document.getElementById('lblDestTel').innerText = envio.destTel;
    document.getElementById('lblDestDir').innerText = envio.destDir;

    document.getElementById('lblSubtotal').innerText = envio.subtotal || "0.00";
    document.getElementById('lblIva').innerText = envio.iva || "0.00";
    document.getElementById('lblTotal').innerText = envio.total || "0.00";
    document.getElementById('lblMetodoPago').innerText = envio.metodoPago || "Efectivo";

    const fotoCont = document.getElementById('ticketFotoContainer');
    const fotoImg = document.getElementById('lblFoto');
    if (envio.foto) {
        fotoImg.src = envio.foto;
        fotoCont.style.display = 'block';
    } else {
        fotoCont.style.display = 'none';
    }

    try {
        JsBarcode("#barcode", envio.guia, { format: "CODE128", lineColor: "#000", width: 1.8, height: 35, displayValue: true });
    } catch(e) { console.log(e); }

    document.getElementById('thGuia').innerText = envio.guia;
    document.getElementById('thFecha').innerText = envio.fecha;
    document.getElementById('thProducto').innerText = envio.producto;
    document.getElementById('thMetodo').innerText = envio.metodoPago || "Efectivo";
    document.getElementById('thRem').innerText = envio.remNombre;
    document.getElementById('thDest').innerText = envio.destNombre;
    document.getElementById('thSubtotal').innerText = envio.subtotal || "0.00";
    document.getElementById('thIva').innerText = envio.iva || "0.00";
    document.getElementById('thTotal').innerText = envio.total || "0.00";

    try {
        JsBarcode("#thermalBarcode", envio.guia, { format: "CODE128", lineColor: "#000", width: 1.2, height: 28, displayValue: true });
    } catch(e) { console.log(e); }

    document.getElementById('ticketPreview').style.display = 'block';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function cambiarTamanoThermal(claseTamano, ev) {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    if (ev && ev.currentTarget) ev.currentTarget.classList.add('active');
    document.getElementById('thermalTicket').className = 'thermal-ticket-box ' + claseTamano;
}

function imprimirEtiquetaGrande() {
    document.body.classList.remove('print-thermal-mode');
    window.print();
}

function imprimirThermal() {
    document.body.classList.add('print-thermal-mode');
    window.print();
    setTimeout(() => { document.body.classList.remove('print-thermal-mode'); }, 1000);
}

function agregarOActualizarContacto(nombre, telefono, direccion, tipo, producto, idGuia) {
    let contacto = contactosGuardados.find(c => c.tel === telefono || c.nombre.toLowerCase() === nombre.toLowerCase());
    if (contacto) {
        contacto.compras = (contacto.compras || 1) + 1;
        contacto.ultimoProducto = producto;
        contacto.ultimaGuia = idGuia;
        contacto.tel = telefono;
        contacto.dir = direccion;
        contacto.nombre = nombre;
    } else {
        contactosGuardados.push({ nombre, tel: telefono, dir: direccion, tipo, compras: 1, ultimoProducto: producto, ultimaGuia: idGuia });
    }
    localStorage.setItem('contactos_paqueteria', JSON.stringify(contactosGuardados));
}

function eliminarContacto(index) {
    if (confirm("¿Mover a papelera?")) {
        const eliminado = contactosGuardados.splice(index, 1)[0];
        eliminado.tipoPapelera = 'contacto';
        papeleraReciclaje.push(eliminado);
        localStorage.setItem('contactos_paqueteria', JSON.stringify(contactosGuardados));
        localStorage.setItem('papelera_paqueteria', JSON.stringify(papeleraReciclaje));
        renderizarContactos();
    }
}

function eliminarEnvioAdmin(index) {
    if (confirm("¿Mover envío a papelera?")) {
        const eliminado = enviosGuardados.splice(index, 1)[0];
        eliminado.tipoPapelera = 'envio';
        papeleraReciclaje.push(eliminado);
        localStorage.setItem('envios_paqueteria', JSON.stringify(enviosGuardados));
        localStorage.setItem('papelera_paqueteria', JSON.stringify(papeleraReciclaje));
        renderizarAdminPanel();
    }
}

function renderizarPapelera() {
    const contenedor = document.getElementById('listaPapelera');
    if (papeleraReciclaje.length === 0) {
        contenedor.innerHTML = `<p style="font-size:12px; color:var(--text-muted);">Papelera vacía.</p>`;
        return;
    }
    contenedor.innerHTML = papeleraReciclaje.map((item, index) => `
        <div class="trash-card">
            <div>${item.tipoPapelera === 'contacto' ? '👤 ' + item.nombre : '📦 Guía: ' + item.guia}</div>
            <div class="btn-group">
                <button onclick="restaurarItem(${index})" class="call-btn" style="background:var(--success);">Restaurar</button>
                <button onclick="borrarDefinitivo(${index})" class="delete-btn">Borrar</button>
            </div>
        </div>
    `).join('');
}

function restaurarItem(index) {
    const item = papeleraReciclaje.splice(index, 1)[0];
    if (item.tipoPapelera === 'contacto') { delete item.tipoPapelera; contactosGuardados.push(item); localStorage.setItem('contactos_paqueteria', JSON.stringify(contactosGuardados)); }
    else { delete item.tipoPapelera; enviosGuardados.push(item); localStorage.setItem('envios_paqueteria', JSON.stringify(enviosGuardados)); }
    localStorage.setItem('papelera_paqueteria', JSON.stringify(papeleraReciclaje));
    renderizarPapelera();
}

function borrarDefinitivo(index) {
    if (confirm("¿Eliminar definitivamente?")) {
        papeleraReciclaje.splice(index, 1);
        localStorage.setItem('papelera_paqueteria', JSON.stringify(papeleraReciclaje));
        renderizarPapelera();
    }
}

function copiarGuiaYBuscar(guia) {
    navigator.clipboard.writeText(guia);
    document.getElementById('inputRastreo').value = guia;
    cambiarPestana('rastreo');
    buscarPaquete();
}

function renderizarContactos() {
    const contenedor = document.getElementById('listaContactos');
    if (contactosGuardados.length === 0) { contenedor.innerHTML = `<p style="font-size:12px; color:var(--text-muted);">Sin contactos.</p>`; return; }
    contenedor.innerHTML = contactosGuardados.map((c, index) => `
        <div class="contact-card">
            <div><strong>👤 ${c.nombre}</strong><br>📞 <a href="tel:${c.tel}">${c.tel}</a><br>📦 Envíos: ${c.compras || 1}</div>
            <div class="btn-group">
                <a href="tel:${c.tel}" class="call-btn">Llamar</a>
                ${c.ultimaGuia ? `<button onclick="copiarGuiaYBuscar('${c.ultimaGuia}')" class="copy-btn">Guía</button>` : ''}
                <button onclick="eliminarContacto(${index})" class="delete-btn">Borrar</button>
            </div>
        </div>
    `).join('');
}

function renderizarAdminPanel() {
    const contenedor = document.getElementById('panelAdminEnvios');
    if (enviosGuardados.length === 0) { contenedor.innerHTML = `<p style="font-size:12px; color:var(--text-muted);">Sin envíos.</p>`; return; }
    contenedor.innerHTML = enviosGuardados.map((envio, index) => `
        <div class="admin-card">
            <div><strong>${envio.guia}</strong> - $${envio.total || '0.00'}<br>De: ${envio.remNombre} ➔ Para: ${envio.destNombre}<br>Estado: <strong>${envio.estado}</strong></div>
            <div class="btn-group">
                <select onchange="cambiarEstadoAdmin(${index}, this.value)" style="padding: 3px; font-size:10px;">
                    <option value="Pendiente" ${envio.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="En camino" ${envio.estado === 'En camino' ? 'selected' : ''}>En camino</option>
                    <option value="Entregado" ${envio.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                    <option value="Cancelado" ${envio.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
                <button onclick="reimprimirGuia('${envio.guia}')" class="call-btn" style="background:var(--brand-orange);">Ticket</button>
                <button onclick="eliminarEnvioAdmin(${index})" class="delete-btn">🗑️</button>
            </div>
        </div>
    `).join('');
}

function cambiarEstadoAdmin(index, nuevoEstado) {
    enviosGuardados[index].estado = nuevoEstado;
    localStorage.setItem('envios_paqueteria', JSON.stringify(enviosGuardados));
    alert("Actualizado");
}

function reimprimirGuia(guia) {
    const envio = enviosGuardados.find(e => e.guia === guia);
    if (envio) { cambiarPestana('registro'); mostrarTicketVisual(envio); }
}

function buscarPaquete() {
    const codigo = document.getElementById('inputRastreo').value.trim();
    const resultadoDiv = document.getElementById('resultadoRastreo');
    const envio = enviosGuardados.find(e => e.guia === codigo);

    if (!envio) { resultadoDiv.innerHTML = `<p style="color:red; font-size:12px;">Guía no encontrada: <strong>${codigo}</strong></p>`; return; }

    let textoEstado = envio.estado === "En camino" ? "🚚 Paquete en ruta de entrega" : (envio.estado === "Entregado" ? "✅ Entregado con éxito" : "📦 Pendiente de recolección");

    resultadoDiv.innerHTML = `
        <div class="tracking-card">
            <h3 style="margin-top:0; font-size:14px;">Guía: ${envio.guia}</h3>
            <p style="font-size:11px;"><strong>Destinatario:</strong> ${envio.destNombre} | 📞 <a href="tel:${envio.destTel}">${envio.destTel}</a></p>
            <div class="delivery-truck-banner">${textoEstado}</div>
            ${envio.foto ? `<p style="font-size:11px;"><strong>Evidencia:</strong><br><img src="${envio.foto}" style="max-height:100px; border-radius:4px; margin-top:4px;"></p>` : ''}
            <div id="mapaRastreo"></div>
        </div>
    `;

    setTimeout(() => {
        if (mapaActual) { mapaActual.remove(); }
        const latBase = 20.4853, lonBase = -99.2217;
        mapaActual = L.map('mapaRastreo').setView([latBase, lonBase], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(mapaActual);
        L.marker([latBase, lonBase]).addTo(mapaActual).bindPopup(`Origen`).openPopup();
        L.marker([latBase + 0.04, lonBase + 0.05]).addTo(mapaActual).bindPopup(`Destino`);
        L.polyline([[latBase, lonBase], [latBase + 0.04, lonBase + 0.05]], {color: '#f59e0b', weight: 3}).addTo(mapaActual);
    }, 300);
}