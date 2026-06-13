// Configuración de Supabase
const SUPABASE_URL = 'https://qawqfurklebcezhizvec.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_X7_mVWW4InkhvrUc4VL4DA_dXUiXv-Y';

// Inicializar Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Almacenar imágenes por problema/herramienta
let imagesData = {
    problema1: { python: [], excel: [], minitab: [], r: [], enunciado: [] },
    problema2: { python: [], excel: [], minitab: [], r: [], enunciado: [] },
    problema3: { python: [], excel: [], minitab: [], r: [], enunciado: [] },
    problema4: { python: [], excel: [], minitab: [], r: [], enunciado: [] }
};
let pendingPersonalData = {};
// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App iniciada (modo SIN auto-guardado)');
    initApp();
    setupMenuEvents();
    loadPersonalData();
    
    if (!document.getElementById('fecha').value) {
        document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    }
    
    // NO hay event listeners de input para guardar automáticamente
    // Solo cargar datos, NO guardar al escribir
});

async function initApp() {
    console.log('📦 Inicializando...');
    await loadAllImagesData();
    await renderAllPanels();
    await loadLastUpdateFromDB();
    addGitHubFooter();
    getGitHubLastCommit();
}

async function loadAllImagesData() {
    const problemas = ['problema1', 'problema2', 'problema3','problema4'];
    
    for (const problema of problemas) {
        const { data, error } = await supabaseClient
            .from('imagenes')
            .select('*')
            .eq('problema', problema)
            .order('orden', { ascending: true });
        
        if (!error && data) {
            const herramientas = ['python', 'excel', 'minitab', 'r', 'enunciado'];
            herramientas.forEach(herramienta => {
                imagesData[problema][herramienta] = data.filter(img => img.herramienta === herramienta);
            });
        }
    }
}

function setupMenuEvents() {
    const menuItems = document.querySelectorAll('.menu-item');
    const panels = ['problema1', 'problema2', 'problema3', 'problema4', 'anexos'];
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const menu = item.getAttribute('data-menu');
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            panels.forEach(panel => {
                const panelEl = document.getElementById(`${panel}-panel`);
                if (panelEl) panelEl.classList.add('hidden');
            });
            const activePanel = document.getElementById(`${menu}-panel`);
            if (activePanel) activePanel.classList.remove('hidden');
        });
    });
}

async function renderAllPanels() {
    console.log('🔄 Renderizando todos los paneles...');
    
    await renderProblemaPanel('problema1');
    await renderProblemaPanel('problema2');
    await renderProblemaPanel('problema3');
    await renderProblemaPanel('problema4');  // NUEVO
    renderAnexosPanel();
    
    // IMPORTANTE: Esperar más tiempo para que el DOM esté listo
    setTimeout(async () => {
        console.log('🔄 Cargando textos para TODOS los problemas...');
        await loadTextsForProblema('problema1');
        await loadTextsForProblema('problema2');
        await loadTextsForProblema('problema3');
        await loadTextsForProblema('problema4');  // NUEVO
        await loadAnexosComments();
        console.log('✅ Carga inicial de textos completada');
    }, 800);
}

