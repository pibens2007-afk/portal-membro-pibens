// ⚙️ CONFIG
const API_URL = 'https://script.google.com/macros/s/AKfycbyY9urDX7Sf8ye4hnHESioXI_KxY8rlcZ64a7_KOqM6IZFo50hA523X7E3tHdkZWo7rzA/exec';

// ═══════════════════════════════════════════════════════════
// AUTH & HELPERS
// ═══════════════════════════════════════════════════════════
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
  } catch (e) { return { ok: false, erro: 'Sem conexão' }; }
}

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
  return texto.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:#8B5CF6;text-decoration:underline;word-break:break-all;">$1</a>');
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
// TEMA (Cores e Modo Escuro)
// ═══════════════════════════════════════════════════════════
function aplicarTema(tema, escuro) {
  document.body.classList.remove('tema-azul', 'tema-verde', 'tema-rosa', 'tema-laranja', 'tema-vermelho', 'tema-amarelo');
  if (tema && tema !== 'roxo') document.body.classList.add('tema-' + tema);
  if (escuro) document.body.classList.add('modo-escuro');
  else document.body.classList.remove('modo-escuro');
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

btnEntrar.addEventListener('click', entrar);
document.getElementById('senha').addEventListener('keypress', e => { if (e.key === 'Enter') entrar(); });

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
  
  const prefs = JSON.parse(localStorage.getItem('pibens_prefs') || '{}');
  aplicarTema(prefs.tema || 'roxo', prefs.escuro || false);
  
  document.getElementById('avatar').textContent = (membro.nome || '?').charAt(0).toUpperCase();
  document.getElementById('menuAvatar').textContent = (membro.nome || '?').charAt(0).toUpperCase();
  document.getElementById('menuNome').textContent = membro.nome || 'Membro';
  document.getElementById('menuEmail').textContent = membro.email || membro.cpf || '';

  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.bottom-nav .nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active'); render(el.dataset.page);
    });
  });

  document.querySelectorAll('.menu-item[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      fecharMenu(); const pagina = el.dataset.page;
      document.querySelectorAll('.bottom-nav .nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === pagina));
      render(pagina);
    });
  });

  render('inicio');
}

function abrirMenu() { document.getElementById('menuLateral').classList.add('open'); document.getElementById('menuOverlay').classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function fecharMenu() { document.getElementById('menuLateral').classList.remove('open'); document.getElementById('menuOverlay').classList.add('hidden'); document.body.style.overflow = ''; }

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
  if (page === 'aniversariantes') return renderAniversariantes(c);
  if (page === 'talentos') return renderTalentos(c);
  if (page === 'igreja') return renderIgreja(c);
  if (page === 'leitura') return renderLeitura(c);
  if (page === 'testemunhos') return renderTestemunhos(c);
  if (page === 'enquetes') return renderEnquetes(c);
  if (page === 'estilo') return renderEstilo(c);
}

