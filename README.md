# Regata do Funchal

Corridas no browser para até 15 jogadores, na Baía do Funchal: de veleiro, mota de água ou lancha, e de mota de motocross pela encosta. Three.js r128 (Water e Sky), multijogador P2P com PeerJS. Tudo estático, sem servidor próprio.

## Jogar

Tipos de corrida: **Só mar** (voltas às boias), **Mar + terra** (as voltas no mar acabam na praia, onde se troca para a mota ou o buggy e se dá uma volta ao circuito) e **Só terra** (voltas ao circuito de terra). Na água escolhe-se veleiro, mota de água ou lancha; todos os jogadores usam o mesmo. Em terra escolhe-se mota ou buggy; o circuito é fechado, com cerca de 5 km à volta da cidade e da serra, e tem rampas para saltar e caixas de objetos, e com Shift derrapa-se.

- **Treinar contra bots**: começa logo, sozinho contra 1 a 14 bots.
- **Criar sala**: dá um código de 4 letras e um link (`?sala=CÓDIGO`) para enviar aos amigos. Entram até 15 pessoas; o anfitrião escolhe as voltas e, se quiser, junta bots. Cada volta tem um percurso diferente (boias A a G).
- **Entrar**: escreve o código e carrega em Entrar.

Objetos: há caixas "?" na água em cada perna. Dão turbo, vento de feição, um balão de água para atirar ao barco da frente ou algas para largar atrás. Usa-se com Espaço ou E (★ no telemóvel) e pode desligar-se no menu.

**Escondidas**: modo a pé numa zona da cidade. Um jogador é o caçador e fica 25 segundos sem ver; os outros escondem-se e pintam-se (Espaço) com a cor do sítio onde estão: parede, árvore ou chão. Depois o caçador tem 2 minutos e meio para lhes tocar. Quem é apanhado passa a caçar também. Ganham os escondidos se sobrar algum no fim.

Animais marinhos (opcional): tubarões em patrulha, uma baleia que vem à superfície e um mosassauro que salta da água depois de um aviso de bolhas. Quem lhes toca fica a rodar uns segundos. Aparecem a vermelho no mapa.

Controlos: A/D ou ←/→ para o leme, W/S ou ↑/↓ para caçar/folgar a vela, C para mudar a câmara, Esc ou P (ou o botão ❚❚) para o menu: pausa, recomeçar, voltar à sala ou ao início. Em telemóvel aparecem botões no ecrã.

A velocidade depende do ângulo ao vento (curva polar) e da afinação da vela. Contra o vento (menos de ~35°) o barco quase para, por isso a primeira perna, até à boia 1, faz-se em bolina, em zigue-zague.

## Opções no URL

- `?q=low`: gráficos leves (sem sombras, reflexos com menos resolução). Liga-se sozinho em telemóveis.
- `?peer=host:porta`: usa um servidor PeerJS próprio em vez do servidor público gratuito.

## Publicar no GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`. O jogo fica em `https://<utilizador>.github.io/regata/`.

## Ficheiros

- `index.html`: interface, HUD e menus
- `game.js`: cena, pista, física dos barcos, bots, rede
- `lib/`: Three.js r128, Water.js, Sky.js e PeerJS 1.5.4 (copiados para não depender de CDNs)