async function renderProblemaPanel(problemaId) {
    const container = document.getElementById(`${problemaId}-content`);
    if (!container) return;
    
    const tools = ['enunciado', 'python', 'excel', 'minitab', 'r'];
    const toolNames = { 
        enunciado: '📋 ENUNCIADO DEL PROBLEMA',
        python: '🐍 PYTHON', 
        excel: '📊 EXCEL', 
        minitab: '📈 MINITAB', 
        r: '📉 R' 
    };
    
    let html = '';
    
    for (const tool of tools) {
        html += `
            <div class="section-block">
                <h3 class="section-title">${toolNames[tool]}</h3>
                ${tool !== 'enunciado' ? `
                <div class="intro-text">
                    <textarea id="${problemaId}-${tool}-intro" rows="3" 
                              placeholder="Escribe una introducción sobre el análisis en ${toolNames[tool]}..."></textarea>
                </div>
                ` : ''}
                <div class="image-grid" id="grid-${problemaId}-${tool}"></div>
                <div class="add-image-btn" onclick="addNewImage('${problemaId}', '${tool}')">
                    <i class="fas fa-plus-circle"></i> ${tool === 'enunciado' ? 'Agregar imagen del enunciado' : 'Agregar nueva imagen'}
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="conclusion-section">
            <h3 class="section-title">📋 CONCLUSIONES Y RECOMENDACIONES</h3>
            <textarea id="${problemaId}-conclusion" rows="5" 
                      placeholder="Escribe las conclusiones y recomendaciones del análisis..."></textarea>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Renderizar imágenes existentes
    for (const tool of tools) {
        renderImageGrid(problemaId, tool);
    }
}
function renderImageGrid(problemaId, herramienta) {
    const grid = document.getElementById(`grid-${problemaId}-${herramienta}`);
    if (!grid) return;
    
    const images = imagesData[problemaId][herramienta] || [];
    
    grid.innerHTML = '';
    images.forEach((img, idx) => {
        const imageCard = document.createElement('div');
        imageCard.className = 'image-card image-card-new';
        imageCard.innerHTML = `
            <div class="image-preview" onclick="openFullImage('${img.imagen_url}', '${escapeHtml(img.titulo || 'Sin título')}')">
                <img src="${img.imagen_url}" alt="Evidencia ${idx + 1}">
                <button class="delete-image-btn" onclick="event.stopPropagation(); deleteImage('${problemaId}', '${herramienta}', ${img.orden})">✖</button>
                <button class="edit-title-btn" onclick="event.stopPropagation(); editImageTitle('${problemaId}', '${herramienta}', ${img.orden}, '${escapeHtml(img.titulo || '')}')">✏️</button>
            </div>
            <div class="image-title" id="title-${problemaId}-${herramienta}-${img.orden}">${escapeHtml(img.titulo || 'Sin título')}</div>
        `;
        grid.appendChild(imageCard);
    });
}

// Función para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Editar título de imagen
window.editImageTitle = async function(problemaId, herramienta, orden, tituloActual) {
    const nuevoTitulo = prompt('Ingrese el título para esta imagen:', tituloActual);
    
    if (nuevoTitulo === null) return; // Cancelar
    
    try {
        const { error } = await supabaseClient
            .from('imagenes')
            .update({ titulo: nuevoTitulo })
            .eq('problema', problemaId)
            .eq('herramienta', herramienta)
            .eq('orden', orden);
        
        if (error) throw error;
        
        // Actualizar datos locales
        const imgIndex = imagesData[problemaId][herramienta].findIndex(img => img.orden === orden);
        if (imgIndex !== -1) {
            imagesData[problemaId][herramienta][imgIndex].titulo = nuevoTitulo;
        }
        
        // Actualizar el DOM
        const titleElement = document.getElementById(`title-${problemaId}-${herramienta}-${orden}`);
        if (titleElement) {
            titleElement.textContent = nuevoTitulo || 'Sin título';
        }
        
        alert('✅ Título actualizado');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar título: ' + error.message);
    }
};

// Abrir imagen en pantalla completa con título
window.openFullImage = function(imageUrl, titulo) {
    // Crear modal si no existe
    let modal = document.getElementById('imageModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-title" id="modalTitle"></div>
            <img id="modalImage" src="">
            <div class="modal-close-hint">✖ Haz clic fuera de la imagen o presiona ESC para cerrar</div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close-hint')) {
                modal.classList.remove('show');
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                modal.classList.remove('show');
            }
        });
    }
    
    const modalTitle = document.getElementById('modalTitle');
    const modalImg = document.getElementById('modalImage');
    
    modalTitle.textContent = titulo;
    modalImg.src = imageUrl;
    modal.classList.add('show');
};

// Agregar nueva imagen con título
window.addNewImage = async function(problemaId, herramienta) {
    // Primero pedir el título
    const titulo = prompt('Ingrese un título para esta imagen:', 'Evidencia');
    if (titulo === null) return; // Cancelar
    
    // Crear input de archivo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Mostrar loading
        const grid = document.getElementById(`grid-${problemaId}-${herramienta}`);
        const loadingCard = document.createElement('div');
        loadingCard.className = 'image-card';
        loadingCard.innerHTML = '<div class="image-preview"><div class="placeholder">⏳ Subiendo...</div></div>';
        grid.appendChild(loadingCard);
        
        // Generar nuevo orden
        const currentImages = imagesData[problemaId][herramienta] || [];
        const newOrder = currentImages.length;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${problemaId}/${herramienta}/img_${Date.now()}_${newOrder}.${fileExt}`;
        
        try {
            // Subir a Storage
            const { error: uploadError } = await supabaseClient.storage
                .from('imagenes')
                .upload(fileName, file, { upsert: true });
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabaseClient.storage
                .from('imagenes')
                .getPublicUrl(fileName);
            
            // Guardar en BD con título
            const { error: dbError } = await supabaseClient
                .from('imagenes')
                .insert({
                    problema: problemaId,
                    herramienta: herramienta,
                    orden: newOrder,
                    imagen_url: urlData.publicUrl,
                    titulo: titulo
                });
            
            if (dbError) throw dbError;
            
            // Actualizar datos locales
            if (!imagesData[problemaId][herramienta]) {
                imagesData[problemaId][herramienta] = [];
            }
            imagesData[problemaId][herramienta].push({
                problema: problemaId,
                herramienta: herramienta,
                orden: newOrder,
                imagen_url: urlData.publicUrl,
                titulo: titulo
            });
            
            // Re-renderizar grid
            renderImageGrid(problemaId, herramienta);
            await updateLastUpdateTimestamp();
            
            alert('✅ Imagen agregada correctamente');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al subir: ' + error.message);
            loadingCard.remove();
        }
    };
    input.click();
};

// Eliminar imagen
window.deleteImage = async function(problemaId, herramienta, orden) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    
    try {
        // Eliminar de BD
        const { error } = await supabaseClient
            .from('imagenes')
            .delete()
            .eq('problema', problemaId)
            .eq('herramienta', herramienta)
            .eq('orden', orden);
        
        if (error) throw error;
        
        // Actualizar datos locales
        imagesData[problemaId][herramienta] = imagesData[problemaId][herramienta].filter(img => img.orden !== orden);
        
        // Reordenar imágenes restantes
        for (let i = 0; i < imagesData[problemaId][herramienta].length; i++) {
            const img = imagesData[problemaId][herramienta][i];
            if (img.orden !== i) {
                await supabaseClient
                    .from('imagenes')
                    .update({ orden: i })
                    .eq('id', img.id);
                img.orden = i;
            }
        }
        
        // Re-renderizar grid
        renderImageGrid(problemaId, herramienta);
        await updateLastUpdateTimestamp();
        alert('✅ Imagen eliminada');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar: ' + error.message);
    }
};

