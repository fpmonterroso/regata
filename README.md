# Regata do Funchal

Regata à vela no browser, até 4 jogadores, na Baía do Funchal. Three.js r128 (Water e Sky), multijogador P2P com PeerJS. Tudo estático, sem servidor próprio.

## Jogar

- **Treinar contra bots**: começa logo, sozinho contra 3 bots.
- **Criar sala**: dá um código de 4 letras e um link (`?sala=CÓDIGO`) para enviar aos amigos. O anfitrião escolhe as voltas e se os lugares vazios ficam com bots.
- **Entrar**: escreve o código e carrega em Entrar.

Controlos: A/D ou ←/→ para o leme, W/S ou ↑/↓ para caçar/folgar a vela, C para mudar a câmara. Em telemóvel aparecem botões no ecrã.

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