// ═══════════════════════════════════════════════════════════
// INÍCIO
// ═══════════════════════════════════════════════════════════
async function renderInicio(c) {
  const dev = await api('membroDevocional', 'encorajamento');
  const agenda = await api('membroAgenda');
  const mural = await api('membroMural');
  const escalas = await api('membroEscalas', membro.id);
  const eventos = (agenda.data || []); const prox = eventos.length ? eventos[0] : null;
  const avisos = (mural.data || []); const proximaEscala = (escalas.data || []).length ? escalas.data[0] : null;
  const avisoFixado = avisos.find(a => a.fixado) || avisos[0];
  const temMaisAvisos = avisos.length > 1;
  const devTexto = (dev.ok && dev.data && dev.data.texto) ? dev.data.texto : 'O Senhor é o meu pastor, nada me faltará. — Salmos 23:1';
  const proxTexto = prox ? (prox.titulo || 'Evento') + ' — ' + (prox.data || '') : 'Nenhum evento agendado';

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
      avisoCard = `<div class="card" style="background:linear-gradient(135deg, ${style.bg}dd 0%, ${style.bg} 100%); color:${style.txt}; box-shadow:0 8px 24px ${style.bg}66; padding:20px; position:relative; overflow:hidden; border:none;">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;"><span style="font-size:24px;">📢</span><span style="background:rgba(255,255,255,0.3); padding:4px 10px; border-radius:20px; font-size:11px; font-weight:800; letter-spacing:0.5px;">AVISO IMPORTANTE</span></div>
        <h3 style="color:#fff; font-size:22px; font-weight:800; margin-bottom:12px; line-height:1.2;">${avisoFixado.titulo}</h3>
        <p style="color:#fff; font-size:15px; line-height:1.6; opacity:0.95; margin-bottom:16px;">${msgFormatada}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.2); padding-top:12px;"><span style="font-size:12px; color:rgba(255,255,255,0.8);">👤 ${avisoFixado.autor || 'Igreja'} · ⏰ ${tempo}</span>${temMaisAvisos ? `<button onclick="render('mural')" style="width:auto; padding:6px 14px; font-size:12px; background:rgba(255,255,255,0.2); color:#fff; border-radius:20px; box-shadow:none;">Ver todos →</button>` : ''}</div></div>`;
    } else {
      avisoCard = `<div class="card"><h3>📢 ${avisoFixado.titulo}</h3><p>${msgFormatada}</p>${temMaisAvisos ? `<button onclick="render('mural')" style="margin-top:10px; background:#6B7280; font-size:13px; padding:8px;">Ver todos os avisos →</button>` : ''}</div>`;
    }
  } else { avisoCard = `<div class="card"><h3>💬 Mural</h3><p>Sem avisos no momento</p></div>`; }

  c.innerHTML = `<div class="card card-destaque"><h3>🌿 Devocional do Dia</h3><p>${devTexto}</p></div>${avisoCard}${escalasCard}<div class="card"><h3>📅 Próximo Evento</h3><p>${proxTexto}</p></div>`;
}

// ═══════════════════════════════════════════════════════════
// AGENDA
// ═══════════════════════════════════════════════════════════
async function renderAgenda(c) {
  const agenda = await api('membroAgenda'); const pres = await api('membroPresencas', membro.id);
  const presencasMap = {}; (pres.data || []).forEach(p => presencasMap[p.evento_id] = p.status);
  const eventos = (agenda.data || []);
  if (!eventos.length) { c.innerHTML = '<div class="empty"><div class="icon">📅</div>Sem eventos no momento</div>'; return; }
  c.innerHTML = eventos.map(e => { const status = presencasMap[e.id] || ''; return `<div class="card"><h3>${e.titulo}</h3><p>${e.data}${e.hora ? ' às ' + e.hora : ''}</p>${e.local ? '<p>📍 ' + e.local + '</p>' : ''}<div class="presenca-btns"><button class="btn-presenca vou ${status === 'vou' ? 'ativo' : ''}" onclick="setPresenca('${e.id}','vou',this)">✅ Vou</button><button class="btn-presenca nao_vou ${status === 'nao_vou' ? 'ativo' : ''}" onclick="setPresenca('${e.id}','nao_vou',this)">❌ Não vou</button></div></div>`; }).join('');
}
async function setPresenca(evento_id, status, btn) { const card = btn.closest('.presenca-btns'); card.querySelectorAll('.btn-presenca').forEach(b => b.classList.remove('ativo')); btn.classList.add('ativo'); await api('membroSetPresenca', membro.id, evento_id, status); }

// ═══════════════════════════════════════════════════════════
// ESCALAS
// ═══════════════════════════════════════════════════════════
async function renderEscalas(c) {
  const r = await api('membroEscalas', membro.id); const escalas = r.data || [];
  if (!escalas.length) { c.innerHTML = '<div class="empty"><div class="icon">📋</div>Você não está escalado em nenhum culto no momento.</div>'; return; }
  c.innerHTML = escalas.map(e => { const funcoes = e.minhasFuncoes.map(f => `<span class="badge" style="margin-right:4px;margin-bottom:4px;display:inline-block;">${f.label}</span>`).join(''); return `<div class="card"><h3>${e.tipo || 'Culto'}</h3><p><strong>📅 ${e.data}</strong> ${e.horario ? 'às ' + e.horario : ''}</p><div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;">${funcoes}</div>${e.observacoes ? '<p style="margin-top:10px;font-size:13px;color:#6B7280;">💬 ' + e.observacoes + '</p>' : ''}</div>`; }).join('');
}