function loadTextsForProblema(problemaId) {
    const herramientas = ['python', 'excel', 'minitab', 'r'];
    
    herramientas.forEach(async (herramienta) => {
        const loadText = async (retryCount = 0) => {
            try {
                const textarea = document.getElementById(`${problemaId}-${herramienta}-intro`);
                
                if (!textarea) {
                    if (retryCount < 8) {
                        setTimeout(() => loadText(retryCount + 1), 400);
                    }
                    return;
                }
                
                console.log(`🔍 Buscando texto para ${problemaId}-${herramienta}...`);
                
                const { data, error } = await supabaseClient
                    .from('textos')
                    .select('*')
                    .eq('problema', problemaId)
                    .eq('herramienta', herramienta)
                    .eq('tipo', 'intro')
                    .maybeSingle();
                
                if (!error && data && data.contenido) {
                    textarea.value = data.contenido;
                    console.log(`✅ Cargado texto de ${problemaId}-${herramienta}`);
                } else {
                    textarea.value = '';
                }
                
                // NO configurar event listener de auto-guardado
                
            } catch (error) {
                console.error(`Error cargando texto para ${problemaId}-${herramienta}:`, error);
            }
        };
        
        loadText();
    });
    
    // Cargar conclusión (sin auto-guardado)
    const loadConclusion = async (retryCount = 0) => {
        try {
            const textarea = document.getElementById(`${problemaId}-conclusion`);
            
            if (!textarea) {
                if (retryCount < 8) {
                    setTimeout(() => loadConclusion(retryCount + 1), 400);
                }
                return;
            }
            
            console.log(`🔍 Buscando conclusión para ${problemaId}...`);
            
            const { data, error } = await supabaseClient
                .from('textos')
                .select('*')
                .eq('problema', problemaId)
                .is('herramienta', null)
                .eq('tipo', 'conclusion')
                .maybeSingle();
            
            if (!error && data && data.contenido) {
                textarea.value = data.contenido;
                console.log(`✅ Cargada conclusión para ${problemaId}`);
            } else {
                textarea.value = '';
            }
            
            // NO configurar event listener de auto-guardado
            
        } catch (error) {
            console.error(`Error cargando conclusión para ${problemaId}:`, error);
        }
    };
    
    setTimeout(() => loadConclusion(), 300);
}

// Variable para debounce del timestamp
let timestampTimeout = null;
// Función saveText - VERSIÓN DEFINITIVA QUE SÍ FUNCIONA
// Función saveText - VERSIÓN CON ACTUALIZACIÓN DE TIMESTAMP
async function saveText(problema, herramienta, tipo, contenido) {
    if (contenido === undefined || contenido === null) return;
    
    console.log(`📝 saveText: problema=${problema}, herramienta=${herramienta || 'null'}, tipo=${tipo}, contenido="${contenido.substring(0, 30)}..."`);
    
    try {
        // Buscar si ya existe el registro
        let query = supabaseClient
            .from('textos')
            .select('id')
            .eq('problema', problema)
            .eq('tipo', tipo);
        
        if (herramienta === null || herramienta === undefined) {
            query = query.is('herramienta', null);
        } else {
            query = query.eq('herramienta', herramienta);
        }
        
        const { data: existente, error: findError } = await query.maybeSingle();
        
        if (findError) {
            console.error('Error al buscar registro:', findError);
            return;
        }
        
        let error;
        
        if (existente) {
            // ACTUALIZAR
            console.log(`📝 Actualizando registro ID: ${existente.id}`);
            const { error: updateError } = await supabaseClient
                .from('textos')
                .update({ 
                    contenido: contenido, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', existente.id);
            error = updateError;
        } else {
            // INSERTAR - SIN created_at
            console.log(`📝 Insertando nuevo registro para ${problema}-${tipo}`);
            const insertData = {
                problema: problema,
                tipo: tipo,
                contenido: contenido,
                updated_at: new Date().toISOString()
            };
            
            // Solo agregar herramienta si no es null
            if (herramienta !== null && herramienta !== undefined) {
                insertData.herramienta = herramienta;
            }
            
            const { error: insertError } = await supabaseClient
                .from('textos')
                .insert(insertData);
            error = insertError;
        }
        
        if (error) {
            console.error('❌ Error guardando texto:', error);
        } else {
            console.log(`✅ Texto guardado exitosamente para ${problema}-${tipo}`);
            // Actualizar timestamp
            await updateLastUpdateTimestamp();
        }
        
    } catch (error) {
        console.error('❌ Error en saveText:', error);
    }
}
function renderAnexosPanel() {
    const container = document.getElementById('anexos-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="anexos-upload">
            <h3 class="section-title">📁 SUBIR ARCHIVOS</h3>
            <div class="file-upload-area" onclick="document.getElementById('anexos-file-input').click()">
                <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: #7c3aed;"></i>
                <p>Haz clic para subir archivos (PDF, Word, Imágenes, etc.)</p>
                <input type="file" id="anexos-file-input" multiple style="display: none;" onchange="uploadAnexos(event)">
            </div>
            <div class="file-list" id="anexos-file-list"></div>
        </div>
        <div class="comments-section">
            <h3 class="section-title">💬 COMENTARIOS Y CONCLUSIONES GENERALES</h3>
            <textarea id="anexos-comments" rows="6" placeholder="Escribe comentarios, observaciones o conclusiones adicionales..."></textarea>
        </div>
    `;
    
    loadAnexos();
    loadAnexosComments(); // Solo carga, sin auto-guardado
}
window.uploadAnexos = async function(event) {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
        const fileName = `anexos/${Date.now()}_${file.name}`;
        
        try {
            const { error } = await supabaseClient.storage
                .from('imagenes')
                .upload(fileName, file);
            
            if (error) throw error;
            
            const { data: urlData } = supabaseClient.storage
                .from('imagenes')
                .getPublicUrl(fileName);
            
            await supabaseClient.from('anexos').insert({
                nombre: file.name,
                tipo: file.type,
                url: urlData.publicUrl
            });
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error al subir ${file.name}: ${error.message}`);
        }
    }
    
    await loadAnexos();
    // ACTUALIZAR TIMESTAMP DESPUÉS DE SUBIR ARCHIVOS
    await updateLastUpdateTimestamp();
    alert('✅ Archivos subidos correctamente');
};

