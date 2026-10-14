// ⚙️ CONFIG — SUA URL DO APPS SCRIPT
const API_URL = 'https://script.google.com/macros/s/AKfycbyY9urDX7Sf8ye4hnHESioXI_KxY8rlcZ64a7_KOqM6IZFo50hA523X7E3tHdkZWo7rzA/exec';

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
const Auth = {
  KEY: 'pibens_membro',
  salvar: m => localStorage.setItem(Auth.KEY, JSON.stringify(m)),
  get: () => { const r = localStorage.getItem(Auth.KEY); return r ? JSON.parse(r) : null; },
  sair: () => { localStorage.removeItem(Auth.KEY); location.reload(); }
};

// ═══════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════
async function api(funcao, ...args) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ funcao, args })
    });
    return await res.json();
  } catch (e) {
    return { ok: false, erro: 'Sem conexão' };
  }
}

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════
const btnEntrar = document.getElementById('btnEntrar');

async function entrar() {
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const erro = document.getElementById('erroLogin');

  if (!email || !senha) { erro.textContent = 'Preencha tudo'; return; }

  btnEntrar.disabled = true;
  btnEntrar.textContent = 'Entrando...';
  erro.textContent = '';

  const res = await api('membroLogin', email, senha);

  if (res.ok && res.data) {
    Auth.salvar(res.data);
    iniciarApp();
  } else {
    erro.textContent = res.erro || 'Erro ao entrar';
    btnEntrar.disabled = false;
    btnEntrar.textContent = 'Entrar';
  }
}

btnEntrar.addEventListener('click', entrar);
document.getElementById('senha').addEventListener('keypress', e => { if (e.key === 'Enter') entrar(); });

// ═══════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════
let membro = null;

const titulos = {
  inicio: 'Início',
  agenda: 'Agenda',
  escalas: 'Minhas Escalas',
  mural: 'Mural',
  oracao: 'Oração',
  contribuir: 'Contribuir',
  devocional: 'Devocional',
  perfil: 'Perfil'
};

function iniciarApp() {
  membro = Auth.get();
  document.getElementById('telaLogin').classList.add('hidden');
  document.getElementById('telaApp').classList.remove('hidden');
  document.getElementById('avatar').textContent = (membro.nome || '?').charAt(0).toUpperCase();

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      render(el.dataset.page);
    });
  });

  render('inicio');
}

function render(page) {
  document.getElementById('titulo').textContent = titulos[page] || 'PIBENS';
  const c = document.getElementById('conteudo');
  c.innerHTML = '<div class="loading"><div class="spinner"></div>Carregando...</div>';

  if (page === 'inicio') return renderInicio(c);
  if (page === 'agenda') return renderAgenda(c);
  if (page === 'escalas') return renderEscalas(c);
  if (page === 'mural') return renderMuralCompleto(c);
  if (page === 'oracao') return renderOracao(c);
  if (page === 'contribuir') return renderContribuir(c);
  if (page === 'devocional') return renderDevocional(c);
  if (page === 'perfil') return renderPerfil(c);
}

// 🏠 INÍCIO
async function renderInicio(c) {
  const dev = await api('membroDevocional', 'encorajamento');
  const agenda = await api('membroAgenda');
  const mural = await api('membroMural');
  const escalas = await api('membroEscalas', membro.id);

  const eventos = (agenda.data || []);
  const prox = eventos.length ? eventos[0] : null;
  const aviso = (mural.data || [])[0];
  const proximaEscala = (escalas.data || []).length ? escalas.data[0] : null;

  const devTexto = (dev.ok && dev.data && dev.data.texto) ? dev.data.texto : 'O Senhor é o meu pastor, nada me faltará. — Salmos 23:1';
  const proxTexto = prox ? (prox.titulo || 'Evento') + ' — ' + (prox.data || '') : 'Nenhum evento agendado';
  const avisoTexto = aviso ? aviso.titulo + ': ' + aviso.mensagem : 'Sem avisos no momento';

  let escalasCard = '';
  if (proximaEscala) {
    const funcoes = proximaEscala.minhasFuncoes.map(f => f.label).join(' · ');
    escalasCard = `
      <div class="card">
        <h3>📋 Minha Próxima Escala</h3>
        <p><strong>${proximaEscala.data}</strong> — ${proximaEscala.tipo}</p>
        <p style="margin-top:6px;">${funcoes}</p>
      </div>
    `;
  }

  c.innerHTML = `
    <div class="card card-destaque">
      <h3>🌿 Devocional do Dia</h3>
      <p>${devTexto}</p>
    </div>
    ${escalasCard}
    <div class="card">
      <h3>📅 Próximo Evento</h3>
      <p>${proxTexto}</p>
    </div>
    <div class="card">
      <h3>💬 Mural</h3>
      <p>${avisoTexto}</p>
    </div>
  `;
}

// 📅 AGENDA
async function renderAgenda(c) {
  const agenda = await api('membroAgenda');
  const pres = await api('membroPresencas', membro.id);

  const presencasMap = {};
  (pres.data || []).forEach(p => presencasMap[p.evento_id] = p.status);

  const eventos = (agenda.data || []);

  if (!eventos.length) {
    c.innerHTML = '<div class="empty"><div class="icon">📅</div>Sem eventos no momento</div>';
    return;
  }

  c.innerHTML = eventos.map(e => {
    const status = presencasMap[e.id] || '';
    const titulo = e.titulo || 'Evento';
    const data = e.data || '';
    const local = e.local || '';
    return `
      <div class="card">
        <h3>${titulo}</h3>
        <p>${data}</p>
        ${local ? '<p>📍 ' + local + '</p>' : ''}
        <div class="presenca-btns">
          <button class="btn-presenca vou ${status === 'vou' ? 'ativo' : ''}" onclick="setPresenca('${e.id}','vou',this)">✅ Vou</button>
          <button class="btn-presenca nao_vou ${status === 'nao_vou' ? 'ativo' : ''}" onclick="setPresenca('${e.id}','nao_vou',this)">❌ Não vou</button>
        </div>
      </div>
    `;
  }).join('');
}

