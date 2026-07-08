let queue = [];
let isSending = false;
let currentMessage = "";
let currentDelay = 15;
let currentTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startSendingQueue') {
        queue = request.numbers;
        currentMessage = request.message;
        currentDelay = request.delay || 15;
        
        if (!isSending) {
            isSending = true;
            processQueue();
        }
    }
});

async function processQueue() {
    if (queue.length === 0) {
        isSending = false;
        chrome.runtime.sendMessage({ action: 'queueUpdate', status: '✅ Todos os envios concluídos!' });
        return;
    }

    const number = queue.shift();
    // NOVO: Removemos o texto da URL. Agora o robô apenas abre o número.
    const url = `https://web.whatsapp.com/send?phone=${number}`;
    
    chrome.runtime.sendMessage({ action: 'queueUpdate', status: `Preparando envio humanizado para ${number}... (Faltam ${queue.length})` });

    // Busca aba do WhatsApp aberta
    const tabs = await chrome.tabs.query({ url: "*://web.whatsapp.com/*" });
    let tab = tabs[0];
    
    if (tab) {
        await chrome.tabs.update(tab.id, { url: url, active: true });
        currentTabId = tab.id;
    } else {
        tab = await chrome.tabs.create({ url: url });
        currentTabId = tab.id;
    }

    // Espera o WhatsApp Web carregar a tela e chama a injeção do script humano
    setTimeout(() => {
        executeSendAction(currentTabId, currentMessage);
    }, 8000); 
}

function executeSendAction(tabId, messageToType) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        args: [messageToType], // Passa a mensagem para dentro da página
        func: async (text) => {
            const sleep = (ms) => new Promise(r => setTimeout(r, ms));
            
            // Pausa aleatória inicial (1 a 3 segundos) simulando um humano lendo a tela
            await sleep(1000 + Math.random() * 2000);
            
            const input = document.querySelector('div[title="Digite uma mensagem"]') || 
                          document.querySelector('footer div[contenteditable="true"]');
                          
            if (input) {
                // Foca na caixa de texto
                input.focus();
                
                // Simula o colar (Ctrl+V) humano na caixa
                const dataTransfer = new DataTransfer();
                dataTransfer.setData('text', text);
                const pasteEvent = new ClipboardEvent('paste', {
                    clipboardData: dataTransfer,
                    bubbles: true,
                    cancelable: true
                });
                input.dispatchEvent(pasteEvent);
                
                // Comando de fallback para garantir que o texto entrou no React
                document.execCommand('insertText', false, text);
                
                // Dispara evento para o WhatsApp reconhecer a digitação
                const inputEvent = new Event('input', { bubbles: true });
                input.dispatchEvent(inputEvent);
                
                // Pausa aleatória de "releitura" antes de apertar Enviar (2 a 5 segundos)
                await sleep(2000 + Math.random() * 3000);
                
                // Procura o botão verde de enviar
                const sendButton = document.querySelector('button[aria-label="Enviar"]') || 
                                   document.querySelector('[data-icon="send"]');
                
                if (sendButton) {
                    const clickable = sendButton.closest('button') || sendButton.closest('div[role="button"]');
                    if (clickable) clickable.click();
                } else {
                    // Fallback: Aperta Enter
                    const enterEvent = new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 });
                    input.dispatchEvent(enterEvent);
                }
            } else {
                console.log("Caixa de texto não encontrada. Número inválido ou bloqueio.");
            }
        }
    }, () => {
        // Só depois de todo esse ritual, ele espera o Delay do usuário para ir pro próximo
        setTimeout(() => {
            processQueue();
        }, currentDelay * 1000);
    });
}