async function loadAnexos() {
    try {
        const { data, error } = await supabaseClient
            .from('anexos')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const fileList = document.getElementById('anexos-file-list');
        if (!fileList) return;
        
        fileList.innerHTML = '';
        data.forEach(file => {
            const fileIcon = file.tipo.includes('pdf') ? '📕' : 
                            file.tipo.includes('word') ? '📘' :
                            file.tipo.includes('image') ? '🖼️' : '📄';
            
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                ${fileIcon} ${file.nombre.length > 30 ? file.nombre.substring(0, 27) + '...' : file.nombre}
                <a href="${file.url}" target="_blank">📥</a>
                <button onclick="deleteAnexo(${file.id})">✖</button>
            `;
            fileList.appendChild(fileItem);
        });
    } catch (error) {
        console.error('Error cargando anexos:', error);
    }
}

window.deleteAnexo = async function(id) {
    if (confirm('¿Eliminar este archivo?')) {
        await supabaseClient.from('anexos').delete().eq('id', id);
        await loadAnexos();
        // ACTUALIZAR TIMESTAMP DESPUÉS DE ELIMINAR ARCHIVO
        await updateLastUpdateTimestamp();
        alert('✅ Archivo eliminado');
    }
};

async function loadAnexosComments() {
    try {
        const commentsTextarea = document.getElementById('anexos-comments');
        if (!commentsTextarea) {
            setTimeout(() => loadAnexosComments(), 300);
            return;
        }
        
        console.log('🔍 Cargando comentarios de anexos...');
        
        const { data, error } = await supabaseClient
            .from('textos')
            .select('*')
            .eq('problema', 'anexos')
            .is('herramienta', null)
            .eq('tipo', 'comment')
            .maybeSingle();
        
        if (error) {
            console.error('Error al cargar comentario:', error);
            return;
        }
        
        if (data && data.contenido) {
            commentsTextarea.value = data.contenido;
            console.log('✅ Cargado comentario de anexos');
        } else {
            commentsTextarea.value = '';
        }
        
        // NO configurar event listener de auto-guardado
        
    } catch (error) {
        console.error('Error cargando comentarios de anexos:', error);
    }
}
// NUEVA FUNCIÓN: Guardar todos los datos manualmente
window.saveAllData = async function() {
    console.log('💾 Guardando todos los datos manualmente...');
    let savedCount = 0;
    
    try {
        // 1. Guardar datos personales
        const personalData = {
            nombre: document.getElementById('nombre')?.value || '',
            codigo: document.getElementById('codigo')?.value || '',
            curso: document.getElementById('curso')?.value || '',
            fecha: document.getElementById('fecha')?.value || ''
        };
        
        const { error: personalError } = await supabaseClient
            .from('personal_data')
            .upsert(personalData);
        
        if (personalError) {
            console.error('Error guardando datos personales:', personalError);
        } else {
            savedCount++;
            console.log('✅ Datos personales guardados');
        }
        
        // 2. Guardar todas las introducciones y conclusiones de los 4 problemas
        const problemas = ['problema1', 'problema2', 'problema3', 'problema4'];
        const herramientas = ['python', 'excel', 'minitab', 'r'];
        
        for (const problema of problemas) {
            // Guardar introducciones
            for (const herramienta of herramientas) {
                const textarea = document.getElementById(`${problema}-${herramienta}-intro`);
                if (textarea && textarea.value !== undefined) {
                    await saveTextManual(problema, herramienta, 'intro', textarea.value);
                    savedCount++;
                }
            }
            
            // Guardar conclusión
            const conclusionTextarea = document.getElementById(`${problema}-conclusion`);
            if (conclusionTextarea && conclusionTextarea.value !== undefined) {
                await saveTextManual(problema, null, 'conclusion', conclusionTextarea.value);
                savedCount++;
            }
        }
        
        // 3. Guardar comentarios de anexos
        const anexosComments = document.getElementById('anexos-comments');
        if (anexosComments && anexosComments.value !== undefined) {
            await saveTextManual('anexos', null, 'comment', anexosComments.value);
            savedCount++;
        }
        
        // 4. Actualizar timestamp ÚNICAMENTE al guardar manualmente
        await updateLastUpdateTimestamp();
        
        console.log(`✅ Guardado completo: ${savedCount} elementos guardados`);
        alert(`✅ Datos guardados correctamente (${savedCount} elementos)\nÚltima actualización: ${new Date().toLocaleString()}`);
        
    } catch (error) {
        console.error('❌ Error al guardar:', error);
        alert('Error al guardar datos: ' + error.message);
    }
};
// Función auxiliar para guardar textos (sin actualizar timestamp individualmente)
async function saveTextManual(problema, herramienta, tipo, contenido) {
    if (contenido === undefined || contenido === null) return;
    
    try {
        let query = supabaseClient
            .from('textos')
            .select('id')
            .eq('problema', problema)
            .eq('tipo', tipo);
        
        if (herramienta === null || herramienta === undefined) {
            query = query.is('herramienta', null);
        } else {
            query = query.eq('herramienta', herramienta);
        }
        
        const { data: existente, error: findError } = await query.maybeSingle();
        
        if (findError && findError.code !== 'PGRST116') {
            console.error('Error al buscar registro:', findError);
            return;
        }
        
        if (existente) {
            const { error: updateError } = await supabaseClient
                .from('textos')
                .update({ contenido: contenido })
                .eq('id', existente.id);
            
            if (updateError) console.error(`Error actualizando ${problema}-${tipo}:`, updateError);
        } else {
            const insertData = {
                problema: problema,
                tipo: tipo,
                contenido: contenido
            };
            
            if (herramienta !== null && herramienta !== undefined) {
                insertData.herramienta = herramienta;
            }
            
            const { error: insertError } = await supabaseClient
                .from('textos')
                .insert(insertData);
            
            if (insertError) console.error(`Error insertando ${problema}-${tipo}:`, insertError);
        }
        
    } catch (error) {
        console.error(`Error en saveTextManual para ${problema}-${tipo}:`, error);
    }
}


async function loadPersonalData() {
    try {
        const { data, error } = await supabaseClient
            .from('personal_data')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (!error && data) {
            if (data.nombre) document.getElementById('nombre').value = data.nombre;
            if (data.codigo) document.getElementById('codigo').value = data.codigo;
            if (data.curso) document.getElementById('curso').value = data.curso;
            if (data.fecha) document.getElementById('fecha').value = data.fecha;
        }
    } catch (error) {
        console.error('Error cargando datos personales:', error);
    }
}
// ========================================
// FUNCIONES PARA ÚLTIMA ACTUALIZACIÓN
// ========================================

// Variable global para la última actualización
let lastUpdateTime = null;
let isUpdatingTimestamp = false;

// Función para actualizar el timestamp
async function updateLastUpdateTimestamp() {
    const now = new Date();
    lastUpdateTime = now;
    
    try {
        const { error } = await supabaseClient
            .from('metadata')
            .upsert({
                key: 'last_update',
                value: now.toISOString(),
                updated_at: now.toISOString()
            }, { onConflict: 'key' });
        
        if (error) {
            console.error('Error guardando timestamp:', error);
        } else {
            displayLastUpdateTime(now);
            console.log('✅ Timestamp actualizado:', now.toLocaleString());
        }
    } catch (error) {
        console.error('Error en updateLastUpdateTimestamp:', error);
    }
}


// Función para mostrar la hora en la UI
function displayLastUpdateTime(date) {
    const updateElement = document.getElementById('last-update-text');
    if (!updateElement) return;
    
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    
    const formattedDate = date.toLocaleDateString('es-ES', options);
    updateElement.innerHTML = `
        <i class="fas fa-clock"></i> 
        Última actualización: <span class="update-time">${formattedDate}</span>
    `;
}
// Función para cargar la última actualización desde Supabase
async function loadLastUpdateFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('metadata')
            .select('value, updated_at')
            .eq('key', 'last_update')
            .maybeSingle();
        
        if (error) {
            console.log('Tabla metadata no configurada aún');
            const updateElement = document.getElementById('last-update-text');
            if (updateElement) {
                updateElement.innerHTML = `<i class="fas fa-info-circle"></i> Los datos se guardan automáticamente`;
            }
            return;
        }
        
        if (data && data.value) {
            const lastDate = new Date(data.value);
            displayLastUpdateTime(lastDate);
            lastUpdateTime = lastDate;
        } else {
            const updateElement = document.getElementById('last-update-text');
            if (updateElement) {
                updateElement.innerHTML = `<i class="fas fa-info-circle"></i> Los datos se guardan automáticamente`;
            }
        }
    } catch (error) {
        console.error('Error cargando última actualización:', error);
        const updateElement = document.getElementById('last-update-text');
        if (updateElement) {
            updateElement.innerHTML = `<i class="fas fa-info-circle"></i> Los datos se guardan automáticamente`;
        }
    }
}
// Función para mostrar badge de GitHub en el footer

// Función para obtener el último commit de GitHub (si está en GitHub Pages)
async function getGitHubLastCommit() {
    const commitElement = document.getElementById('github-last-commit');
    if (!commitElement) return;
    
    // Mostrar mensaje por defecto sin hacer fetch
    commitElement.innerHTML = '<i class="fab fa-github-alt"></i> Hosteado en GitHub Pages';
    
    // Opcional: Si quieres que funcione, cambia 'tuusuario' por tu usuario real de GitHub
    // Y descomenta el código de abajo
    
    /*
    const repoOwner = 'TU_USUARIO_REAL';  // <--- CAMBIA ESTO
    const repoName = 'doe-dashboard';
    
    try {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=1`);
        if (response.ok) {
            const data = await response.json();
            if (data && data[0]) {
                const commitDate = new Date(data[0].commit.author.date);
                const options = {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                };
                const formattedDate = commitDate.toLocaleDateString('es-ES', options);
                commitElement.innerHTML = `<i class="fab fa-github-alt"></i> Último commit: ${formattedDate} - ${data[0].commit.message.substring(0, 50)}`;
            }
        }
    } catch (error) {
        console.log('No se pudo obtener información de GitHub');
        commitElement.innerHTML = '<i class="fab fa-github-alt"></i> Hosteado en GitHub Pages';
    }
    */
}
function addGitHubFooter() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    // Verificar si ya existe el footer para no duplicarlo
    if (document.querySelector('.github-footer')) return;
    
    const footer = document.createElement('div');
    footer.className = 'github-footer';
    footer.innerHTML = `
        <div class="github-info">
            <i class="fab fa-github"></i>
            <span>Ver en GitHub: </span>
            <a href="https://github.com/Brenda-hi/doe-dashboard-generator" target="_blank">
                doe-dashboard
            </a>
            <span class="separator">•</span>
            <span id="github-last-commit">Hosteado en GitHub Pages</span>
        </div>
    `;
    mainContent.appendChild(footer);
    
    // Estilos para el footer (solo si no existen)
    if (!document.querySelector('#github-footer-styles')) {
        const style = document.createElement('style');
        style.id = 'github-footer-styles';
        style.textContent = `
            .github-footer {
                margin-top: 30px;
                padding: 15px 20px;
                background: rgba(18, 6, 36, 0.5);
                border-radius: 12px;
                text-align: center;
                font-size: 12px;
                border: 1px solid rgba(124, 58, 237, 0.2);
            }
            .github-footer a {
                color: #7c3aed;
                text-decoration: none;
                font-weight: 600;
            }
            .github-footer a:hover {
                text-decoration: underline;
            }
            .github-footer .separator {
                margin: 0 10px;
                color: #c4b5fd;
            }
            .github-footer i {
                margin-right: 8px;
                color: #7c3aed;
            }
        `;
        document.head.appendChild(style);
    }
}
// Función para depurar y forzar recarga de comentarios
window.debugAndReloadAnexos = async function() {
    console.log('=== DEPURANDO ANEXOS ===');
    
    // 1. Ver el textarea actual
    const textarea = document.getElementById('anexos-comments');
    console.log('1. Textarea actual:', textarea ? textarea.value : 'NO EXISTE');
    
    // 2. Ver qué hay en la base de datos
    const { data, error } = await supabaseClient
        .from('textos')
        .select('*')
        .eq('problema', 'anexos')
        .eq('tipo', 'comment');
    
    console.log('2. Datos en BD:', data);
    console.log('3. Error:', error);
    
    // 3. Forzar recarga
    await loadAnexosComments();
    console.log('4. Recarga completada');
    
    // 4. Mostrar valor después de recarga
    console.log('5. Textarea después de recarga:', textarea ? textarea.value : 'NO EXISTE');
    
    alert('Depuración completada. Revisa la consola (F12)');
};

