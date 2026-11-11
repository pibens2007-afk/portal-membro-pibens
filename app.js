// ⚙️ CONFIG
const API_URL = 'https://script.google.com/macros/s/AKfycbyY9urDX7Sf8ye4hnHESioXI_KxY8rlcZ64a7_KOqM6IZFo50hA523X7E3tHdkZWo7rzA/exec';

// ═══════════════════════════════════════════════════════════
// AUTH & HELPERS
// ═══════════════════════════════════════════════════════════
const Auth = {
  KEY: 'pibens_membro',
  salvar: m => localStorage.setItem(Auth.KEY, JSON.stringify(m)),
  get: () => { const r = localStorage.getItem(Auth.KEY); return r ? JSON.parse(r) : null; },
  sair: () => {
    const sairAgora = () => { localStorage.removeItem(Auth.KEY); location.reload(); };
    if (typeof Audit !== 'undefined') Audit.registrar('logout', 'Saiu do Portal do Membro').finally(sairAgora);
    else sairAgora();
  }
};

async function api(funcao, ...args) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ funcao, args })
    });
    return await res.json();
  } catch (e) { return { ok: false, erro: 'Sem conexão' }; }
}

// ═══════════════════════════════════════════════════════════
// AUDITORIA — envia as atividades do portal para o Log do ADM
// ═══════════════════════════════════════════════════════════
const AUDIT_URL = 'https://script.google.com/macros/s/AKfycbwUl-1KPF40lIc8FR8itFEYVkq5XhQlNXVvM6D_Hp2-3a2gaVAwg1AX1gZFS0hcaPeS_w/exec';
const AUDIT_MODULO = 'Portal do Membro';

const Audit = {
  FILA_KEY: 'pibens_audit_fila',

  _identidade() {
    const m = Auth.get() || {};
    return {
      nome: m.nome || 'Membro',
      usuario: m.cpf || m.email || ('membro#' + (m.id || '?'))
    };
  },

  registrar(acao, descricao) {
    const m = this._identidade();
    if (!m.usuario || !Auth.get()) return Promise.resolve(false);
    const registro = {
      Acao: acao,
      Modulo: AUDIT_MODULO,
      Descricao: descricao,
      Usuario: m.usuario,
      UsuarioNome: m.nome,
      Data: new Date().toISOString()
    };
    return this._enviar(registro);
  },

  async _enviar(registro) {
    try {
      const res = await fetch(AUDIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ funcao: 'gravarLog', args: [registro] })
      });
      const j = await res.json();
      if (j && j.ok) return true;
      this._enfileirar(registro);
      return false;
    } catch (e) {
      this._enfileirar(registro);
      return false;
    }
  },

  _enfileirar(registro) {
    try {
      const fila = JSON.parse(localStorage.getItem(this.FILA_KEY) || '[]');
      fila.push(registro);
      while (fila.length > 100) fila.shift();
      localStorage.setItem(this.FILA_KEY, JSON.stringify(fila));
    } catch (e) {}
  },

  async enviarPendentes() {
    let fila = [];
    try { fila = JSON.parse(localStorage.getItem(this.FILA_KEY) || '[]'); } catch (e) { return; }
    if (!fila.length) return;
    localStorage.removeItem(this.FILA_KEY);
    for (const registro of fila) { await this._enviar(registro); }
  }
};

function tempoRelativo(iso) {
  if (!iso) return '';
  const data = new Date(iso); const agora = new Date(); const diff = Math.floor((agora - data) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return 'há ' + Math.floor(diff / 60) + ' min';
  if (diff < 86400) return 'há ' + Math.floor(diff / 3600) + 'h';
  if (diff < 172800) return 'ontem';
  if (diff < 604800) return 'há ' + Math.floor(diff / 86400) + ' dias';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function linkify(texto) {
  if (!texto) return '';
  return texto.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline;word-break:break-all;opacity:0.9;">$1</a>');
}

function formatarCPF(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  input.value = v;
}

// ═══════════════════════════════════════════════════════════
// TEMA
// ═══════════════════════════════════════════════════════════
function aplicarTema(tema, escuro) {
  document.body.classList.remove('tema-azul', 'tema-verde', 'tema-rosa', 'tema-laranja', 'tema-vermelho', 'tema-amarelo');
  if (tema && tema !== 'roxo') document.body.classList.add('tema-' + tema);
  if (escuro) document.body.classList.add('modo-escuro');
  else document.body.classList.remove('modo-escuro');
  const metaTema = document.getElementById('themeColor');
  if (metaTema) metaTema.setAttribute('content', escuro ? '#070B18' : '#FAFAFA');
}

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════
const btnEntrar = document.getElementById('btnEntrar');

async function entrar() {
  const login = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('erroLogin');

  if (!login) { erro.textContent = 'Digite seu CPF'; return; }
  if (!senha) { erro.textContent = 'Digite sua senha'; return; }

  const soNumeros = login.replace(/\D/g, '');
  const pareceCPF = soNumeros.length > 0 && login.match(/^[\d.\-\s]+$/);

  if (pareceCPF && soNumeros.length !== 11) { erro.textContent = 'CPF incompleto.'; return; }

  btnEntrar.disabled = true; btnEntrar.textContent = 'Entrando...'; erro.textContent = '';

  const res = await api('membroLogin', login, senha);

  if (res.ok && res.data) {
    Auth.salvar(res.data); iniciarApp();
  } else {
    const msg = res.erro || '';
    if (msg.indexOf('não encontrado') > -1) erro.textContent = 'CPF não cadastrado. Fale com um líder.';
    else if (msg.indexOf('Senha') > -1) erro.textContent = 'Senha incorreta.';
    else erro.textContent = msg || 'Erro ao entrar';
    btnEntrar.disabled = false; btnEntrar.textContent = 'Entrar';
  }
}

if(btnEntrar) {
  btnEntrar.addEventListener('click', entrar);
  document.getElementById('senha').addEventListener('keypress', e => { if (e.key === 'Enter') entrar(); });
}

// ═══════════════════════════════════════════════════════════
// APP INIT
// ═══════════════════════════════════════════════════════════
let membro = null;

const titulos = {
  inicio: 'Início', agenda: 'Agenda', escalas: 'Minhas Escalas', mural: 'Mural', oracao: 'Oração', contribuir: 'Contribuir',
  devocional: 'Devocional', perfil: 'Perfil', aniversariantes: 'Aniversariantes', talentos: 'Meus Talentos',
  igreja: 'Nossa Igreja', leitura: 'Plano de Leitura', testemunhos: 'Testemunhos', enquetes: 'Enquetes', estilo: 'Meu Estilo'
};

function iniciarApp() {
  membro = Auth.get();
  document.getElementById('telaLogin').classList.add('hidden');
  document.getElementById('telaApp').classList.remove('hidden');

  Audit.registrar('acesso', 'Entrou no Portal do Membro');
  Audit.enviarPendentes();
  
  const prefs = JSON.parse(localStorage.getItem('pibens_prefs') || '{}');
  aplicarTema(prefs.tema || 'roxo', prefs.escuro || false);
  
  document.getElementById('avatar').textContent = (membro.nome || '?').charAt(0).toUpperCase();
  document.getElementById('avatar').setAttribute('aria-label', 'Abrir perfil de ' + (membro.nome || 'membro'));
  document.getElementById('avatar').addEventListener('click', () => render('perfil'));

  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
    el.addEventListener('click', () => {
      render(el.dataset.page);
    });
  });

  render('inicio');
}

