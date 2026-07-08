chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContacts') {
        const phoneRegex = /\+?\d{1,4}[-\s]?\(?\d{1,3}\)?[-\s]?\d{3,5}[-\s]?\d{3,5}/g;
        let contacts = new Set();
        let adminNumbers = new Set();

        // 1. Localizar a área rolável correta (Pode ser o Painel Direito ou o Modal central)
        let scrollableDiv = null;
        let maxScore = -1;

        for (let el of document.querySelectorAll('div')) {
            // Um container de scroll tem scrollHeight maior que clientHeight
            if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
                const style = window.getComputedStyle(el);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto') {
                    
                    let score = 0;
                    const text = el.innerText || '';
                    
                    // Se contém números de telefone, é um forte candidato
                    if (phoneRegex.test(text)) score += 10;
                    
                    const rect = el.getBoundingClientRect();
                    // O modal ou painel lateral costuma ser mais estreito que a tela principal de chat
                    if (rect.width > 0 && rect.width < window.innerWidth * 0.45) score += 10;
                    
                    // Geralmente não começa colado na esquerda (ignora a lista de conversas recentes)
                    if (rect.left > window.innerWidth * 0.25) score += 10;
                    
                    if (score > maxScore) {
                        maxScore = score;
                        scrollableDiv = el;
                    }
                }
            }
        }

        if (!scrollableDiv) {
            sendResponse({ success: false, error: 'Lista de contatos não encontrada. Abra os participantes.' });
            return true;
        }

        // Responde ao popup que começou o processo
        sendResponse({ success: true, status: 'started' });

        // 2. Função para coletar contatos visíveis DENTRO do container isolado
        const collect = () => {
            const elements = scrollableDiv.querySelectorAll('span, div');
            elements.forEach(el => {
                const text = el.innerText;
                // Pegar apenas elementos curtos para não ler o container inteiro de uma vez
                if (text && text.length < 150) {
                    const matches = text.match(phoneRegex);
                    if (matches) {
                        matches.forEach(m => contacts.add(m.replace(/[\r\n]+/g, ' ').trim()));
                    }
                }
                
                // Mapear administradores
                if (request.ignoreAdmins) {
                    const textL = text ? text.toLowerCase() : '';
                    if (textL === 'admin. do grupo' || textL === 'admin do grupo' || textL === 'group admin') {
                        let container = el.parentElement;
                        for (let i = 0; i < 5; i++) {
                            if (container) {
                                const cText = container.innerText || '';
                                const cMatches = cText.match(phoneRegex);
                                if (cMatches) {
                                    cMatches.forEach(m => adminNumbers.add(m.replace(/[\r\n]+/g, ' ').trim()));
                                    break;
                                }
                                container = container.parentElement;
                            }
                        }
                    }
                }
            });
        };

        // 3. Robô rolando a tela sozinho e coletando dinamicamente
        let lastScrollTop = -1;
        let scrollAttempts = 0;

        const scrollInterval = setInterval(() => {
            collect(); // Coleta o que está na tela agora
            
            scrollableDiv.scrollTop += 400; // Desce a barra
            
            // Verifica se a barra parou de descer (chegou ao fim)
            if (scrollableDiv.scrollTop === lastScrollTop) {
                scrollAttempts++;
                if (scrollAttempts >= 3) {
                    clearInterval(scrollInterval);
                    finishExtraction();
                }
            } else {
                lastScrollTop = scrollableDiv.scrollTop;
                scrollAttempts = 0;
            }
        }, 600); // 600ms para dar tempo do WhatsApp renderizar os próximos números

        function finishExtraction() {
            let finalContacts = Array.from(contacts);
            
            if (request.ignoreAdmins) {
                const adminsArr = Array.from(adminNumbers);
                finalContacts = finalContacts.filter(c => !adminsArr.includes(c));
            }
            
            if(finalContacts.length === 0) {
                chrome.runtime.sendMessage({ action: 'extractionDone', success: false, error: 'Nenhum contato capturado.' });
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,Telefone\n";
            finalContacts.forEach(contact => {
                csvContent += `${contact}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `contatos_whatsapp_${finalContacts.length}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            chrome.runtime.sendMessage({ action: 'extractionDone', success: true, count: finalContacts.length });
        }
    }
    return true; 
});