// Función para recargar textos manualmente (útil para depuración)
window.reloadTexts = async function() {
    console.log('🔄 Recargando todos los textos manualmente...');
    await loadTextsForProblema('problema1');
    await loadTextsForProblema('problema2');
    await loadTextsForProblema('problema3');
    alert('✅ Textos recargados desde la base de datos');
};
// Función de depuración para verificar qué textos están guardados
window.checkAllTexts = async function() {
    console.log('=== VERIFICANDO TODOS LOS TEXTOS EN BD ===');
    
    const problemas = ['problema1', 'problema2', 'problema3'];
    const herramientas = ['python', 'excel', 'minitab', 'r'];
    
    for (const problema of problemas) {
        console.log(`\n📋 ${problema.toUpperCase()}:`);
        
        // Verificar introducciones
        for (const herramienta of herramientas) {
            const { data, error } = await supabaseClient
                .from('textos')
                .select('*')
                .eq('problema', problema)
                .eq('herramienta', herramienta)
                .eq('tipo', 'intro')
                .maybeSingle();
            
            if (data) {
                console.log(`  ✅ ${herramienta}: ${data.contenido ? data.contenido.substring(0, 50) + '...' : '(vacío)'}`);
            } else {
                console.log(`  ❌ ${herramienta}: No encontrado`);
            }
        }
        
        // Verificar conclusión
        const { data, error } = await supabaseClient
            .from('textos')
            .select('*')
            .eq('problema', problema)
            .is('herramienta', null)
            .eq('tipo', 'conclusion')
            .maybeSingle();
        
        if (data) {
            console.log(`  ✅ Conclusión: ${data.contenido ? data.contenido.substring(0, 50) + '...' : '(vacío)'}`);
        } else {
            console.log(`  ❌ Conclusión: No encontrada`);
        }
    }
    
    console.log('\n💡 Si faltan textos, escribe en los textareas y se guardarán automáticamente');
};