function render(page) {
  document.body.classList.toggle('home-theme', page === 'inicio');
  document.getElementById('titulo').textContent = titulos[page] || 'PIBENS';
  const c = document.getElementById('conteudo');
  c.classList.toggle('home-content', page === 'inicio');
  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
    const active = el.dataset.page === page;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Carregando...</div>';

  if (render._ultima !== page) {
    render._ultima = page;
    if (page !== 'inicio') Audit.registrar('acesso', 'Acessou o módulo: ' + (titulos[page] || page));
  }

  if (page === 'inicio') return renderInicio(c);
  if (page === 'agenda') return renderAgenda(c);
  if (page === 'escalas') return renderEscalas(c);
  if (page === 'mural') return renderMuralCompleto(c);
  if (page === 'oracao') return renderOracao(c);
  if (page === 'contribuir') return renderContribuir(c);
  if (page === 'devocional') return renderDevocional(c);
  if (page === 'perfil') return renderPerfil(c);
  if (page === 'aniversariantes') return renderAniversariantes(c);
  if (page === 'talentos') return renderTalentos(c);
  if (page === 'igreja') return renderIgreja(c);
  if (page === 'leitura') return renderLeitura(c);
  if (page === 'testemunhos') return renderTestemunhos(c);
  if (page === 'enquetes') return renderEnquetes(c);
  if (page === 'estilo') return renderEstilo(c);
}

