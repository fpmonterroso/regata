# Regata do Funchal

Jogos no browser para até 15 jogadores: regatas na Baía do Funchal, no Tejo e no Douro, motocross, escondidas, carros de cesto do Monte e carga de rabelos. Three.js r128 (Water e Sky), multijogador P2P com PeerJS. Tudo estático, sem servidor próprio.

## Jogar

O início tem uma caixa por jogo. Escolhe-se o jogo e as opções, e depois treina-se contra bots, cria-se uma sala ou entra-se numa com o código.

- **Mar**: voltas às boias de veleiro, mota de água ou lancha, em três pistas: Baía do Funchal, Rio Tejo (Belém, ponte e Terreiro do Paço) e Rio Douro (da Ribeira à Foz e volta). As boias mudam de posição em cada corrida. Nos rios há corrente e, no Tejo, cacilheiros a atravessar. As motas de água apanham ondas: saltam nas cristas e ganham velocidade a descer.
- **Terra**: circuito fechado de motocross, de mota ou buggy, com rampas, lombas, lama, placas de turbo e piruetas no ar (Shift) que dão turbo se a aterragem correr bem.
- **Mar e Terra**: as voltas no mar acabam na praia, onde se troca para a mota ou o buggy.
- **Escondidas**: a pé na cidade. Os escondidos copiam o fundo para o corpo (V), transformam-se num objeto ao acaso (F), mudam de pose (Q) ou pintam o boneco à mão (Espaço). Os caçadores têm uma arma de tinta para os descobrir. Quem é apanhado passa a caçar.
- **Carros de Cesto**: descida longa e larga do Monte, só com a gravidade. Trava-se com o patim esquerdo ou direito para virar e derrapar; os patins aquecem e perdem aderência. Há pedras a evitar e faixas lisas que dão mais lanço.
- **Carga de Rabelos**: corrida no Douro com 2 a 12 pipas. Mais pipas dão mais bónus no fim, mas o barco fica mais pesado, adorna mais e pode perder carga nas curvas.

Objetos: as caixas "?" dão ajudas conforme a posição. Quem vai à frente só recebe algas ou balões de água, quem vai no meio recebe balões ou escudo, e os últimos recebem turbo e vento de feição. Usa-se com Espaço ou E (★ no telemóvel).

Animais marinhos (opcional): tubarões, uma baleia e um mosassauro. Quem lhes toca fica a rodar uns segundos.

Controlos: A/D ou ←/→ para virar, W/S ou ↑/↓ para caçar/folgar a vela ou acelerar/travar, C para mudar a câmara, Esc ou P para o menu. Em telemóvel aparecem botões no ecrã.

Salas: até 15 jogadores, com código de 4 letras ou link (`?sala=CÓDIGO`). O anfitrião escolhe o jogo e pode juntar bots.

## Opções no URL

- `?q=low`: gráficos leves (sem sombras nem bloom, reflexos com menos resolução). Liga-se sozinho em telemóveis.
- `?bloom=0`: desliga só o bloom.
- `?peer=host:porta`: usa um servidor PeerJS próprio em vez do servidor público gratuito.

## Publicar no GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`. O jogo fica em `https://<utilizador>.github.io/regata/`.

## Ficheiros

- `index.html`: interface, HUD e menus
- `game.js`: cena, pista, física dos barcos, bots, rede
- `lib/`: Three.js r128, Water.js, Sky.js, post.js (EffectComposer e bloom do r128) e PeerJS 1.5.4 (copiados para não depender de CDNs)
