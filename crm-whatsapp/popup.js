// Navegação entre abas
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.target).classList.add('active');
    });
});

// Lógica de Extração
document.getElementById('extractBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Iniciando robô...';
    statusDiv.className = '';
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url.includes('web.whatsapp.com')) {
            statusDiv.textContent = 'Abra o WhatsApp Web!';
            statusDiv.className = 'error';
            return;
        }
        
        const ignoreAdmins = document.getElementById('ignoreAdmins').checked;
        
        chrome.tabs.sendMessage(tab.id, { action: 'extractContacts', ignoreAdmins: ignoreAdmins }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = 'Recarregue a aba do WhatsApp (F5)';
                statusDiv.className = 'error';
                return;
            }
            if (response && response.status === 'started') {
                statusDiv.innerHTML = '<span style="color:#f1b35c">⏳ Robô rolando a lista sozinho... Aguarde!</span>';
            } else if (response && response.success) {
                statusDiv.textContent = `Extraídos: ${response.count} contatos!`;
                statusDiv.className = 'success';
            } else {
                statusDiv.textContent = response ? response.error : 'Erro desconhecido';
                statusDiv.className = 'error';
            }
        });
    } catch (e) {
        statusDiv.textContent = 'Erro de permissão.';
        statusDiv.className = 'error';
    }
});

// Lógica de Envio CRM
document.getElementById('sendBtn').addEventListener('click', async () => {
    const numbersRaw = document.getElementById('numbersList').value;
    const message = document.getElementById('messageText').value;
    const delay = parseInt(document.getElementById('delaySecs').value, 10);
    const statusDiv = document.getElementById('status');

    if (!numbersRaw || !message) {
        statusDiv.textContent = 'Preencha números e a mensagem.';
        statusDiv.className = 'error';
        return;
    }

    const numbers = numbersRaw.split('\n')
        .map(n => n.replace(/\D/g, ''))
        .filter(n => n.length > 5);

    if (numbers.length === 0) {
        statusDiv.textContent = 'Nenhum número válido encontrado.';
        statusDiv.className = 'error';
        return;
    }

    chrome.runtime.sendMessage({
        action: 'startSendingQueue',
        numbers: numbers,
        message: message,
        delay: delay
    });

    statusDiv.textContent = `Fila iniciada: ${numbers.length} números. Pode fechar esta janela.`;
    statusDiv.className = 'success';
});

// Escutar atualizações do background script (envios e extração concluída)
chrome.runtime.onMessage.addListener((msg) => {
    const statusDiv = document.getElementById('status');
    if (msg.action === 'queueUpdate') {
        statusDiv.textContent = msg.status;
        statusDiv.className = 'warning';
    } else if (msg.action === 'extractionDone') {
        if (msg.success) {
            statusDiv.textContent = `✅ Extraídos: ${msg.count} contatos com sucesso!`;
            statusDiv.className = 'success';
        } else {
            statusDiv.textContent = msg.error;
            statusDiv.className = 'error';
        }
    }
});