// ═══════════════════════════════════════════════════════════
// 🏠 INÍCIO (Com Menu Grid Completo)
// ═══════════════════════════════════════════════════════════
function menuIcon(nome) {
  const icones = {
    mural: '<path fill="#f2c94c" d="M8 22h8l-1.5-8h-5z"/><path fill="#f4a261" d="M7 16h10l-1.2-6H8.2z"/><path fill="#ef5350" d="M9 9 42 17V5L9 8z"/><path fill="#ff7b54" d="M42 5h5v12h-5z"/><path fill="#55c6a9" d="m11 10 27-4v8z"/>',
    agenda: '<rect x="8" y="9" width="48" height="44" rx="6" fill="#f4f1de"/><path fill="#e76f51" d="M8 13a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v9H8z"/><path fill="#4d9de0" d="M17 5h6v13h-6zM41 5h6v13h-6z"/><path fill="#7abf9e" d="M16 29h7v7h-7zM29 29h7v7h-7zM42 29h7v7h-7zM16 41h7v7h-7zM29 41h7v7h-7z"/><path fill="#f2c94c" d="M42 41h7v7h-7z"/>',
    escalas: '<path fill="#f5b544" d="M14 9h36a4 4 0 0 1 4 4v39H10V13a4 4 0 0 1 4-4z"/><path fill="#fff" d="M17 16h30v29H17z"/><path fill="#4d9de0" d="M22 22h7v7h-7zM34 22h7v7h-7z"/><path fill="#55c6a9" d="M22 34h7v7h-7z"/><path fill="#e76f51" d="M34 34h7v7h-7z"/>',
    oracao: '<path fill="#f2c078" d="M10 39c-5-7-5-13-2-15 3-2 6 3 9 7l4 4V17c0-4 6-4 6 0v14-9c0-4 6-4 6 0v9-6c0-4 6-4 6 0v7c4-5 9-5 10-1 1 3-4 11-11 17H22z"/><path fill="#e89b63" d="M23 52h18l-3 5H25z"/>',
    contribuir: '<ellipse cx="32" cy="18" rx="19" ry="9" fill="#f2c94c"/><path fill="#d89e21" d="M13 18v27c0 5 9 9 19 9s19-4 19-9V18c0 5-9 9-19 9s-19-4-19-9z"/><ellipse cx="32" cy="42" rx="19" ry="9" fill="#f4bd3f"/><path fill="#fff4cc" d="M34 30c-6-2-12 1-12 6 0 8 14 5 14 10 0 3-7 4-12 1l-2 4c3 2 7 3 11 2v4h4v-5c4-1 7-4 7-8 0-9-14-6-14-11 0-2 4-3 8-1z"/>',
    devocional: '<path fill="#f2c94c" d="m32 4 7 18 19 1-15 12 5 19-16-11-16 11 5-19L6 23l19-1z"/><path fill="#fff1a8" d="m32 12 5 14 13 1-10 8 3 13-11-8-11 8 3-13-10-8 13-1z"/><circle cx="50" cy="13" r="5" fill="#ef8354"/>',
    leitura: '<path fill="#f4f1de" d="M6 13c9-4 18-3 26 3v37c-8-6-17-7-26-3z"/><path fill="#fff" d="M58 13c-9-4-18-3-26 3v37c8-6 17-7 26-3z"/><path fill="#4d9de0" d="M6 13c9-4 18-3 26 3v5c-8-6-17-7-26-3zM58 13c-9-4-18-3-26 3v5c8-6 17-7 26-3z"/><path fill="#e76f51" d="M29 16h6v36h-6z"/><path fill="#c6a15b" d="M12 25h11v3H12zM12 32h11v3H12zM41 25h11v3H41zM41 32h11v3H41z"/>',
    testemunhos: '<rect x="25" y="7" width="14" height="31" rx="7" fill="#6c7bd1"/><path fill="#f0c75e" d="M29 12h6v19h-6z"/><path fill="#4d9de0" d="M21 27a11 11 0 0 0 22 0h5a16 16 0 0 1-13 16v8h8v5H21v-5h9v-8a16 16 0 0 1-14-16z"/>',
    enquetes: '<circle cx="32" cy="32" r="26" fill="#e76f51"/><circle cx="32" cy="32" r="19" fill="#f2c94c"/><circle cx="32" cy="32" r="12" fill="#55c6a9"/><circle cx="32" cy="32" r="5" fill="#4d9de0"/><path fill="#57618f" d="m31 31 22-23 4 4-23 22z"/><circle cx="54" cy="9" r="6" fill="#ef5350"/>',
    aniversariantes: '<path fill="#e76f51" d="M10 29h44v23H10z"/><path fill="#f2c94c" d="M10 35h44v6H10z"/><path fill="#f4f1de" d="M7 25h50v8H7z"/><path fill="#55c6a9" d="M17 25c-8-5-1-12 4-6 5-9 12-4 5 6z"/><path fill="#4d9de0" d="M29 25c-8-5-1-12 4-6 5-9 12-4 5 6z"/><path fill="#ef8354" d="M41 25c-8-5-1-12 4-6 5-9 12-4 5 6z"/>',
    talentos: '<path fill="#e76f51" d="M8 24h48v32H8z"/><path fill="#f2c94c" d="M8 24h48v8H8z"/><path fill="#55c6a9" d="M28 24h8v32h-8z"/><path fill="#4d9de0" d="M32 24c-15-1-17-17-8-17 5 0 8 8 8 17z"/><path fill="#6c7bd1" d="M32 24c15-1 17-17 8-17-5 0-8 8-8 17z"/>',
    igreja: '<path fill="#f2c94c" d="M7 27 32 8l25 19v29H7z"/><path fill="#e76f51" d="M14 29h36v27H14z"/><path fill="#f4f1de" d="M27 39h10v17H27zM18 34h6v7h-6zM40 34h6v7h-6z"/><path fill="#4d9de0" d="M29 6h6v15h-6zM25 11h14v5H25z"/>',
    perfil: '<circle cx="32" cy="22" r="13" fill="#f2c078"/><path fill="#4d9de0" d="M9 57c1-15 10-23 23-23s22 8 23 23z"/><path fill="#e76f51" d="M19 19c2-13 24-17 29-1-5-3-9-7-12-10-4 6-10 10-17 11z"/>',
    sair: '<path fill="#f2c94c" d="M11 7h26v50H11z"/><path fill="#e76f51" d="M33 7h20v50H33z"/><circle cx="39" cy="32" r="2" fill="#fff"/><path fill="#4d9de0" d="M4 29h25v-8l13 11-13 11v-8H4z"/>'
  };
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${icones[nome] || ''}</svg>`;
}

async function renderInicio(c) {
  const hojeStr = new Date().toISOString().split('T')[0];
  const cacheDev = localStorage.getItem('pibens_dev_' + hojeStr);
  let devTexto = cacheDev || 'Carregando palavra do dia...';
  const comunidade = [
    { page: 'mural', label: 'Mural', icon: 'mural' },
    { page: 'agenda', label: 'Agenda', icon: 'agenda' },
    { page: 'oracao', label: 'Oração', icon: 'oracao' },
    { page: 'leitura', label: 'Leitura', icon: 'leitura' },
    { page: 'testemunhos', label: 'Testemunhos', icon: 'testemunhos' },
    { page: 'enquetes', label: 'Enquetes', icon: 'enquetes' }
  ];
  const igreja = [
    { page: 'igreja', label: 'Nossa Igreja', icon: 'igreja' },
    { page: 'escalas', label: 'Escalas', icon: 'escalas' },
    { page: 'aniversariantes', label: 'Aniversário', icon: 'aniversariantes' },
    { page: 'talentos', label: 'Talentos', icon: 'talentos' },
    { page: 'contribuir', label: 'Contribuir', icon: 'contribuir' },
    { page: 'perfil', label: 'Perfil', icon: 'perfil' }
  ];
  const renderAtalho = item => `
    <button class="grid-item" type="button" onclick="render('${item.page}')">
      <span class="grid-icon">${menuIcon(item.icon)}</span>
      <span class="grid-text">${item.label}</span>
    </button>`;

  c.innerHTML = `
    <section class="devotional-hero" aria-labelledby="devotional-title">
      <div class="devotional-copy">
        <div class="devotional-badge" id="devotional-title">
          <span class="devotional-badge-icon">${menuIcon('leitura')}</span>
          <span>Devocional do Dia</span>
        </div>
        <p class="devotional-verse" id="texto-dev" aria-live="polite">${devTexto}</p>
        <button class="devotional-action" type="button" onclick="render('devocional')">
          <span class="devotional-action-icon">${menuIcon('leitura')}</span>
          <span>Ler Devocional</span><span aria-hidden="true">→</span>
        </button>
      </div>
      <div class="devotional-art" aria-hidden="true">${menuIcon('leitura')}</div>
    </section>

    <section class="menu-section" aria-labelledby="community-title">
      <div class="section-heading">
        <h2 id="community-title">Comunidade</h2>
        <button class="view-more" type="button" onclick="render('mural')">Ver mais <span aria-hidden="true">›</span></button>
      </div>
      <div class="menu-grid">${comunidade.map(renderAtalho).join('')}</div>
    </section>

    <section class="menu-section" aria-labelledby="church-title">
      <div class="section-heading">
        <h2 id="church-title">Igreja</h2>
        <button class="view-more" type="button" onclick="render('igreja')">Ver mais <span aria-hidden="true">›</span></button>
      </div>
      <div class="menu-grid">${igreja.map(renderAtalho).join('')}</div>
    </section>

    <div id="container-resto">
      <div class="home-feed-loading" role="status"><div class="spinner"></div>Carregando avisos e escalas...</div>
    </div>
  `;
  const containerResto = document.getElementById('container-resto');

  if (!cacheDev) {
    api('membroDevocional', 'encorajamento').then(dev => {
      if (dev.ok && dev.data && dev.data.texto) {
        localStorage.setItem('pibens_dev_' + hojeStr, dev.data.texto);
        const el = document.getElementById('texto-dev');
        if (el) el.textContent = dev.data.texto;
      } else {
        const el = document.getElementById('texto-dev');
        if (el) el.textContent = 'O Senhor é o meu pastor, nada me faltará. — Salmos 23:1';
      }
    });
  }

  const r = await api('membroInicioGeral', membro.id);
  
  if (!r.ok) {
    if (containerResto.isConnected) containerResto.innerHTML = '<div class="empty"><div class="icon">📡</div>Erro ao carregar dados. Verifique sua internet.</div>';
    return;
  }
  if (!containerResto.isConnected) return;

  const dados = r.data || {};
  const eventos = (dados.agenda || []); const prox = eventos.length ? eventos[0] : null;
  const avisos = (dados.mural || []); const proximaEscala = (dados.escalas || []).length ? dados.escalas[0] : null;
  const cultos = (dados.cultos || []); 
  
  const avisoFixado = avisos.find(a => a.fixado) || avisos[0];
  const temMaisAvisos = avisos.length > 1;
  const proxTexto = prox ? [prox.titulo || 'Evento', prox.data].filter(Boolean).join(' — ') : '';

  let escalasCard = '';
  if (proximaEscala) {
    const funcoes = proximaEscala.minhasFuncoes.map(f => f.label).join(' · ');
    escalasCard = `<div class="card"><h3>📋 Minha Próxima Escala</h3><p><strong>${proximaEscala.data}</strong> — ${proximaEscala.tipo}</p><p style="margin-top:6px;">${funcoes}</p></div>`;
  }

  let avisoCard = '';
  if (avisoFixado) {
    const tipo = avisoFixado.tipo || 'Importante';
    const cores = { 'Info': { bg: '#2563eb', txt: '#ffffff' }, 'Importante': { bg: '#f59e0b', txt: '#ffffff' }, 'Urgente': { bg: '#dc2626', txt: '#ffffff' }, 'Evento': { bg: '#7c3aed', txt: '#ffffff' } };
    const style = cores[tipo] || cores['Importante']; const tempo = tempoRelativo(avisoFixado.criado_em); const msgFormatada = linkify(avisoFixado.mensagem || '');

    if (avisoFixado.fixado) {
      avisoCard = `<div class="card" style="background:linear-gradient(135deg, ${style.bg}dd 0%, ${style.bg} 100%); color:${style.txt}; box-shadow:0 8px 24px ${style.bg}66; padding:20px; position:relative; overflow:hidden; border:none;"><div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;"><span style="font-size:24px;">📢</span><span style="background:rgba(255,255,255,0.3); padding:4px 10px; border-radius:20px; font-size:11px; font-weight:800; letter-spacing:0.5px;">AVISO IMPORTANTE</span></div><h3 style="color:#fff; font-size:22px; font-weight:800; margin-bottom:12px; line-height:1.2;">${avisoFixado.titulo}</h3><p style="color:#fff; font-size:15px; line-height:1.6; opacity:0.95; margin-bottom:16px;">${msgFormatada}</p><div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.2); padding-top:12px;"><span style="font-size:12px; color:rgba(255,255,255,0.8);">👤 ${avisoFixado.autor || 'Igreja'} · ⏰ ${tempo}</span>${temMaisAvisos ? `<button onclick="render('mural')" style="width:auto; padding:6px 14px; font-size:12px; background:rgba(255,255,255,0.2); color:#fff; border-radius:20px; box-shadow:none;">Ver todos →</button>` : ''}</div></div>`;
    } else {
      avisoCard = `<div class="card"><h3>📢 ${avisoFixado.titulo}</h3><p>${msgFormatada}</p>${temMaisAvisos ? `<button onclick="render('mural')" style="margin-top:10px; background:#6B7280; font-size:13px; padding:8px;">Ver todos os avisos →</button>` : ''}</div>`;
    }
  } else { avisoCard = `<div class="card"><h3>💬 Mural</h3><p>Sem avisos no momento</p></div>`; }

  let cultosCard = '';
  if (cultos.length > 0) {
    cultosCard = `
      <section class="home-cultos">
        <h3>🎥 Últimos Cultos</h3>
        ${cultos.slice(0, 2).map(culto => {
          const dataFormatada = new Date(culto.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          const temLink = culto.link && culto.link.trim() !== '';
          return `
            <div class="card" style="margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <span class="badge" style="background:#e0e7ff; color:#4338ca; margin-bottom:8px;">${culto.tipo}</span>
                <span class="home-culto-date">📅 ${dataFormatada}</span>
              </div>
              <h4>${culto.tema || 'Culto'}</h4>
              <p>👤 Pregador: ${culto.pregador || 'Não informado'}</p>
              ${temLink ? `<a href="${culto.link}" target="_blank" style="display:inline-flex; align-items:center; gap:8px; background:#dc2626; color:#fff; padding:8px 16px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:700;"><i class="fab fa-youtube"></i> Assistir no YouTube</a>` : `<p style="font-size:12px; color:#9CA3AF; margin:0;">Sem link de gravação</p>`}
            </div>
          `;
        }).join('')}
      </section>
    `;
  }

  const eventoCard = prox ? `
    <button class="home-event" type="button" onclick="render('agenda')" aria-label="Abrir agenda do próximo evento">
      <span class="home-event-icon">${menuIcon('agenda')}</span>
      <span class="home-event-copy"><strong>Próximos Eventos</strong><span>${proxTexto}</span></span>
      <span class="home-event-arrow" aria-hidden="true">→</span>
    </button>
  ` : '';

  containerResto.innerHTML = `
    ${eventoCard}
    ${avisoCard}
    ${escalasCard}
    ${cultosCard}
  `;
}