async function setPresenca(evento_id, status, btn) {
  const card = btn.closest('.presenca-btns');
  card.querySelectorAll('.btn-presenca').forEach(b => b.classList.remove('ativo'));
  btn.classList.add('ativo');
  await api('membroSetPresenca', membro.id, evento_id, status);
}

// 📋 MINHAS ESCALAS
async function renderEscalas(c) {
  const r = await api('membroEscalas', membro.id);
  const escalas = r.data || [];

  if (!escalas.length) {
    c.innerHTML = `
      <div class="empty">
        <div class="icon">📋</div>
        <p>Você não está escalado em nenhum culto no momento.</p>
        <p style="font-size:13px;margin-top:8px;color:#94a3b8;">Quando o líder te escalar, aparecerá aqui.</p>
      </div>
    `;
    return;
  }

  c.innerHTML = escalas.map(e => {
    const funcoes = e.minhasFuncoes.map(f => `
      <span class="badge" style="background:rgba(139,92,246,0.1);color:#8B5CF6;margin-right:4px;margin-bottom:4px;display:inline-block;">${f.label}</span>
    `).join('');

    return `
      <div class="card">
        <h3>${e.tipo || 'Culto'}</h3>
        <p><strong>📅 ${e.data}</strong> ${e.horario ? 'às ' + e.horario : ''}</p>
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;">${funcoes}</div>
        ${e.observacoes ? '<p style="margin-top:10px;font-size:13px;color:#6B7280;">💬 ' + e.observacoes + '</p>' : ''}
      </div>
    `;
  }).join('');
}

// 📢 MURAL COMPLETO
async function renderMuralCompleto(c) {
  const r = await api('membroMuralCompleto');
  const avisos = r.data || [];

  if (!avisos.length) {
    c.innerHTML = '<div class="empty"><div class="icon">📢</div>Sem avisos no momento</div>';
    return;
  }

  c.innerHTML = avisos.map(a => {
    const data = new Date(a.criado_em).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    return `
      <div class="card ${a.fixado ? 'card-destaque' : ''}">
        <h3>${a.fixado ? '📌 ' : ''}${a.titulo}</h3>
        <p>${a.mensagem}</p>
        <p style="margin-top:10px;font-size:12px;opacity:0.7;">
          ${a.autor ? '✍️ ' + a.autor + ' · ' : ''}${data}
        </p>
      </div>
    `;
  }).join('');
}

// 🙏 ORAÇÃO
async function renderOracao(c) {
  const r = await api('membroPedidos', membro.id);
  const pedidos = r.data || [];

  c.innerHTML = `
    <div class="card">
      <h3>Novo pedido</h3>
      <textarea id="txtPedido" placeholder="Escreva seu pedido de oração..."></textarea>
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px">
        <input type="checkbox" id="chkAnonimo" style="width:auto;margin:0"> Enviar como anônimo
      </label>
      <button onclick="criarPedido(this)">Enviar pedido</button>
    </div>
    <h3 style="margin:16px 0 8px;font-size:14px;color:#6B7280">Meus pedidos</h3>
    ${pedidos.length ? pedidos.map(p => `
      <div class="card">
        <p>${p.texto}</p>
        <div style="margin-top:8px"><span class="badge">${p.status}</span> ${p.anonimo ? '<span class="badge">anônimo</span>' : ''}</div>
      </div>
    `).join('') : '<div class="empty"><div class="icon">🙏</div>Nenhum pedido ainda</div>'}
  `;
}

async function criarPedido(btn) {
  const texto = document.getElementById('txtPedido').value.trim();
  const anonimo = document.getElementById('chkAnonimo').checked;
  if (!texto) return alert('Escreva algo');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  await api('membroCriarPedido', membro.id, texto, anonimo);
  render('oracao');
}

// 💰 CONTRIBUIR
async function renderContribuir(c) {
  const r = await api('membroContribuir');
  const dados = r.data || {};

  if (!dados.pix) {
    c.innerHTML = '<div class="empty"><div class="icon">💰</div>Informações indisponíveis</div>';
    return;
  }

  const pix = dados.pix;

  c.innerHTML = `
    <div class="card card-destaque">
      <h3>💰 Contribuir com a Obra</h3>
      <p>${dados.mensagem || 'Sua contribuição é uma bênção para a obra do Senhor.'}</p>
    </div>

    <div class="card">
      <h3>🔑 Chave PIX</h3>
      <p style="font-size:13px;color:#6B7280;margin-bottom:8px;">Tipo: ${pix.tipo}</p>
      <div style="background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(236,72,153,0.08));padding:16px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <code style="font-size:14px;font-weight:600;color:#8B5CF6;word-break:break-all;">${pix.chave}</code>
        <button onclick="copiarPix('${pix.chave}', this)" style="width:auto;padding:8px 12px;font-size:13px;background:linear-gradient(135deg,#8B5CF6,#EC4899);">📋</button>
      </div>
    </div>

    <div class="card">
      <h3>👤 Beneficiário</h3>
      <p><strong>${pix.beneficiario}</strong></p>
      ${pix.cidade ? '<p style="margin-top:6px;">🏙️ ' + pix.cidade + '</p>' : ''}
    </div>

    <div class
