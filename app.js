const API_URL = 'https://script.google.com/macros/s/AKfycbyY9urDX7Sf8ye4hnHESioXI_KxY8rlcZ64a7_KOqM6IZFo50hA523X7E3tHdkZWo7rzA/exec';

const Auth = {
  KEY: 'pibens_membro',
  salvar: m => localStorage.setItem(Auth.KEY, JSON.stringify(m)),
  get: () => { const r = localStorage.getItem(Auth.KEY); return r ? JSON.parse(r) : null; },
  sair: () => { localStorage.removeItem(Auth.KEY); location.reload(); }
};

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

let membro = null;
const titulos = { inicio:'Início', agenda:'Agenda', oracao:'Oração', devocional:'Devocional', perfil:'Perfil' };

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
  if (page === 'oracao') return renderOracao(c);
  if (page === 'devocional') return renderDevocional(c);
  if (page === 'perfil') return renderPerfil(c);
}

async function renderInicio(c) {
  const dev = await api('membroDevocional', 'encorajamento');
  const agenda = await api('membroAgenda');
  const mural = await api('membroMural');

  const eventos = (agenda.data || []);
  const prox = eventos.length ? eventos[0] : null;
  const aviso = (mural.data || [])[0];

  const devTexto = (dev.ok && dev.data && dev.data.texto) ? dev.data.texto : 'O Senhor é o meu pastor, nada me faltará. — Salmos 23:1';
  const proxTexto = prox ? (prox.Evento || prox.evento || 'Evento') + ' — ' + (prox.Data || prox.data || '') : 'Nenhum evento agendado';
  const avisoTexto = aviso ? aviso.titulo + ': ' + aviso.mensagem : 'Sem avisos no momento';

  c.innerHTML = `
    <div class="card card-destaque">
      <h3>🌿 Devocional do Dia</h3>
      <p>${devTexto}</p>
    </div>
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
    const titulo = e.Evento || e.evento || 'Evento';
    const data = e.Data || e.data || '';
    const local = e.Local || e.local || '';
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

async function renderPerfil(c) {
  const r = await api('membroPerfil', membro.id);
  const p = (r.data) || {};

  c.innerHTML = `
    <div class="card">
      <div style="text-align:center;margin-bottom:16px">
        <div class="avatar" style="width:64px;height:64px;font-size:24px;margin:0 auto 8px">${(p.nome||'?').charAt(0).toUpperCase()}</div>
        <h3>${p.nome || 'Membro'}</h3>
        <p>${membro.email}</p>
      </div>
    </div>
    <div class="card">
      <h3>Meus dados</h3>
      <label style="font-size:13px;color:#6B7280">Nome</label>
      <input value="${p.nome||''}" disabled style="background:#F3F4F6">
      <label style="font-size:13px;color:#6B7280">Telefone</label>
      <input id="pTel" value="${p.telefone||''}" placeholder="(00) 00000-0000">
      <label style="font-size:13px;color:#6B7280">Endereço</label>
      <input id="pEnd" value="${p.endereco||''}" placeholder="Rua, número, bairro">
      <button onclick="salvarPerfil()">Salvar alterações</button>
    </div>
    <button onclick="Auth.sair()" style="background:#DC2626;margin-top:12px">Sair da conta</button>
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

if (Auth.get()) iniciarApp();