// Función para forzar la recarga de textos en todos los paneles visibles
window.forceReloadAllTexts = async function() {
    console.log('🔄 Forzando recarga de TODOS los textos...');
    await loadTextsForProblema('problema1');
    await loadTextsForProblema('problema2');
    await loadTextsForProblema('problema3');
    await loadAnexosComments();
    console.log('✅ Recarga completada');
    alert('Textos recargados desde la base de datos');
};
// Función para crear un texto de prueba y verificar que funciona
window.createTestText = async function(problemaId, herramienta) {
    const testContent = `Texto de prueba para ${problemaId} - ${herramienta} - ${new Date().toLocaleTimeString()}`;
    
    console.log(`🧪 Creando texto de prueba para ${problemaId}-${herramienta}...`);
    
    const result = await saveText(problemaId, herramienta, 'intro', testContent);
    
    // Forzar recarga
    setTimeout(async () => {
        await loadTextsForProblema(problemaId);
        console.log(`✅ Prueba completada. Revisa el textarea de ${problemaId}-${herramienta}`);
        alert(`Texto de prueba guardado. Revisa el textarea de ${herramienta.toUpperCase()} en el problema correspondiente.`);
    }, 1000);
};

// Función para verificar qué hay en la base de datos para un problema específico
window.checkProblemaTexts = async function(problemaId) {
    console.log(`=== VERIFICANDO TEXTOS DE ${problemaId.toUpperCase()} ===`);
    
    const herramientas = ['python', 'excel', 'minitab', 'r'];
    
    for (const herramienta of herramientas) {
        const { data, error } = await supabaseClient
            .from('textos')
            .select('*')
            .eq('problema', problemaId)
            .eq('herramienta', herramienta)
            .eq('tipo', 'intro');
        
        if (data && data.length > 0) {
            console.log(`✅ ${herramienta}: ID=${data[0].id}, contenido="${data[0].contenido?.substring(0, 50)}..."`);
        } else {
            console.log(`❌ ${herramienta}: No hay registros`);
        }
    }
    
    // Verificar conclusión
    const { data, error } = await supabaseClient
        .from('textos')
        .select('*')
        .eq('problema', problemaId)
        .is('herramienta', null)
        .eq('tipo', 'conclusion');
    
    if (data && data.length > 0) {
        console.log(`✅ Conclusión: ID=${data[0].id}, contenido="${data[0].contenido?.substring(0, 50)}..."`);
    } else {
        console.log(`❌ Conclusión: No hay registros`);
    }
};