// ═══════════════════════════════════════════════════════════
// DEMAIS TELAS
// ═══════════════════════════════════════════════════════════
async function renderAgenda(c) {
  const agenda = await api('membroAgenda'); const pres = await api('membroPresencas', membro.id);
  const presencasMap = {}; (pres.data || []).forEach(p => presencasMap[p.evento_id] = p.status);
  const eventos = (agenda.data || []);
  if (!eventos.length) { c.innerHTML = '<div class="empty"><div class="icon">📅</div>Sem eventos no momento</div>'; return; }
  c.innerHTML = eventos.map(e => { const status = presencasMap[e.id] || ''; return `<div class="card"><h3>${e.titulo}</h3><p>${e.data}${e.hora ? ' às ' + e.hora : ''}</p>${e.local ? '<p>📍 ' + e.local + '</p>' : ''}<div class="presenca-btns"><button class="btn-presenca vou ${status === 'vou' ? 'ativo' : ''}" onclick="setPresenca('${e.id}','vou',this)">✅ Vou</button><button class="btn-presenca nao_vou ${status === 'nao_vou' ? 'ativo' : ''}" onclick="setPresenca('${e.id}','nao_vou',this)">❌ Não vou</button></div></div>`; }).join('');
}
async function setPresenca(evento_id, status, btn) { const card = btn.closest('.presenca-btns'); card.querySelectorAll('.btn-presenca').forEach(b => b.classList.remove('ativo')); btn.classList.add('ativo'); await api('membroSetPresenca', membro.id, evento_id, status); Audit.registrar('editar', 'Registrou presença (' + (status === 'vou' ? 'Vou' : 'Não vou') + ') no evento #' + evento_id); }

async function renderEscalas(c) {
  const r = await api('membroEscalas', membro.id); const escalas = r.data || [];
  if (!escalas.length) { c.innerHTML = '<div class="empty"><div class="icon">📋</div>Você não está escalado em nenhum culto no momento.</div>'; return; }
  c.innerHTML = escalas.map(e => { const funcoes = e.minhasFuncoes.map(f => `<span class="badge" style="margin-right:4px;margin-bottom:4px;display:inline-block;">${f.label}</span>`).join(''); return `<div class="card"><h3>${e.tipo || 'Culto'}</h3><p><strong>📅 ${e.data}</strong> ${e.horario ? 'às ' + e.horario : ''}</p><div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;">${funcoes}</div>${e.observacoes ? '<p style="margin-top:10px;font-size:13px;color:#6B7280;">💬 ' + e.observacoes + '</p>' : ''}</div>`; }).join('');
}