// ═══════════════════════════════════════════════════════════
// MURAL
// ═══════════════════════════════════════════════════════════
const REACOES = { amo: { emoji: '❤️', label: 'Amei' }, orando: { emoji: '🙏', label: 'Orando' }, fogo: { emoji: '🔥', label: 'Fogo' }, uau: { emoji: '😮', label: 'Uau' }, triste: { emoji: '😢', label: 'Triste' } };
async function renderMuralCompleto(c) {
  const r = await api('membroMuralCompleto', membro.id); const avisos = r.data || [];
  if (!avisos.length) { c.innerHTML = '<div class="empty"><div class="icon">📢</div>Sem avisos no momento</div>'; return; }
  const TIPOS_MURAL = { 'Info': { cor: '#2563eb', bg: '#eff6ff', icon: '📘', label: 'Informativo' }, 'Importante': { cor: '#f59e0b', bg: '#fef3c7', icon: '⚠️', label: 'Importante' }, 'Urgente': { cor: '#dc2626', bg: '#fee2e2', icon: '🔔', label: 'Urgente' }, 'Evento': { cor: '#7c3aed', bg: '#ede9fe', icon: '📅', label: 'Evento' } };
  c.innerHTML = avisos.map(a => {
    const tipo = a.tipo || 'Info'; const cfg = TIPOS_MURAL[tipo] || TIPOS_MURAL['Info']; const tempo = tempoRelativo(a.criado_em); const msgFormatada = linkify(a.mensagem || '').replace(/color:#fff/g, 'color:#8B5CF6'); const destacado = a.fixado || tipo === 'Urgente'; const bgCard = destacado ? cfg.bg : '#fff'; const bordaCard = destacado ? `5px solid ${cfg.cor}` : 'none';
    const badges = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"><span style="background:${cfg.cor};color:#fff;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;">${cfg.icon} ${cfg.label.toUpperCase()}</span>${a.fixado ? `<span style="background:#fff;color:${cfg.cor};border:1.5px solid ${cfg.cor};padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;">📌 FIXADO</span>` : ''}</div>`;
    const reacoesHtml = Object.keys(REACOES).map(k => { const r = REACOES[k]; const qtd = a.reacoes[k] || 0; const ativa = a.minha_reacao === k; return `<button class="btn-reacao ${ativa ? 'ativa' : ''}" onclick="reagirMural('${a.id}','${k}',this)"><span>${r.emoji}</span>${qtd > 0 ? `<span class="reacao-count">${qtd}</span>` : ''}</button>`; }).join('');
    return `<div class="card" style="background:${bgCard};border-left:${bordaCard};">${badges}<h3 style="color:${destacado ? cfg.cor : '#1F2937'};font-size:16px;line-height:1.3;margin-bottom:8px;">${a.titulo}</h3><p style="color:#374151;font-size:14px;line-height:1.6;">${msgFormatada}</p><p style="margin-top:10px;font-size:12px;color:#6B7280;">${a.autor ? '👤 ' + a.autor + ' · ' : ''}⏰ ${tempo}</p><div class="reacoes-bar">${reacoesHtml}</div></div>`;
  }).join('');
}
async function reagirMural(aviso_id, reacao, btn) { btn.style.transform = 'scale(1.3)'; setTimeout(() => { btn.style.transform = ''; }, 200); await api('membroMuralReagir', membro.id, aviso_id, reacao); render('mural'); }

// ═══════════════════════════════════════════════════════════
// ORAÇÃO (CORRIGIDO)
// ═══════════════════════════════════════════════════════════
async function renderOracao(c) {
  const r = await api('membroPedidos', membro.id); const pedidos = r.data || [];
  c.innerHTML = `<div class="card"><h3>Novo pedido</h3><textarea id="txtPedido" placeholder="Escreva seu pedido de oração..."></textarea><label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px"><input type="checkbox" id="chkAnonimo" style="width:auto;margin:0"> Enviar como anônimo</label><button onclick="criarPedido(this)">Enviar pedido</button></div><h3 style="margin:16px 0 8px;font-size:14px;color:#6B7280">Meus pedidos</h3>${pedidos.length ? pedidos.map(p => `<div class="card"><p>${p.texto}</p><div style="margin-top:8px"><span class="badge">${p.status}</span> ${p.anonimo ? '<span class="badge">anônimo</span>' : ''}</div></div>`).join('') : '<div class="empty"><div class="icon">🙏</div>Nenhum pedido ainda</div>'}`;
}

async function criarPedido(btn) {
  const texto = document.getElementById('txtPedido').value.trim();
  const anonimo = document.getElementById('chkAnonimo').checked;
  
  if (!texto) return alert('Escreva algo');
  
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const r = await api('membroCriarPedido', membro.id, texto, anonimo);

  if (r.ok && r.data && r.data.success) {
    alert('Pedido enviado com sucesso!'); 
    render('oracao');
  } else {
    alert('ERRO: ' + (r.erro || 'Não foi possível enviar o pedido.'));
    btn.disabled = false;
    btn.textContent = 'Enviar pedido';
  }
}

// ═══════════════════════════════════════════════════════════
// CONTRIBUIR
// ═══════════════════════════════════════════════════════════
async function renderContribuir(c) {
  const r = await api('membroContribuir'); const dados = r.data || {};
  if (!dados.pix) { c.innerHTML = '<div class="empty"><div class="icon">💰</div>Indisponível</div>'; return; } const pix = dados.pix;
  c.innerHTML = `<div class="card card-destaque"><h3>💰 Contribuir com a Obra</h3><p>${dados.mensagem || ''}</p></div><div class="card"><h3>🔑 Chave PIX</h3><p style="font-size:13px;color:#6B7280;margin-bottom:8px;">Tipo: ${pix.tipo}</p><div style="background:linear-gradient(135deg,rgba(139,92,246,0.08),rgba(236,72,153,0.08));padding:16px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;"><code style="font-size:14px;font-weight:600;color:#8B5CF6;word-break:break-all;">${pix.chave}</code><button onclick="copiarPix('${pix.chave}', this)" style="width:auto;padding:8px 12px;font-size:13px;">📋</button></div></div><div class="card"><h3>👤 Beneficiário</h3><p><strong>${pix.beneficiario}</strong></p>${pix.cidade ? '<p style="margin-top:6px;">🏙️ ' + pix.cidade + '</p>' : ''}</div><div class="card"><h3>📖 Sobre o Dízimo</h3><p style="font-size:13px;line-height:1.7;">"Trazei todos os dízimos à casa do tesouro..." — Malaquias 3:10</p></div>`;
}
function copiarPix(chave, btn) { navigator.clipboard.writeText(chave).then(() => { const original = btn.textContent; btn.textContent = '✅'; setTimeout(() => { btn.textContent = original; }, 2000); }).catch(() => alert('Chave PIX: ' + chave)); }

// ═══════════════════════════════════════════════════════════
// DEVOCIONAL
// ═══════════════════════════════════════════════════════════
async function renderDevocional(c) {
  c.innerHTML = `<div class="card"><h3>✨ Devocional com IA</h3><p style="margin-bottom:12px">Escolha um tema e receba uma palavra:</p><select id="temaDev"><option value="encorajamento">Encorajamento</option><option value="gratidao">Gratidão</option><option value="fe">Fé</option><option value="perdao">Perdão</option><option value="esperanca">Esperança</option><option value="amor">Amor</option></select><button onclick="gerarDevocional()">Gerar devocional</button></div><div id="resultDev"></div>`;
}
async function gerarDevocional() { const tema = document.getElementById('temaDev').value; const box = document.getElementById('resultDev'); box.innerHTML = '<div class="loading"><div class="spinner"></div>A IA está escrevendo...</div>'; const r = await api('membroDevocional', tema); const texto = (r.ok && r.data && r.data.texto) ? r.data.texto : 'Tente novamente.'; box.innerHTML = `<div class="card card-destaque"><p>${texto}</p></div>`; }

// ═══════════════════════════════════════════════════════════
// PERFIL E ESTILO
// ═══════════════════════════════════════════════════════════
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
async function salvarPerfil() { const dados = { telefone: document.getElementById('pTel').value, endereco: document.getElementById('pEnd').value }; await api('membroUpdatePerfil', membro.id, dados); alert('Salvo!'); }

async function renderEstilo(c) {
  const r = await api('membroPerfil', membro.id); const p = r.data || {};
  const prefs = JSON.parse(localStorage.getItem('pibens_prefs') || '{}');
  const temaAtual = prefs.tema || 'roxo'; const escuroAtual = prefs.escuro || false;
  const temas = [ { id: 'roxo', cor: '#8B5CF6' }, { id: 'azul', cor: '#3B82F6' }, { id: 'verde', cor: '#10B981' }, { id: 'rosa', cor: '#EC4899' }, { id: 'laranja', cor: '#FB923C' }, { id: 'vermelho', cor: '#EF4444' }, { id: 'amarelo', cor: '#F59E0B' } ];

  c.innerHTML = `
    <div class="card"><h3>🖼️ Foto de Perfil</h3><div style="display:flex;flex-direction:column;align-items:center;gap:12px;"><div class="avatar" style="width:96px;height:96px;font-size:36px;overflow:hidden;border:4px solid var(--cor-principal);">${p.foto_perfil ? `<img src="${p.foto_perfil}" style="width:100%;height:100%;object-fit:cover;">` : (membro.nome || '?').charAt(0).toUpperCase()}</div><input type="file" id="inputFoto" accept="image/*" style="display:none" onchange="uploadFoto(this)"><button onclick="document.getElementById('inputFoto').click()" class="btn-azul" style="width:auto;padding:8px 16px;font-size:13px;">Escolher Foto</button></div></div>
    <div class="card"><h3>🎨 Tema de Cores</h3><div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:12px;">${temas.map(t => `<button onclick="mudarTema('${t.id}')" style="width:48px;height:48px;border-radius:50%;background:${t.cor};border:3px solid ${temaAtual === t.id ? '#fff' : 'transparent'};box-shadow:0 0 0 ${temaAtual === t.id ? '3px '+t.cor : 'none'};padding:0;"></button>`).join('')}</div></div>
    <div class="card"><h3>🌙 Modo Escuro</h3><div style="display:flex;justify-content:space-between;align-items:center;"><span>Ativar modo escuro</span><label class="switch"><input type="checkbox" id="chkEscuro" ${escuroAtual ? 'checked' : ''} onchange="toggleEscuro(this)"><span class="slider"></span></label></div></div>
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
      if (r.ok) { alert('Foto salva!'); render('estilo'); } else { alert('Erro: ' + r.erro); }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function mudarTema(tema) {
  const prefs = JSON.parse(localStorage.getItem('pibens_prefs') || '{}');
  prefs.tema = tema; localStorage.setItem('pibens_prefs', JSON.stringify(prefs));
  aplicarTema(tema, prefs.escuro); api('membroSalvarTema', membro.id, tema, prefs.escuro); render('estilo');
}

function toggleEscuro(input) {
  const prefs = JSON.parse(localStorage.getItem('pibens_prefs') || '{}');
  prefs.escuro = input.checked; localStorage.setItem('pibens_prefs', JSON.stringify(prefs));
  aplicarTema(prefs.tema, input.checked); api('membroSalvarTema', membro.id, prefs.tema, input.checked);
}

async function salvarBio(btn) { const bio = document.getElementById('txtBio').value.trim(); btn.disabled = true; btn.textContent = 'Salvando...'; await api('membroSalvarBio', membro.id, bio); alert('Bio salva!'); btn.disabled = false; btn.textContent = 'Salvar Bio'; }

// ═══════════════════════════════════════════════════════════
// DEMAIS TELAS (Aniversariantes, Talentos, Igreja, Leitura, Testemunhos, Enquetes)
// ═══════════════════════════════════════════════════════════
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
async function salvarTalento(btn) { const talento = document.getElementById('txtTalento').value.trim(); if (!talento) return alert('Escreva algo'); btn.disabled = true; btn.textContent = 'Salvando...'; await api('membroTalentosCadastrar', membro.id, talento); alert('Salvo!'); render('talentos'); }

async function renderIgreja(c) {
  const r = await api('membroEstatisticas'); const d = r.data || {};
  c.innerHTML = `<div class="card card-destaque"><h3>📊 Nossa Igreja</h3><p>PIBENS — Encarnação de Salinas</p></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;"><div class="card" style="text-align:center;margin:0;"><div style="font-size:32px;margin-bottom:4px;">👥</div><div style="font-size:28px;font-weight:800;color:#8B5CF6;">${d.totalMembros || 0}</div><div style="font-size:12px;color:#6B7280;">Membros ativos</div></div><div class="card" style="text-align:center;margin:0;"><div style="font-size:32px;margin-bottom:4px;">🙋</div><div style="font-size:28px;font-weight:800;color:#EC4899;">${d.visitantesUltimoCulto || 0}</div><div style="font-size:12px;color:#6B7280;">Visitantes</div></div><div class="card" style="text-align:center;margin:0;"><div style="font-size:32px;margin-bottom:4px;">🙏</div><div style="font-size:28px;font-weight:800;color:#FB923C;">${d.pedidosMes || 0}</div><div style="font-size:12px;color:#6B7280;">Pedidos este mês</div></div><div class="card" style="text-align:center;margin:0;"><div style="font-size:32px;margin-bottom:4px;">🎂</div><div style="font-size:28px;font-weight:800;color:#FBBF24;">${d.aniversariantesMes || 0}</div><div style="font-size:12px;color:#6B7280;">Aniversariantes</div></div></div>${(d.aniversariantes && d.aniversariantes.length) ? `<div class="card"><h3>🎂 Aniversariantes do mês</h3>${d.aniversariantes.map(a => `<p style="margin-top:8px;">${a.ehHoje ? '🎉 ' : ''}<strong>${a.nome}</strong> — dia ${a.dia}</p>`).join('')}</div>` : ''}<div class="card"><h3>📖 Versículo</h3><p style="font-size:13px;line-height:1.7;">"Edificados sobre o fundamento dos apóstolos e dos profetas..." — Efésios 2:20</p></div>`;
}

async function renderLeitura(c) {
  const r = await api('membroLeituraHoje', membro.id); const d = r.data || {}; const caps = d.capitulos || []; const streak = d.streak || 0; const progresso = d.progresso || 0; const totalLidos = d.totalLidos || 0; const meta = d.metaAno || 1189;
  c.innerHTML = `<div class="card card-destaque"><h3>📖 Plano de Leitura</h3><p>Bíblia em 1 ano — ${caps.length} capítulo(s) por dia</p></div><div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><h3 style="margin:0;">🔥 Sequência</h3><span style="font-size:24px;font-weight:800;color:#FB923C;">${streak} dia${streak === 1 ? '' : 's'}</span></div><p style="font-size:13px;">${streak > 0 ? 'Continue firme! Não quebre a corrente 🙏' : 'Comece hoje sua sequência!'}</p></div><div class="card"><h3>📊 Progresso anual</h3><div style="background:#E5E7EB;height:12px;border-radius:6px;overflow:hidden;margin:12px 0;"><div style="height:100%;width:${Math.min(progresso, 100)}%;background:linear-gradient(90deg,#8B5CF6,#EC4899,#FB923C);transition:width 0.5s;"></div></div><p style="font-size:13px;text-align:center;"><strong>${totalLidos}</strong> de <strong>${meta}</strong> capítulos<br><span style="color:#8B5CF6;font-weight:700;">${progresso}%</span> completo</p></div><div class="card"><h3>📅 Leituras de hoje</h3><p style="font-size:12px;color:#6B7280;margin-bottom:12px;">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>${caps.length ? caps.map(cap => `<div class="leitura-item ${cap.lido ? 'lido' : ''}" onclick="toggleLeitura('${cap.livro}', ${cap.capitulo}, this)"><span style="font-size:20px;">${cap.lido ? '✅' : '⬜'}</span><div><strong>${cap.livro}</strong><span style="color:#6B7280;font-size:13px;">capítulo ${cap.capitulo}</span></div></div>`).join('') : '<p style="color:#6B7280;">Sem leituras programadas para hoje.</p>'}</div>`;
}
async function toggleLeitura(livro, capitulo, el) { el.style.transform = 'scale(0.98)'; setTimeout(() => { el.style.transform = ''; }, 150); await api('membroMarcarLeitura', membro.id, livro, capitulo); render('leitura'); }

async function renderTestemunhos(c) {
  const aprovados = await api('membroTestemunhosAprovados'); const meus = await api('membroMeusTestemunhos', membro.id); const listaAp = aprovados.data || []; const listaMeus = meus.data || [];
  c.innerHTML = `<div class="card card-destaque"><h3>🎤 Testemunhos</h3><p>Compartilhe como Deus tem agido na sua vida!</p></div><div class="card"><h3>✏️ Escrever testemunho</h3><input id="txtTestTitulo" placeholder="Título (ex: Deus me curou)" maxlength="80"><textarea id="txtTestTexto" placeholder="Conte o que Deus fez..."></textarea><p style="font-size:12px;color:#6B7280;margin-bottom:12px;">⚠️ Seu testemunho será revisado pelo líder antes de aparecer.</p><button onclick="enviarTestemunho(this)">Enviar testemunho</button></div>${listaMeus.length ? `<h3 style="margin:16px 0 8px;font-size:14px;color:#6B7280">Meus testemunhos</h3>${listaMeus.map(t => `<div class="card"><h3>${t.titulo}</h3><p>${t.texto}</p><div style="margin-top:8px;"><span class="badge" style="background:${t.status === 'aprovado' ? 'rgba(16,185,129,0.15)' : t.status === 'rejeitado' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)'};color:${t.status === 'aprovado' ? '#059669' : t.status === 'rejeitado' ? '#DC2626' : '#D97706'};">${t.status === 'aprovado' ? '✅ Aprovado' : t.status === 'rejeitado' ? '❌ Rejeitado' : '⏳ Pendente'}</span></div></div>`).join('')}` : ''}${listaAp.length ? `<h3 style="margin:16px 0 8px;font-size:14px;color:#6B7280">Testemunhos da igreja</h3>${listaAp.map(t => `<div class="card ${t.destaque ? 'card-destaque' : ''}"><h3>${t.destaque ? '⭐ ' : ''}${t.titulo}</h3><p>${t.texto}</p><p style="margin-top:10px;font-size:12px;opacity:0.7;">✍️ ${t.nome_autor}</p></div>`).join('')}` : '<div class="empty"><div class="icon">🎤</div>Nenhum testemunho aprovado ainda</div>'}`;
}
async function enviarTestemunho(btn) { const titulo = document.getElementById('txtTestTitulo').value.trim(); const texto = document.getElementById('txtTestTexto').value.trim(); if (!titulo) return alert('Coloque um título'); if (!texto) return alert('Escreva seu testemunho'); btn.disabled = true; btn.textContent = 'Enviando...'; const r = await api('membroCriarTestemunho', membro.id, titulo, texto); if (r.ok) { alert('Testemunho enviado! Aguarde aprovação do líder.'); render('testemunhos'); } else { alert(r.erro || 'Erro ao enviar'); btn.disabled = false; btn.textContent = 'Enviar testemunho'; } }

async function renderEnquetes(c) {
  const r = await api('membroEnquetesAtivas', membro.id); const enquetes = r.data || [];
  if (!enquetes.length) { c.innerHTML = '<div class="empty"><div class="icon">🎯</div>Nenhuma enquete ativa no momento</div>'; return; }
  c.innerHTML = `<div class="card card-destaque"><h3>🎯 Enquetes</h3><p>Sua opinião ajuda a igreja a crescer!</p></div>${enquetes.map(e => { const votou = e.meu_voto !== null; const opcoes = e.opcoes || []; const total = e.total_votos || 0; return `<div class="card"><h3>${e.pergunta}</h3>${e.descricao ? '<p style="margin-bottom:12px;">' + e.descricao + '</p>' : ''}<div style="margin-top:12px;">${opcoes.map((op, idx) => { const votos = e.contagem[idx] || 0; const pct = total > 0 ? Math.round((votos / total) * 100) : 0; const meuVoto = e.meu_voto === idx; if (votou) { return `<div class="enquete-opcao resultado ${meuVoto ? 'meu-voto' : ''}"><div class="enquete-bar" style="width:${pct}%"></div><div class="enquete-info"><span>${meuVoto ? '✅ ' : ''}${op}</span><span style="font-weight:700;">${pct}% (${votos})</span></div></div>`; } else { return `<button class="enquete-opcao votar" onclick="votarEnquete('${e.id}', ${idx})">${op}</button>`; } }).join('')}</div>${votou ? `<p style="margin-top:12px;font-size:12px;color:#6B7280;text-align:center;">${total} voto(s) no total</p>` : ''}</div>`; }).join('')}`;
}
async function votarEnquete(enquete_id, opcao_idx) { const r = await api('membroEnqueteVotar', membro.id, enquete_id, opcao_idx); if (r.ok) render('enquetes'); else alert(r.erro || 'Erro ao votar'); }

// ═══════════════════════════════════════════════════════════
// TROCAR SENHA
// ═══════════════════════════════════════════════════════════
function abrirTrocarSenha() {
  const conteudo = document.getElementById('conteudo');
  conteudo.innerHTML = `<div class="card"><h3>🔒 Trocar senha</h3><p style="margin-bottom:16px">Sua nova senha precisa ter pelo menos 6 caracteres.</p><label class="label-campo">Senha atual</label><input type="password" id="senhaAtual" placeholder="Sua senha atual"><label class="label-campo">Nova senha</label><input type="password" id="senhaNova" placeholder="Nova senha"><label class="label-campo">Confirme a nova senha</label><input type="password" id="senhaConfirma" placeholder="Repita a nova senha"><div id="erroTrocarSenha" class="erro" style="margin-top:8px;min-height:20px"></div><button onclick="confirmarTrocarSenha(this)" style="margin-top:12px">Trocar senha</button><button onclick="render('perfil')" class="btn-cinza" style="margin-top:8px">Cancelar</button></div>`;
}
async function confirmarTrocarSenha(btn) {
  const atual = document.getElementById('senhaAtual').value; const nova = document.getElementById('senhaNova').value; const confirma = document.getElementById('senhaConfirma').value; const erro = document.getElementById('erroTrocarSenha'); erro.textContent = '';
  if (!atual || !nova || !confirma) { erro.textContent = 'Preencha todos os campos'; return; } if (nova.length < 6) { erro.textContent = 'A nova senha precisa ter pelo menos 6 caracteres'; return; } if (nova !== confirma) { erro.textContent = 'As senhas não coincidem'; return; } if (nova === atual) { erro.textContent = 'A nova senha precisa ser diferente da atual'; return; }
  btn.disabled = true; btn.textContent = 'Alterando...'; const r = await api('membroTrocarSenha', membro.id, atual, nova);
  if (r.ok && r.data && r.data.success) { const conteudo = document.getElementById('conteudo'); conteudo.innerHTML = `<div class="card card-destaque"><h3>✅ Senha alterada!</h3><p>Sua nova senha já está valendo.</p></div><button onclick="render('perfil')">Voltar ao perfil</button>`; } else { erro.textContent = (r.erro || 'Erro ao trocar senha'); btn.disabled = false; btn.textContent = 'Trocar senha'; }
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════
if (Auth.get()) iniciarApp();