// Función para sincronizar manualmente un textarea específico
window.syncTextarea = async function(problemaId, herramienta) {
    const textareaId = herramienta ? `${problemaId}-${herramienta}-intro` : `${problemaId}-conclusion`;
    const textarea = document.getElementById(textareaId);
    
    if (!textarea) {
        console.error(`❌ No se encontró el textarea: ${textareaId}`);
        return;
    }
    
    console.log(`🔄 Sincronizando ${textareaId}...`);
    console.log(`   Contenido actual: "${textarea.value.substring(0, 50)}..."`);
    
    await saveText(problemaId, herramienta || null, herramienta ? 'intro' : 'conclusion', textarea.value);
    
    console.log(`✅ Sincronización completada`);
    
    // Verificar que se guardó
    setTimeout(() => checkProblemaTexts(problemaId), 500);
};

console.log('💡 Comandos útiles:');
console.log('   - checkProblemaTexts("problema2") → Ver textos del problema 2');
console.log('   - createTestText("problema2", "python") → Crear texto de prueba');
console.log('   - syncTextarea("problema2", "python") → Sincronizar textarea específico');
// También puedes agregar un botón temporal en la consola
console.log('💡 Para recargar textos manualmente, escribe: reloadTexts()');
// ========================================
// CÓDIGO DE DIAGNÓSTICO - Agrega esto al final de app.js
// ========================================

// 1. Función para verificar si el textarea existe y tiene event listener
window.debugTextarea = function(problemaId, herramienta) {
    const textareaId = `${problemaId}-${herramienta}-intro`;
    const textarea = document.getElementById(textareaId);
    
    console.log(`=== DIAGNÓSTICO: ${textareaId} ===`);
    console.log(`1. ¿Existe el textarea? ${!!textarea}`);
    
    if (textarea) {
        console.log(`2. ¿Tiene event listeners? ${textarea.hasListener ? 'SÍ' : 'NO'}`);
        console.log(`3. Contenido actual: "${textarea.value.substring(0, 50)}..."`);
        console.log(`4. ID del elemento: ${textarea.id}`);
        
        // Verificar si está visible en el DOM
        const isVisible = textarea.offsetParent !== null;
        console.log(`5. ¿Está visible? ${isVisible}`);
        
        // Verificar qué panel está activo
        const activePanel = document.querySelector('.dashboard-panel:not(.hidden)');
        console.log(`6. Panel activo: ${activePanel?.id || 'ninguno'}`);
    }
    
    return textarea;
};

// 2. Función para probar guardado manual
window.testManualSave = async function(problemaId, herramienta) {
    const textareaId = `${problemaId}-${herramienta}-intro`;
    const textarea = document.getElementById(textareaId);
    
    if (!textarea) {
        console.error(`❌ Textarea ${textareaId} no encontrado`);
        return;
    }
    
    const testText = `Prueba manual ${new Date().toLocaleTimeString()}`;
    textarea.value = testText;
    
    console.log(`📝 Probando guardado manual para ${problemaId}-${herramienta}`);
    console.log(`   Texto: "${testText}"`);
    
    // Llamar directamente a saveText
    await saveText(problemaId, herramienta, 'intro', testText);
    
    // Verificar si se guardó
    setTimeout(async () => {
        const { data, error } = await supabaseClient
            .from('textos')
            .select('*')
            .eq('problema', problemaId)
            .eq('herramienta', herramienta)
            .eq('tipo', 'intro');
        
        console.log(`📊 Resultado de la consulta:`, data);
        if (data && data.length > 0) {
            console.log(`✅ GUARDADO EXITOSO! ID: ${data[0].id}`);
        } else {
            console.error(`❌ NO SE GUARDÓ en la base de datos`);
        }
    }, 1000);
};

// 3. Función para forzar la creación del textarea event listener
window.forceAttachListener = function(problemaId, herramienta) {
    const textareaId = `${problemaId}-${herramienta}-intro`;
    const textarea = document.getElementById(textareaId);
    
    if (!textarea) {
        console.error(`❌ Textarea ${textareaId} no encontrado`);
        return;
    }
    
    // Remover listener antiguo si existe
    if (textarea.saveHandler) {
        textarea.removeEventListener('input', textarea.saveHandler);
    }
    
    // Crear nuevo handler
    const saveHandler = () => {
        console.log(`🔥 [MANUAL] Guardando ${problemaId}-${herramienta}: "${textarea.value.substring(0, 30)}..."`);
        saveText(problemaId, herramienta, 'intro', textarea.value);
    };
    
    textarea.saveHandler = saveHandler;
    textarea.addEventListener('input', saveHandler);
    textarea.hasListener = true;
    
    console.log(`✅ Event listener forzado para ${textareaId}`);
    
    // Probar que funciona
    console.log(`💡 Escribe algo en el textarea y mira la consola`);
};