const REACOES = { amo: { emoji: '❤️', label: 'Amei' }, orando: { emoji: '🙏', label: 'Orando' }, fogo: { emoji: '🔥', label: 'Fogo' }, uau: { emoji: '😮', label: 'Uau' }, triste: { emoji: '😢', label: 'Triste' } };
async function renderMuralCompleto(c) {
  const r = await api('membroMuralCompleto', membro.id); const avisos = r.data || [];
  if (!avisos.length) { c.innerHTML = '<div class="empty"><div class="icon">📢</div>Sem avisos no momento</div>'; return; }
  const TIPOS_MURAL = { 'Info': { cor: '#2563eb', bg: '#eff6ff', icon: '📘', label: 'Informativo' }, 'Importante': { cor: '#f59e0b', bg: '#fef3c7', icon: '⚠️', label: 'Importante' }, 'Urgente': { cor: '#dc2626', bg: '#fee2e2', icon: '🔔', label: 'Urgente' }, 'Evento': { cor: '#7c3aed', bg: '#ede9fe', icon: '📅', label: 'Evento' } };
  c.innerHTML = avisos.map(a => {
    const tipo = a.tipo || 'Info'; const cfg = TIPOS_MURAL[tipo] || TIPOS_MURAL['Info']; const tempo = tempoRelativo(a.criado_em); const msgFormatada = linkify(a.mensagem || '').replace(/color:#fff/g, 'color:#8B5CF6'); const destacado = a.fixado || tipo === 'Urgente'; const bgCard = destacado ? cfg.bg : '#fff'; const bordaCard = destacado ? `5px solid ${cfg.cor}` : 'none';
    const badges = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"><span style="background:${cfg.cor};color:#fff;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;">${cfg.icon} ${cfg.label.toUpperCase()}</span>${a.fixado ? `<span style="background:#fff;color:${cfg.cor};border:1.5px solid ${cfg.cor};padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;">📌 FIXADO</span>` : ''}</div>`;
    const reacoesHtml = Object.keys(REACOES).map(k => { const r = REACOES[k]; const qtd = a.reacoes[k] || 0; const ativa = a.minha_reacao === k; return `<button type="button" class="btn-reacao ${ativa ? 'ativa' : ''}" aria-label="${r.label}${qtd > 0 ? `, ${qtd} reações` : ''}" title="${r.label}" onclick="reagirMural('${a.id}','${k}',this)"><span>${r.emoji}</span>${qtd > 0 ? `<span class="reacao-count">${qtd}</span>` : ''}</button>`; }).join('');
    return `<div class="card" style="background:${bgCard};border-left:${bordaCard};">${badges}<h3 style="color:${destacado ? cfg.cor : '#1F2937'};font-size:16px;line-height:1.3;margin-bottom:8px;">${a.titulo}</h3><p style="color:#374151;font-size:14px;line-height:1.6;">${msgFormatada}</p><p style="margin-top:10px;font-size:12px;color:#6B7280;">${a.autor ? '👤 ' + a.autor + ' · ' : ''}⏰ ${tempo}</p><div class="reacoes-bar">${reacoesHtml}</div></div>`;
  }).join('');
}
async function reagirMural(aviso_id, reacao, btn) { btn.style.transform = 'scale(1.3)'; setTimeout(() => { btn.style.transform = ''; }, 200); await api('membroMuralReagir', membro.id, aviso_id, reacao); Audit.registrar('editar', 'Reagiu com "' + reacao + '" ao aviso #' + aviso_id); render('mural'); }

async function renderOracao(c) {
  const r = await api('membroPedidos', membro.id); const pedidos = r.data || [];
  c.innerHTML = `<div class="card"><h3>Novo pedido</h3><textarea id="txtPedido" placeholder="Escreva seu pedido de oração..."></textarea><label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px"><input type="checkbox" id="chkAnonimo" style="width:auto;margin:0"> Enviar como anônimo</label><button onclick="criarPedido(this)">Enviar pedido</button></div><h3 style="margin:16px 0 8px;font-size:14px;color:#6B7280">Meus pedidos</h3>${pedidos.length ? pedidos.map(p => `<div class="card"><p>${p.texto}</p><div style="margin-top:8px"><span class="badge">${p.status}</span> ${p.anonimo ? '<span class="badge">anônimo</span>' : ''}</div></div>`).join('') : '<div class="empty"><div class="icon">🙏</div>Nenhum pedido ainda</div>'}`;
}
async function criarPedido(btn) {
  const texto = document.getElementById('txtPedido').value.trim();
  const anonimo = document.getElementById('chkAnonimo').checked;
  if (!texto) return alert('Escreva algo');
  btn.disabled = true; btn.textContent = 'Enviando...';
  const r = await api('membroCriarPedido', membro.id, texto, anonimo);
  if (r.ok && r.data && r.data.success) { Audit.registrar('criar', 'Enviou pedido de oração' + (anonimo ? ' (anônimo)' : '')); alert('Pedido enviado com sucesso!'); render('oracao'); } 
  else { alert('ERRO: ' + (r.erro || 'Não foi possível enviar o pedido.')); btn.disabled = false; btn.textContent = 'Enviar pedido'; }
}

async function renderContribuir(c) {
  const r = await api('membroContribuir'); const dados = r.data || {};
  if (!dados.pix) { c.innerHTML = '<div class="empty"><div class="icon">💰</div>Indisponível</div>'; return; } const pix = dados.pix;
  c.innerHTML = `<div class="card card-destaque"><h3>💰 Contribuir com a Obra</h3><p>${dados.mensagem || ''}</p></div><div class="card"><h3>🔑 Chave PIX</h3><p style="font-size:13px;color:#6B7280;margin-bottom:8px;">Tipo: ${pix.tipo}</p><div style="background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(236,72,153,0.08));padding:16px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;"><code style="font-size:14px;font-weight:600;color:#8B5CF6;word-break:break-all;">${pix.chave}</code><button onclick="copiarPix('${pix.chave}', this)" style="width:auto;padding:8px 12px;font-size:13px;">📋</button></div></div><div class="card"><h3>👤 Beneficiário</h3><p><strong>${pix.beneficiario}</strong></p>${pix.cidade ? '<p style="margin-top:6px;">🏙️ ' + pix.cidade + '</p>' : ''}</div><div class="card"><h3>📖 Sobre o Dízimo</h3><p style="font-size:13px;line-height:1.7;">"Trazei todos os dízimos à casa do tesouro..." — Malaquias 3:10</p></div>`;
}
function copiarPix(chave, btn) { navigator.clipboard.writeText(chave).then(() => { Audit.registrar('acesso', 'Copiou a chave PIX'); const original = btn.textContent; btn.textContent = '✅'; setTimeout(() => { btn.textContent = original; }, 2000); }).catch(() => alert('Chave PIX: ' + chave)); }

async function renderDevocional(c) {
  c.innerHTML = `<div class="card"><h3>✨ Devocional com IA</h3><p style="margin-bottom:12px">Escolha um tema e receba uma palavra:</p><select id="temaDev"><option value="encorajamento">Encorajamento</option><option value="gratidao">Gratidão</option><option value="fe">Fé</option><option value="perdao">Perdão</option><option value="esperanca">Esperança</option><option value="amor">Amor</option></select><button onclick="gerarDevocional()">Gerar devocional</button></div><div id="resultDev"></div>`;
}
async function gerarDevocional() { const tema = document.getElementById('temaDev').value; const box = document.getElementById('resultDev'); box.innerHTML = '<div class="loading"><div class="spinner"></div>A IA está escrevendo...</div>'; const r = await api('membroDevocional', tema); const texto = (r.ok && r.data && r.data.texto) ? r.data.texto : 'Tente novamente.'; box.innerHTML = `<div class="card card-destaque"><p>${texto}</p></div>`; Audit.registrar('acesso', 'Gerou devocional com IA (tema: ' + tema + ')'); }

async function renderPerfil(c) {
  const r = await api('membroPerfil', membro.id); const p = (r.data) || {};
  const avatarHtml = p.foto_perfil ? `<img src="${p.foto_perfil}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (p.nome||'?').charAt(0).toUpperCase();
  c.innerHTML = `
    <div class="card"><div style="text-align:center;margin-bottom:16px"><div class="avatar" style="width:64px;height:64px;font-size:24px;margin:0 auto 8px;overflow:hidden;">${avatarHtml}</div><h3>${p.nome || 'Membro'}</h3><p>${membro.email || membro.cpf || ''}</p>${p.bio ? `<p style="font-size:13px;color:#6B7280;font-style:italic;margin-top:8px;">"${p.bio}"</p>` : ''}</div></div>
    <div class="card"><h3>Meus dados</h3><label class="label-campo">Nome</label><input value="${p.nome||''}" disabled style="background:#F3F4F6"><label class="label-campo">Telefone</label><input id="pTel" value="${p.telefone||''}" placeholder="(00) 00000-0000"><label class="label-campo">Endereço</label><input id="pEnd" value="${p.endereco||''}" placeholder="Rua, número, bairro"><button onclick="salvarPerfil()">Salvar alterações</button></div>
    <div class="card"><h3>🎨 Meu Estilo</h3><p style="margin-bottom:12px">Foto, tema de cores e modo escuro</p><button onclick="render('estilo')" class="btn-azul">Personalizar App</button></div>
    <div class="card"><h3>🔒 Segurança</h3><p style="margin-bottom:12px">Altere sua senha de acesso</p><button onclick="abrirTrocarSenha()" class="btn-azul">Trocar senha</button></div>
    <button onclick="Auth.sair()" class="btn-vermelho" style="margin-top:12px">Sair da conta</button>`;
}
async function salvarPerfil() { const dados = { telefone: document.getElementById('pTel').value, endereco: document.getElementById('pEnd').value }; await api('membroUpdatePerfil', membro.id, dados); Audit.registrar('editar', 'Atualizou telefone/endereço do perfil'); alert('Salvo!'); }

async function renderEstilo(c) {
  const r = await api('membroPerfil', membro.id); const p = r.data || {};
  const prefs = JSON.parse(localStorage.getItem('pibens_prefs') || '{}');
  const temaAtual = prefs.tema || 'roxo'; const escuroAtual = prefs.escuro || false;
  const temas = [ { id: 'roxo', cor: '#8B5CF6' }, { id: 'azul', cor: '#3B82F6' }, { id: 'verde', cor: '#10B981' }, { id: 'rosa', cor: '#EC4899' }, { id: 'laranja', cor: '#FB923C' }, { id: 'vermelho', cor: '#EF4444' }, { id: 'amarelo', cor: '#F59E0B' } ];

  c.innerHTML = `
    <div class="card"><h3>🖼️ Foto de Perfil</h3><div style="display:flex;flex-direction:column;align-items:center;gap:12px;"><div class="avatar" style="width:96px;height:96px;font-size:36px;overflow:hidden;border:4px solid var(--cor-principal);">${p.foto_perfil ? `<img src="${p.foto_perfil}" style="width:100%;height:100%;object-fit:cover;">` : (membro.nome || '?').charAt(0).toUpperCase()}</div><input type="file" id="inputFoto" accept="image/*" style="display:none" onchange="uploadFoto(this)"><button onclick="document.getElementById('inputFoto').click()" class="btn-azul" style="width:auto;padding:8px 16px;font-size:13px;">Escolher Foto</button></div></div>
    <div class="card"><h3>🎨 Tema de Cores</h3><div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:12px;">${temas.map(t => `<button onclick="mudarTema('${t.id}')" style="width:48px;height:48px;border-radius:50%;background:${t.cor};border:3px solid ${temaAtual === t.id ? '#fff' : 'transparent'};box-shadow:0 0 0 ${temaAtual === t.id ? '3px '+t.cor : 'none'};padding:0;"></button>`).join('')}</div></div>
    <div class="card"><h3>🌙 Modo Escuro</h3><div style="display:flex;justify-content:space-between;align-items:center;"><span>Ativar modo escuro</span><label class="switch"><input type="checkbox" id="chkEscuro" aria-label="Ativar modo escuro" ${escuroAtual ? 'checked' : ''} onchange="toggleEscuro(this)"><span class="slider"></span></label></div></div>
    <div class="card"><h3>✍️ Bio / Frase Pessoal</h3><textarea id="txtBio" placeholder="Ex: Servo do Senhor 🙏">${p.bio || ''}</textarea><button onclick="salvarBio(this)">Salvar Bio</button></div>
  `;
}

async function uploadFoto(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 300;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 300, 300);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      const r = await api('membroSalvarFoto', membro.id, base64);
      if (r.ok) { Audit.registrar('editar', 'Atualizou a foto de perfil'); alert('Foto salva!'); render('estilo'); } else { alert('Erro: ' + r.erro); }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function mudarTema(tema) { const prefs = JSON.parse(localStorage.getItem('pibens_prefs') || '{}'); prefs.tema = tema; localStorage.setItem('pibens_prefs', JSON.stringify(prefs)); aplicarTema(tema, prefs.escuro); api('membroSalvarTema', membro.id, tema, prefs.escuro); Audit.registrar('editar', 'Alterou o tema de cores para "' + tema + '"'); render('estilo'); }
function toggleEscuro(input) { const prefs = JSON.parse(localStorage.getItem('pibens_prefs') || '{}'); prefs.escuro = input.checked; localStorage.setItem('pibens_prefs', JSON.stringify(prefs)); aplicarTema(prefs.tema, input.checked); api('membroSalvarTema', membro.id, prefs.tema, input.checked); Audit.registrar('editar', input.checked ? 'Ativou o modo escuro' : 'Desativou o modo escuro'); }
async function salvarBio(btn) { const bio = document.getElementById('txtBio').value.trim(); btn.disabled = true; btn.textContent = 'Salvando...'; await api('membroSalvarBio', membro.id, bio); Audit.registrar('editar', 'Atualizou a bio do perfil'); alert('Bio salva!'); btn.disabled = false; btn.textContent = 'Salvar Bio'; }

async function renderAniversariantes(c) {
  const r = await api('membroAniversariantes'); const lista = r.data || [];
  if (!lista.length) { c.innerHTML = '<div class="empty"><div class="icon">🎂</div>Nenhum aniversariante este mês</div>'; return; }
  const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  c.innerHTML = `<div class="card card-destaque"><h3>🎂 Aniversariantes de ${mesNome}</h3><p>${lista.length} aniversariante(s) neste mês</p></div>${lista.map(a => { const msg = encodeURIComponent(`Feliz aniversário, ${a.nome}! 🎂🎉 Que Deus te abençoe ricamente! Um abraço de toda a igreja. 🙏`); return `<div class="card ${a.ehHoje ? 'card-destaque' : ''}"><h3>${a.ehHoje ? '🎉 HOJE! ' : ''}${a.nome}</h3><p>📅 Dia ${a.dia} — completa <strong>${a.idade} anos</strong></p><a href="https://wa.me/?text=${msg}" target="_blank" style="display:inline-block;margin-top:10px;padding:8px 14px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">💬 Mandar parabéns</a></div>`; }).join('')}`;
}

async function renderTalentos(c) {
  const meu = await api('membroMeuTalento', membro.id); const talentoAtual = (meu.data && meu.data.talento) ? meu.data.talento : '';
  const todos = await api('membroTalentosListar'); const lista = todos.data || [];
  c.innerHTML = `<div class="card card-destaque"><h3>🎁 Meus Talentos</h3><p>Compartilhe o que você sabe fazer pra servir a Deus e à igreja!</p></div><div class="card"><h3>✏️ ${talentoAtual ? 'Atualizar meu talento' : 'Cadastrar meu talento'}</h3><textarea id="txtTalento" placeholder="Ex: Toco violão, cozinho bem, faço design, etc.">${talentoAtual}</textarea><button onclick="salvarTalento(this)">Salvar</button></div><h3 style="margin:16px 0 8px;font-size:14px;color:#6B7280">Talentos na igreja (${lista.length})</h3>${lista.map(t => `<div class="card"><h3>👤 ${t.nome}</h3><p>${t.talento}</p></div>`).join('') || '<div class="empty"><div class="icon">🎁</div>Nenhum talento cadastrado ainda</div>'}`;
}
async function salvarTalento(btn) { const talento = document.getElementById('txtTalento').value.trim(); if (!talento) return alert('Escreva algo'); btn.disabled = true; btn.textContent = 'Salvando...'; await api('membroTalentosCadastrar', membro.id, talento); Audit.registrar('editar', 'Atualizou o talento: ' + talento.substring(0, 80)); alert('Salvo!'); render('talentos'); }

async function renderIgreja(c) {
  const r = await api('membroEstatisticas'); const d = r.data || {};
  c.innerHTML = `<div class="card card-destaque"><h3>📊 Nossa Igreja</h3><p>PIBENS — Encarnação de Salinas</p></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;"><div class="card" style="text-align:center;margin:0;"><div style="font-size:32px;margin-bottom:4px;">👥</div><div style="font-size:28px;font-weight:800;color:#8B5CF6;">${d.totalMembros || 0}</div><div style="font-size:12px;color:#6B7280;">Membros ativos</div></div><div class="card" style="text-align:center;margin:0;"><div style="font-size:32px;margin-bottom:4px;">🙋</div><div style="font-size:28px;font-weight:800;color:#EC4899;">${d.visitantesUltimoCulto || 0}</div><div style="font-size:12px;color:#6B7280;">Visitantes</div></div><div class="card" style="text-align:center;margin:0;"><div style="font-size:32px;margin-bottom:4px;">🙏</div><div style="font-size:28px;font-weight:800;color:#FB923C;">${d.pedidosMes || 0}</div><div style="font-size:12px;color:#6B7280;">Pedidos este mês</div></div><div class="card" style="text-align:center;margin:0;"><div style="font-size:32px;margin-bottom:4px;">🎂</div><div style="font-size:28px;font-weight:800;color:#FBBF24;">${d.aniversariantesMes || 0}</div><div style="font-size:12px;color:#6B7280;">Aniversariantes</div></div></div>${(d.aniversariantes && d.aniversariantes.length) ? `<div class="card"><h3>🎂 Aniversariantes do mês</h3>${d.aniversariantes.map(a => `<p style="margin-top:8px;">${a.ehHoje ? '🎉 ' : ''}<strong>${a.nome}</strong> — dia ${a.dia}</p>`).join('')}</div>` : ''}<div class="card"><h3>📖 Versículo</h3><p style="font-size:13px;line-height:1.7;">"Edificados sobre o fundamento dos apóstolos e dos profetas..." — Efésios 2:20</p></div>`;
}

async function renderLeitura(c) {
  const r = await api('membroLeituraHoje', membro.id); const d = r.data || {}; const caps = d.capitulos || []; const streak = d.streak || 0; const progresso = d.progresso || 0; const totalLidos = d.totalLidos || 0; const meta = d.metaAno || 1189;
  c.innerHTML = `<div class="card card-destaque"><h3>📖 Plano de Leitura</h3><p>Bíblia em 1 ano — ${caps.length} capítulo(s) por dia</p></div><div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h3 style="margin:0;">🔥 Sequência</h3><span style="font-size:24px;font-weight:800;color:#FB923C;">${streak} dia${streak === 1 ? '' : 's'}</span></div><p style="font-size:13px;">${streak > 0 ? 'Continue firme! Não quebre a corrente 🙏' : 'Comece hoje sua sequência!'}</p></div><div class="card"><h3>📊 Progresso anual</h3><div style="background:#E5E7EB;height:12px;border-radius:6px;overflow:hidden;margin:12px 0;"><div style="height:100%;width:${Math.min(progresso, 100)}%;background:linear-gradient(90deg,#8B5CF6,#EC4899,#FB923C);transition:width 0.5s;"></div></div><p style="font-size:13px;text-align:center;"><strong>${totalLidos}</strong> de <strong>${meta}</strong> capítulos<br><span style="color:#8B5CF6;font-weight:700;">${progresso}%</span> completo</p></div><div class="card"><h3>📅 Leituras de hoje</h3><p style="font-size:12px;color:#6B7280;margin-bottom:12px;">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>${caps.length ? caps.map(cap => `<div class="leitura-item ${cap.lido ? 'lido' : ''}" onclick="toggleLeitura('${cap.livro}', ${cap.capitulo}, this)"><span style="font-size:20px;">${cap.lido ? '✅' : '⬜'}</span><div><strong>${cap.livro}</strong><span style="color:#6B7280;font-size:13px;">capítulo ${cap.capitulo}</span></div></div>`).join('') : '<p style="color:#6B7280;">Sem leituras programadas para hoje.</p>'}</div>`;
}
async function toggleLeitura(livro, capitulo, el) { el.style.transform = 'scale(0.98)'; setTimeout(() => { el.style.transform = ''; }, 150); await api('membroMarcarLeitura', membro.id, livro, capitulo); Audit.registrar('editar', 'Marcou leitura: ' + livro + ' ' + capitulo); render('leitura'); }

async function renderTestemunhos(c) {
  const aprovados = await api('membroTestemunhosAprovados'); const meus = await api('membroMeusTestemunhos', membro.id); const listaAp = aprovados.data || []; const listaMeus = meus.data || [];
  c.innerHTML = `<div class="card card-destaque"><h3>🎤 Testemunhos</h3><p>Compartilhe como Deus tem agido na sua vida!</p></div><div class="card"><h3>✏️ Escrever testemunho</h3><input id="txtTestTitulo" placeholder="Título (ex: Deus me curou)" maxlength="80"><textarea id="txtTestTexto" placeholder="Conte o que Deus fez..."></textarea><p style="font-size:12px;color:#6B7280;margin-bottom:12px;">⚠️ Seu testemunho será revisado pelo líder antes de aparecer.</p><button onclick="enviarTestemunho(this)">Enviar testemunho</button></div>${listaMeus.length ? `<h3 style="margin:16px 0 8px;font-size:14px;color:#6B7280">Meus testemunhos</h3>${listaMeus.map(t => `<div class="card"><h3>${t.titulo}</h3><p>${t.texto}</p><div style="margin-top:8px;"><span class="badge" style="background:${t.status === 'aprovado' ? 'rgba(16,185,129,0.15)' : t.status === 'rejeitado' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)'};color:${t.status === 'aprovado' ? '#059669' : t.status === 'rejeitado' ? '#DC2626' : '#D97706'};">${t.status === 'aprovado' ? '✅ Aprovado' : t.status === 'rejeitado' ? '❌ Rejeitado' : '⏳ Pendente'}</span></div></div>`).join('')}` : ''}${listaAp.length ? `<h3 style="margin:16px 0 8px;font-size:14px;color:#6B7280">Testemunhos da igreja</h3>${listaAp.map(t => `<div class="card ${t.destaque ? 'card-destaque' : ''}"><h3>${t.destaque ? '⭐ ' : ''}${t.titulo}</h3><p>${t.texto}</p><p style="margin-top:10px;font-size:12px;opacity:0.7;">✍️ ${t.nome_autor}</p></div>`).join('')}` : '<div class="empty"><div class="icon">🎤</div>Nenhum testemunho aprovado ainda</div>'}`;
}
async function enviarTestemunho(btn) { const titulo = document.getElementById('txtTestTitulo').value.trim(); const texto = document.getElementById('txtTestTexto').value.trim(); if (!titulo) return alert('Coloque um título'); if (!texto) return alert('Escreva seu testemunho'); btn.disabled = true; btn.textContent = 'Enviando...'; const r = await api('membroCriarTestemunho', membro.id, titulo, texto); if (r.ok) { Audit.registrar('criar', 'Enviou testemunho: "' + titulo.substring(0, 80) + '"'); alert('Testemunho enviado! Aguarde aprovação do líder.'); render('testemunhos'); } else { alert(r.erro || 'Erro ao enviar'); btn.disabled = false; btn.textContent = 'Enviar testemunho'; } }

async function renderEnquetes(c) {
  const r = await api('membroEnquetesAtivas', membro.id); const enquetes = r.data || [];
  if (!enquetes.length) { c.innerHTML = '<div class="empty"><div class="icon">🎯</div>Nenhuma enquete ativa no momento</div>'; return; }
  c.innerHTML = `<div class="card card-destaque"><h3>🎯 Enquetes</h3><p>Sua opinião ajuda a igreja a crescer!</p></div>${enquetes.map(e => { const votou = e.meu_voto !== null; const opcoes = e.opcoes || []; const total = e.total_votos || 0; return `<div class="card"><h3>${e.pergunta}</h3>${e.descricao ? '<p style="margin-bottom:12px;">' + e.descricao + '</p>' : ''}<div style="margin-top:12px;">${opcoes.map((op, idx) => { const votos = e.contagem[idx] || 0; const pct = total > 0 ? Math.round((votos / total) * 100) : 0; const meuVoto = e.meu_voto === idx; if (votou) { return `<div class="enquete-opcao resultado ${meuVoto ? 'meu-voto' : ''}"><div class="enquete-bar" style="width:${pct}%"></div><div class="enquete-info"><span>${meuVoto ? '✅ ' : ''}${op}</span><span style="font-weight:700;">${pct}% (${votos})</span></div></div>`; } else { return `<button class="enquete-opcao votar" onclick="votarEnquete('${e.id}', ${idx})">${op}</button>`; } }).join('')}</div>${votou ? `<p style="margin-top:12px;font-size:12px;color:#6B7280;text-align:center;">${total} voto(s) no total</p>` : ''}</div>`; }).join('')}`;
}
async function votarEnquete(enquete_id, opcao_idx) { const r = await api('membroEnqueteVotar', membro.id, enquete_id, opcao_idx); if (r.ok) { Audit.registrar('editar', 'Votou na enquete #' + enquete_id); render('enquetes'); } else alert(r.erro || 'Erro ao votar'); }

function abrirTrocarSenha() {
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = `<div class="card"><h3>🔒 Trocar senha</h3><p style="margin-bottom:16px">Sua nova senha precisa ter pelo menos 6 caracteres.</p><label class="label-campo">Senha atual</label><input type="password" id="senhaAtual" placeholder="Sua senha atual"><label class="label-campo">Nova senha</label><input type="password" id="senhaNova" placeholder="Nova senha"><label class="label-campo">Confirme a nova senha</label><input type="password" id="senhaConfirma" placeholder="Repita a nova senha"><div id="erroTrocarSenha" class="erro" style="margin-top:8px;min-height:20px"></div><button onclick="confirmarTrocarSenha(this)" style="margin-top:12px">Trocar senha</button><button onclick="render('perfil')" class="btn-cinza" style="margin-top:8px">Cancelar</button></div>`;
}
async function confirmarTrocarSenha(btn) {
  const atual = document.getElementById('senhaAtual').value; const nova = document.getElementById('senhaNova').value; const confirma = document.getElementById('senhaConfirma').value; const erro = document.getElementById('erroTrocarSenha'); erro.textContent = '';
  if (!atual || !nova || !confirma) { erro.textContent = 'Preencha todos os campos'; return; } if (nova.length < 6) { erro.textContent = 'A nova senha precisa ter pelo menos 6 caracteres'; return; } if (nova !== confirma) { erro.textContent = 'As senhas não coincidem'; return; } if (nova === atual) { erro.textContent = 'A nova senha precisa ser diferente da atual'; return; }
  btn.disabled = true; btn.textContent = 'Alterando...'; const r = await api('membroTrocarSenha', membro.id, atual, nova);
  if (r.ok && r.data && r.data.success) { Audit.registrar('editar', 'Alterou a senha de acesso'); const conteudo = document.getElementById('conteudo'); conteudo.innerHTML = `<div class="card card-destaque"><h3>✅ Senha alterada!</h3><p>Sua nova senha já está valendo.</p></div><button onclick="render('perfil')">Voltar ao perfil</button>`; } else { erro.textContent = (r.erro || 'Erro ao trocar senha'); btn.disabled = false; btn.textContent = 'Trocar senha'; }
}

if (Auth.get()) iniciarApp();
