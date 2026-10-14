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

    <div class="card">
      <h3>📖 Sobre o Dízimo</h3>
      <p style="font-size:13px;line-height:1.7;">"Trazei todos os dízimos à casa do tesouro, para que haja mantimento na minha casa, e provai-me nisto, diz o Senhor dos Exércitos." — Malaquias 3:10</p>
    </div>
  `;
}

function copiarPix(chave, btn) {
  navigator.clipboard.writeText(chave).then(() => {
    const original = btn.textContent;
    btn.textContent = '✅';
    setTimeout(() => { btn.textContent = original; }, 2000);
  }).catch(() => {
    alert('Chave PIX: ' + chave);
  });
}

// ✨ DEVOCIONAL IA
async function renderDevocional(c) {
  c.innerHTML = `
    <div class="card">
      <h3>✨ Devocional com IA</h3>
      <p style="margin-bottom:12px">Escolha um tema e receba uma palavra:</p>
      <select id="temaDev">
        <option value="encorajamento">Encorajamento</option>
        <option value="gratidao">Gratidão</option>
        <option value="fe">Fé</option>
        <option value="perdao">Perdão</option>
        <option value="esperanca">Esperança</option>
        <option value="amor">Amor</option>
      </select>
      <button onclick="gerarDevocional()">Gerar devocional</button>
    </div>
    <div id="resultDev"></div>
  `;
}

async function gerarDevocional() {
  const tema = document.getElementById('temaDev').value;
  const box = document.getElementById('resultDev');
  box.innerHTML = '<div class="loading"><div class="spinner"></div>A IA está escrevendo...</div>';
  const r = await api('membroDevocional', tema);
  const texto = (r.ok && r.data && r.data.texto) ? r.data.texto : 'Não foi possível gerar agora. Tente de novo.';
  box.innerHTML = `<div class="card card-destaque"><p>${texto}</p></div>`;
}

// 👤 PERFIL
async function renderPerfil(c) {
  const r = await api('membroPerfil', membro.id);
  const p = (r.data) || {};

  c.innerHTML = `
    <div class="card">
      <div style="text-align:center;margin-bottom:16px">
        <div class="avatar" style="width:64px;height:64px;font-size:24px;margin:0 auto 8px">${(p.nome||'?').charAt(0).toUpperCase()}</div>
        <h3>${p.nome || 'Membro'}</h3>
        <p>${membro.email || membro.cpf || ''}</p>
      </div>
    </div>
    <div class="card">
      <h3>Meus dados</h3>
      <label class="label-campo">Nome</label>
      <input value="${p.nome||''}" disabled style="background:#F3F4F6">
      <label class="label-campo">Telefone</label>
      <input id="pTel" value="${p.telefone||''}" placeholder="(00) 00000-0000">
      <label class="label-campo">Endereço</label>
      <input id="pEnd" value="${p.endereco||''}" placeholder="Rua, número, bairro">
      <button onclick="salvarPerfil()">Salvar alterações</button>
    </div>
    <div class="card">
      <h3>🔒 Segurança</h3>
      <p style="margin-bottom:12px">Altere sua senha de acesso</p>
      <button onclick="abrirTrocarSenha()" class="btn-azul">Trocar senha</button>
    </div>
    <button onclick="Auth.sair()" class="btn-vermelho" style="margin-top:12px">Sair da conta</button>
  `;
}

async function salvarPerfil() {
  const dados = {
    telefone: document.getElementById('pTel').value,
    endereco: document.getElementById('pEnd').value
  };
  await api('membroUpdatePerfil', membro.id, dados);
  alert('Salvo!');
}

// ═══════════════════════════════════════════════════════════
// TROCAR SENHA
// ═══════════════════════════════════════════════════════════
function abrirTrocarSenha() {
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = `
    <div class="card">
      <h3>🔒 Trocar senha</h3>
      <p style="margin-bottom:16px">Sua nova senha precisa ter pelo menos 6 caracteres.</p>
      
      <label class="label-campo">Senha atual</label>
      <input type="password" id="senhaAtual" placeholder="Sua senha atual" autocomplete="current-password">
      
      <label class="label-campo">Nova senha</label>
      <input type="password" id="senhaNova" placeholder="Nova senha" autocomplete="new-password">
      
      <label class="label-campo">Confirme a nova senha</label>
      <input type="password" id="senhaConfirma" placeholder="Repita a nova senha" autocomplete="new-password">
      
      <div id="erroTrocarSenha" class="erro" style="margin-top:8px;min-height:20px"></div>
      
      <button onclick="confirmarTrocarSenha(this)" style="margin-top:12px">Trocar senha</button>
      <button onclick="render('perfil')" class="btn-cinza" style="margin-top:8px">Cancelar</button>
    </div>
  `;
}

async function confirmarTrocarSenha(btn) {
  const atual = document.getElementById('senhaAtual').value;
  const nova = document.getElementById('senhaNova').value;
  const confirma = document.getElementById('senhaConfirma').value;
  const erro = document.getElementById('erroTrocarSenha');

  erro.textContent = '';

  if (!atual || !nova || !confirma) {
    erro.textContent = 'Preencha todos os campos';
    return;
  }

  if (nova.length < 6) {
    erro.textContent = 'A nova senha precisa ter pelo menos 6 caracteres';
    return;
  }

  if (nova !== confirma) {
    erro.textContent = 'As senhas não coincidem';
    return;
  }

  if (nova === atual) {
    erro.textContent = 'A nova senha precisa ser diferente da atual';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Alterando...';

  const r = await api('membroTrocarSenha', membro.id, atual, nova);

  if (r.ok && r.data && r.data.success) {
    const conteudo = document.getElementById('conteudo');
    conteudo.innerHTML = `
      <div class="card card-destaque">
        <h3>✅ Senha alterada!</h3>
        <p>Sua nova senha já está valendo. Use ela no próximo login.</p>
      </div>
      <button onclick="render('perfil')">Voltar ao perfil</button>
    `;
  } else {
    erro.textContent = (r.erro || 'Erro ao trocar senha');
    btn.disabled = false;
    btn.textContent = 'Trocar senha';
  }
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
if (Auth.get()) iniciarApp();
