const palette = ['#df8465', '#76a58d', '#e6bb6b', '#94accc', '#c498b8'];
const entries = [
    ['flower', 'Plantar uma flor', '🌹', 'Natureza', 'Uma flor cresce no jardim e permanece na cena.', 1, 'flores'],
    ['tree', 'Cultivar uma árvore', '🌳', 'Natureza', 'Uma árvore brota na ilha e cresce suavemente.', 1, 'árvores'],
    ['mushroom', 'Nascer cogumelos', '🍄', 'Natureza', 'Cogumelos de tamanhos variados ocupam o jardim.', 3, 'cogumelos'],
    ['sunflower', 'Girar girassóis', '🌻', 'Natureza', 'Girassóis aparecem e se movem ao vento.', 2, 'girassóis'],
    ['rainbow', 'Criar um arco-íris', '🌈', 'Natureza', 'Um arco-íris atravessa o céu por alguns segundos.', 8, 'segundos'],
    ['butterflies', 'Soltar borboletas', '🦋', 'Natureza', 'Borboletas percorrem trajetórias no cenário.', 5, 'borboletas'],
    ['snow', 'Neve de algodão', '❄️', 'Natureza', 'Flocos caem e pousam como corpos leves.', 8, 'flocos'],
    ['ball', 'Adicionar uma bola', '⚽', 'Objetos', 'Uma bola cai, quica e empurra outros corpos.', 1, 'bolas'],
    ['cube', 'Deixar cair cubos', '🟨', 'Objetos', 'Cubos com peso podem se empilhar na plataforma.', 2, 'cubos'],
    ['star', 'Soltar estrelas', '⭐', 'Objetos', 'Estrelas físicas podem ser coletadas no minigame.', 3, 'estrelas'],
    ['brick', 'Adicionar uma peça', '🧱', 'Objetos', 'Uma peça cai sobre a plataforma para construir.', 1, 'peças'],
    ['mystery', 'Abrir caixa misteriosa', '🎁', 'Objetos', 'Uma caixa cai e abre, liberando objetos da cena.', 1, 'caixas'],
    ['diamond', 'Soltar diamantes', '💎', 'Objetos', 'Cristais poligonais caem com restituição alta.', 3, 'cristais'],
    ['coin', 'Espalhar moedas', '🪙', 'Objetos', 'Moedas decorativas quicam; não têm valor financeiro.', 5, 'moedas'],
    ['cat', 'Chegar um gatinho', '🐈', 'Animais', 'Um novo personagem felino entra pela lateral.', 1, 'gatos'],
    ['dog', 'Correr um cachorro', '🐕', 'Animais', 'Um cachorro percorre a plataforma empurrando corpos.', 1, 'cachorros'],
    ['lion', 'Visita do leão', '🦁', 'Animais', 'Um leão atravessa a cena com um som grave sintetizado.', 1, 'leões'],
    ['bird', 'Voar pássaros', '🐦', 'Animais', 'Pássaros seguem um percurso ondulado no céu.', 4, 'pássaros'],
    ['fish', 'Aquário flutuante', '🐠', 'Animais', 'Peixes nadam dentro de bolhas que sobem.', 3, 'peixes'],
    ['duck', 'Patinhos saltitantes', '🦆', 'Animais', 'Patos físicos saltam e esbarram nos objetos.', 2, 'patos'],
    ['hat', 'Vestir um chapéu', '🎩', 'Personagem', 'Um chapéu cai e é vestido pelo personagem.', 1, 'chapéu'],
    ['crown', 'Coroar personagem', '👑', 'Personagem', 'A coroa passa a acompanhar o personagem.', 1, 'coroa'],
    ['cape', 'Vestir uma capa', '🦸', 'Personagem', 'Uma capa colorida acompanha os movimentos.', 1, 'capa'],
    ['grow_character', 'Aumentar personagem', '🔎', 'Personagem', 'Muda o tamanho e o corpo físico do personagem.', 125, 'porcento'],
    ['restore_character', 'Restaurar tamanho', '↩️', 'Personagem', 'Retorna o personagem ao tamanho físico original.', 100, 'porcento'],
    ['move_left', 'Mover para esquerda', '⬅️', 'Personagem', 'Aplica movimento real para a esquerda.', 5, 'velocidade'],
    ['move_right', 'Mover para direita', '➡️', 'Personagem', 'Aplica movimento real para a direita.', 5, 'velocidade'],
    ['jump', 'Dar um salto', '🦘', 'Personagem', 'O personagem salta e volta pela gravidade.', 9, 'força'],
    ['grow_platform', 'Aumentar plataforma', '↔️', 'Física', 'Alarga a superfície física que sustenta o personagem.', 35, 'pixels'],
    ['shrink_platform', 'Diminuir plataforma', '📏', 'Física', 'Reduz a superfície, respeitando uma largura mínima.', 25, 'pixels'],
    ['earthquake', 'Provocar terremoto', '🌋', 'Física', 'A plataforma se move e desequilibra os corpos.', 5, 'segundos'],
    ['fan_left', 'Ventilador à esquerda', '🌬️', 'Física', 'Empurra os corpos para a esquerda por alguns segundos.', 6, 'segundos'],
    ['fan_right', 'Ventilador à direita', '💨', 'Física', 'Empurra os corpos para a direita por alguns segundos.', 6, 'segundos'],
    ['low_gravity', 'Gravidade de pluma', '🪶', 'Física', 'Diminui temporariamente a gravidade de todos os corpos.', 8, 'segundos'],
    ['high_gravity', 'Gravidade pesada', '🪨', 'Física', 'Aumenta temporariamente a gravidade e a queda.', 6, 'segundos'],
    ['bounce', 'Quicar todos os objetos', '🏀', 'Física', 'Aplica um impulso para cima em todos os corpos.', 8, 'força'],
    ['hearts', 'Corações animados', '❤️', 'Celebrações', 'Corações sobem a partir da plataforma.', 12, 'corações'],
    ['confetti', 'Explodir confetes', '🎊', 'Celebrações', 'Confetes coloridos se espalham, sem flashes.', 16, 'confetes'],
    ['fireworks', 'Fogos de papel', '🎆', 'Celebrações', 'Estrelas de papel se abrem em arcos suaves.', 10, 'estrelas'],
    ['bubbles', 'Criar bolhas', '🫧', 'Celebrações', 'Bolhas leves sobem pelo cenário.', 10, 'bolhas'],
    ['crystal_rain', 'Chuva de cristais', '💠', 'Celebrações', 'Uma chuva física distribui cristais sobre a cena.', 12, 'cristais'],
    ['rocket', 'Lançar um foguete', '🚀', 'Celebrações', 'Um foguete físico cruza a tela com rastro de fumaça.', 1, 'foguete'],
    ['birthday', 'Festa de aniversário', '🎂', 'Celebrações', 'Bolo físico, confetes e cenário de festa.', 1, 'festa'],
    ['sparkles', 'Rastro de estrelinhas', '✨', 'Celebrações', 'Um rastro suave acompanha o personagem.', 8, 'segundos'],
    ['day', 'Cenário de dia', '☀️', 'Cenário', 'Muda o céu, as colinas e a iluminação para dia.', 1, 'cenário'],
    ['night', 'Noite tranquila', '🌙', 'Cenário', 'Troca a paisagem por uma noite de tons suaves.', 1, 'cenário'],
    ['autumn', 'Jardim de outono', '🍂', 'Cenário', 'Muda a paleta para outono e acrescenta folhas.', 1, 'cenário'],
    ['ocean', 'Ilha no oceano', '🌊', 'Cenário', 'Troca a paisagem para uma ilha com ondas.', 1, 'cenário'],
    ['party', 'Cenário de festa', '🎈', 'Cenário', 'Decora a paisagem com bandeirinhas e balões.', 1, 'cenário'],
    ['points', 'Dar pontos', '🏆', 'Jogo e utilidades', 'Adiciona pontos ao participante no ranking.', 10, 'pontos'],
    ['remove_points', 'Retirar pontos', '➖', 'Jogo e utilidades', 'Retira pontos sem deixar a pontuação negativa.', 5, 'pontos'],
    ['message', 'Mostrar uma mensagem', '💬', 'Jogo e utilidades', 'Mensagem com nome do participante, por tempo limitado.', 5, 'segundos'],
    ['timer', 'Iniciar cronômetro', '⏱️', 'Jogo e utilidades', 'Inicia um cronômetro real que pausa com a cena.', 20, 'segundos'],
    ['balance', 'Minigame de equilíbrio', '⚖️', 'Jogo e utilidades', 'Sobreviva por 30 segundos sem cair da plataforma.', 30, 'segundos'],
    ['collect', 'Minigame de estrelas', '🌟', 'Jogo e utilidades', 'Recolha três estrelas antes de o tempo terminar.', 25, 'segundos'],
    ['clear_objects', 'Remover objetos', '🧹', 'Jogo e utilidades', 'Remove objetos físicos e decorativos; mantém o personagem.', 1, 'limpeza'],
    ['sound', 'Tocar assinatura sonora', '🎵', 'Jogo e utilidades', 'Toca uma sequência de notas própria desta ação.', 1, 'som'],
    ['stop_wind', 'Desligar ventiladores', '🛑', 'Física', 'Interrompe as forças dos ventiladores imediatamente.', 1, 'ação'],
    ['restore_gravity', 'Restaurar gravidade', '🌎', 'Física', 'Retorna à gravidade normal, cancelando a alteração temporária.', 1, 'ação'],
    ['shower', 'Chuva de bolas', '🎾', 'Física', 'Cria bolas físicas ao longo de alguns segundos.', 8, 'bolas']
];
export const ACTIONS = entries.map((e, i) => ({ id: e[0], name: e[1], icon: e[2], category: e[3], description: e[4], defaultValue: e[5], unit: e[6], colors: [palette[i % 5], palette[(i + 2) % 5]] }));
export const CATEGORIES = [...new Set(ACTIONS.map(a => a.category))];
export const actionById = (id) => ACTIONS.find(a => a.id === id);
let stepId = 0;
export function step(action, value) { return { id: `step-${Date.now().toString(36)}-${++stepId}`, action, value: value ?? actionById(action)?.defaultValue ?? 1, message: 'Bem-vindo, {name}!', delay: 0, sound: true }; }
export const GIFTS = [{ id: 'studio-rose', name: 'Rosa', icon: '🌹' }, { id: 'studio-heart', name: 'Coração', icon: '❤️' }, { id: 'studio-surprise', name: 'Caixa surpresa', icon: '🎁' }, { id: 'studio-hat', name: 'Chapéu', icon: '🎩' }, { id: 'studio-lion', name: 'Leão', icon: '🦁' }, { id: 'studio-rocket', name: 'Foguete', icon: '🚀' }, { id: 'studio-diamond', name: 'Diamante', icon: '💎' }, { id: 'studio-cake', name: 'Bolo', icon: '🎂' }, { id: 'studio-trophy', name: 'Troféu', icon: '🏆' }, { id: 'studio-crown', name: 'Coroa', icon: '👑' }];
export function defaultConfig() {
    const mapped = ['flower', 'hearts', 'mystery', 'hat', 'lion', 'rocket', 'crystal_rain', 'birthday', 'points', 'crown'];
    const rules = GIFTS.map((gift, i) => ({ id: `rule-${gift.id}`, name: `${gift.name} ganha vida`, enabled: true, trigger: 'gift', match: gift.id, target: 5, priority: i === 4 || i === 5 ? 3 : 1, selection: 'all', steps: [step(mapped[i])] }));
    rules.push({ id: 'rule-follow', name: 'Cada seguidor muda a ilha', enabled: true, trigger: 'follow', match: '', target: 5, priority: 2, selection: 'sequence', steps: [step('grow_platform'), step('tree'), step('duck'), step('ball'), step('brick'), step('points'), step('grow_character'), step('confetti')] });
    rules.push({ id: 'rule-goal', name: '5 seguidores: chuva de festa', enabled: true, trigger: 'goal', match: '', target: 5, priority: 3, selection: 'all', steps: [step('confetti'), step('party'), step('points', 30)] });
    rules.push({ id: 'rule-comment-left', name: 'Comentário !esquerda', enabled: true, trigger: 'comment', match: '!esquerda', target: 1, priority: 1, selection: 'all', steps: [step('move_left')] }, { id: 'rule-comment-right', name: 'Comentário !direita', enabled: true, trigger: 'comment', match: '!direita', target: 1, priority: 1, selection: 'all', steps: [step('move_right')] });
    rules.push({ id: 'rule-custom-quake', name: 'Evento terremoto', enabled: true, trigger: 'custom', match: 'terremoto', target: 1, priority: 3, selection: 'all', steps: [step('earthquake')] }, { id: 'rule-likes', name: 'Curtidas espalham corações', enabled: true, trigger: 'like', match: '', target: 1, priority: 1, selection: 'all', steps: [step('hearts')] });
    return { version: 1, rules, gifts: GIFTS.map(g => ({ ...g })), settings: { soundVolume: .3, animations: true, maxObjects: 60, maxEffects: 32 } };
}
