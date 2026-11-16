# Regata do Funchal

Corridas no browser para até 15 jogadores, na Baía do Funchal: de veleiro, mota de água ou lancha, e de mota de motocross pela encosta. Three.js r128 (Water e Sky), multijogador P2P com PeerJS. Tudo estático, sem servidor próprio.

## Jogar

Tipos de corrida: **Só mar** (voltas às boias), **Mar + mota** (as voltas no mar acabam na praia, onde se troca para a mota e se sobe o trilho até ao moinho) e **Só mota** (cada volta é subir ao moinho e descer à praia). Na água escolhe-se veleiro, mota de água ou lancha; todos os jogadores usam o mesmo.

- **Treinar contra bots**: começa logo, sozinho contra 1 a 14 bots.
- **Criar sala**: dá um código de 4 letras e um link (`?sala=CÓDIGO`) para enviar aos amigos. Entram até 15 pessoas; o anfitrião escolhe as voltas e, se quiser, junta bots. Cada volta tem um percurso diferente (boias A a G).
- **Entrar**: escreve o código e carrega em Entrar.

Objetos: há caixas "?" na água em cada perna. Dão turbo, vento de feição, um balão de água para atirar ao barco da frente ou algas para largar atrás. Usa-se com Espaço ou E (★ no telemóvel) e pode desligar-se no menu.

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