// 4. Verificar el estado de todos los textareas del problema 2
window.checkProblema2State = function() {
    console.log('=== ESTADO COMPLETO DEL PROBLEMA 2 ===');
    
    const herramientas = ['python', 'excel', 'minitab', 'r'];
    
    herramientas.forEach(herramienta => {
        const textarea = document.getElementById(`problema2-${herramienta}-intro`);
        if (textarea) {
            console.log(`${herramienta.toUpperCase()}:`);
            console.log(`  - Existe: SÍ`);
            console.log(`  - Con listener: ${textarea.hasListener ? 'SÍ' : 'NO'}`);
            console.log(`  - Contenido: "${textarea.value.substring(0, 40)}..."`);
        } else {
            console.log(`${herramienta.toUpperCase()}: NO EXISTE`);
        }
    });
    
    const conclusion = document.getElementById('problema2-conclusion');
    if (conclusion) {
        console.log(`CONCLUSIÓN:`);
        console.log(`  - Existe: SÍ`);
        console.log(`  - Con listener: ${conclusion.hasListener ? 'SÍ' : 'NO'}`);
        console.log(`  - Contenido: "${conclusion.value.substring(0, 40)}..."`);
    }
};

// 5. Función para recargar SOLO el problema 2
window.reloadProblema2 = async function() {
    console.log('🔄 Recargando solo el problema 2...');
    
    // Limpiar y recrear el contenido
    const container = document.getElementById('problema2-content');
    if (container) {
        // Guardar temporalmente los valores actuales si existen
        const currentValues = {};
        const herramientas = ['python', 'excel', 'minitab', 'r'];
        herramientas.forEach(herramienta => {
            const textarea = document.getElementById(`problema2-${herramienta}-intro`);
            if (textarea) {
                currentValues[herramienta] = textarea.value;
            }
        });
        const conclusionTextarea = document.getElementById('problema2-conclusion');
        if (conclusionTextarea) {
            currentValues.conclusion = conclusionTextarea.value;
        }
        
        // Recargar el panel
        await renderProblemaPanel('problema2');
        
        // Restaurar valores si es necesario
        setTimeout(() => {
            herramientas.forEach(herramienta => {
                if (currentValues[herramienta]) {
                    const newTextarea = document.getElementById(`problema2-${herramienta}-intro`);
                    if (newTextarea) {
                        newTextarea.value = currentValues[herramienta];
                    }
                }
            });
            if (currentValues.conclusion) {
                const newConclusion = document.getElementById('problema2-conclusion');
                if (newConclusion) {
                    newConclusion.value = currentValues.conclusion;
                }
            }
            
            // Forzar carga de textos desde BD
            loadTextsForProblema('problema2');
        }, 100);
    }
    
    console.log('✅ Problema 2 recargado');
};
// Función específica para depurar problema 4
window.checkProblema4State = function() {
    console.log('=== ESTADO COMPLETO DEL PROBLEMA 4 ===');
    
    const herramientas = ['python', 'excel', 'minitab', 'r'];
    
    herramientas.forEach(herramienta => {
        const textarea = document.getElementById(`problema4-${herramienta}-intro`);
        if (textarea) {
            console.log(`${herramienta.toUpperCase()}:`);
            console.log(`  - Existe: SÍ`);
            console.log(`  - Contenido: "${textarea.value.substring(0, 40)}..."`);
        } else {
            console.log(`${herramienta.toUpperCase()}: NO EXISTE`);
        }
    });
    
    const conclusion = document.getElementById('problema4-conclusion');
    if (conclusion) {
        console.log(`CONCLUSIÓN:`);
        console.log(`  - Existe: SÍ`);
        console.log(`  - Contenido: "${conclusion.value.substring(0, 40)}..."`);
    }
};

// Función para recargar solo problema 4
window.reloadProblema4 = async function() {
    console.log('🔄 Recargando solo el problema 4...');
    
    // Limpiar y recrear el contenido
    const container = document.getElementById('problema4-content');
    if (container) {
        // Guardar temporalmente los valores actuales si existen
        const currentValues = {};
        const herramientas = ['python', 'excel', 'minitab', 'r'];
        herramientas.forEach(herramienta => {
            const textarea = document.getElementById(`problema4-${herramienta}-intro`);
            if (textarea) {
                currentValues[herramienta] = textarea.value;
            }
        });
        const conclusionTextarea = document.getElementById('problema4-conclusion');
        if (conclusionTextarea) {
            currentValues.conclusion = conclusionTextarea.value;
        }
        
        // Recargar el panel
        await renderProblemaPanel('problema4');
        
        // Restaurar valores si es necesario
        setTimeout(() => {
            herramientas.forEach(herramienta => {
                if (currentValues[herramienta]) {
                    const newTextarea = document.getElementById(`problema4-${herramienta}-intro`);
                    if (newTextarea) {
                        newTextarea.value = currentValues[herramienta];
                    }
                }
            });
            if (currentValues.conclusion) {
                const newConclusion = document.getElementById('problema4-conclusion');
                if (newConclusion) {
                    newConclusion.value = currentValues.conclusion;
                }
            }
            
            // Forzar carga de textos desde BD
            loadTextsForProblema('problema4');
        }, 100);
    }
    
    console.log('✅ Problema 4 recargado');
};
// 6. Verificar la última actualización en la UI
window.checkLastUpdate = function() {
    const updateElement = document.getElementById('last-update-text');
    console.log('=== ÚLTIMA ACTUALIZACIÓN ===');
    console.log('Elemento en UI:', updateElement?.innerHTML);
    console.log('Variable lastUpdateTime:', lastUpdateTime);
};

console.log('🔧 Comandos de diagnóstico disponibles:');
console.log('   debugTextarea("problema2", "python")     - Verificar textarea');
console.log('   testManualSave("problema2", "python")    - Probar guardado manual');
console.log('   forceAttachListener("problema2", "python") - Forzar event listener');
console.log('   checkProblema2State()                    - Ver estado completo');
console.log('   reloadProblema2()                        - Recargar problema 2');
console.log('   checkProblema4State()                    - Ver estado completo del problema 4');
console.log('   reloadProblema4()                        - Recargar problema 4');
console.log('   checkLastUpdate()                        - Ver última actualización');
