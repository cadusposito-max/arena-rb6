# ARENA RB6

Site responsivo em português para organizar campeonatos e consultar resultados de futevôlei. O frontend está em `dist/`. Ele usa Supabase Auth e funções transacionais no PostgreSQL. A demonstração usa nomes e placares fictícios.

## Rodar no computador

Use Node.js 22 ou superior. Na pasta deste README, execute:

```sh
npm ci
npm run build
npm test
npm start
```

Abra http://127.0.0.1:4173. O build empacota o cliente oficial do Supabase e copia as fontes. Os arquivos de interface e o motor em `dist/` são fontes rastreadas e devem ser mantidos.

## Subir ao GitHub e hospedar

O repositório tem esta pasta (`arena-areia/`) e o workflow `.github/workflows/pages.yml` na raiz. A chave `sb_publishable` em `src/cloud.js` pode ser publicada; o arquivo `.env.vapid` (chave privada dos avisos) fica fora do Git. Para GitHub Pages, em Settings → Pages selecione **GitHub Actions**. A cada push na branch `main` o workflow **Publicar ARENA RB6** roda os testes, faz o build e publica `arena-areia/dist/` (também pode ser rodado à mão na aba Actions). Em outro host estático, sirva `dist/`. A navegação e os links de edições funcionam em subdiretórios.

## Supabase

O projeto configurado é `djtrecfikuaxgkyfbqny`. A sequência de migrações em `supabase/migrations/` cria o schema privado `arena_areia` e as funções públicas prefixadas com `arena_areia_`. Para outra instância, aplique as migrações na ordem dos nomes, ajuste URL e chave pública em `src/cloud.js` e refaça o build. No painel de Authentication, habilite e-mail/senha e cadastre o endereço do site em **URL Configuration → Redirect URLs** (incluindo o caminho do repositório no Pages) para links de recuperação de senha. Configure SMTP para os e-mails dos organizadores.

O site não tem cadastro: contas de organizador são criadas em **Authentication → Users → Add user** (marque *Auto Confirm User*). Desative **Allow new users to sign up** em Authentication → Sign In / Providers para que ninguém crie conta pela API.

A migração `202611050003_identidade_e_capa.sql` adiciona a identidade das duplas (atletas, apelido, cor e símbolo), a foto de capa da edição e o bucket público `arena-capas` do Storage. Sem ela, o site continua funcionando com identidades e capa padrão.

## App no celular e avisos

O site é instalável (PWA: `dist/manifest.webmanifest` e `dist/sw.js`). Cada atleta toca em **Ativar avisos** e escolhe a própria dupla. Nada de nome, e-mail ou telefone: o aparelho guarda a dupla escolhida e o banco guarda só o endereço de push do navegador ligado à vaga (`arena_areia.push_subs`). A dupla fica destacada como **VOCÊ** na chave.

Avisos enviados:
- **Próximo jogo definido**: automático quando um placar salvo completa as duas duplas de um jogo.
- **É a sua vez**: o organizador abre o jogo e toca em **Chamar duplas** (com a quadra, opcional).

No iPhone, a Apple só entrega notificações de sites instalados na tela inicial (Safari → Compartilhar → Adicionar à Tela de Início). O site mostra esse passo a passo.

Configuração (uma vez):
1. Rode `supabase/migrations/202611050004_avisos.sql` no SQL Editor.
2. Gere as chaves VAPID: `npx web-push generate-vapid-keys`.
3. Em **Edge Functions**, crie a função com o conteúdo de `supabase/functions/arena-push/index.ts` e **desligue "Verify JWT"** (a função confere o organizador por conta própria). O site chama o endereço `/functions/v1/super-responder`, definido em `dist/push.mjs` (constante `FN`). Se recriar a função com outro endereço, ajuste essa constante.
4. Em **Edge Functions → Secrets**, cadastre `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (ex.: `mailto:seu-email@dominio.com`). A chave privada nunca vai para o site nem para o repositório.

O site precisa estar em HTTPS (GitHub Pages já é).

## Chave flexível (6 a 32 duplas)

Requer a migração `202611050006_chave_flexivel.sql` (modelos de chave de 6 a 32 duplas, criação com qualquer tamanho, sorteio de vagas e avisos para até 32 vagas). Depois de rodá-la, publique de novo a função de avisos com o `index.ts` atual: ela passa a ler a chave de cada edição. O SQL é gerado por `supabase/scripts/make-migration-0006.mjs` a partir do motor do site; a pasta `supabase/` fica só no computador.

## Quadras e chamada automática

Requer a migração `202611060007_quadras.sql`. Ao criar o campeonato (ou em **Organizar → Edição → Quadras**) informe quantas quadras estão em uso (1 a 8). Os primeiros jogos prontos ocupam as quadras sem aviso. Quando o placar de um jogo em quadra é salvo, a quadra libera e o próximo jogo da fila (na ordem da chave) é chamado para ela automaticamente, com o aviso "é a sua vez · Quadra N" no celular das duas duplas; quem ficou com o jogo definido mas sem quadra livre recebe "próximo jogo definido". O placar e o novo mapa de quadras são gravados na mesma transação. Na chave, jogos em andamento aparecem como **Quadra N** (ponto vermelho) e o card "Você segue" mostra "É a sua vez" ou a posição na fila. O botão **Chamar** continua disponível para chamar um jogo fora da ordem. A lógica fica em `dist/courts.mjs` e os testes simulam campeonatos inteiros com 1 a 4 quadras.

## Painel do organizador

Organizadores logados veem a aba **Organizar** (e entram direto nela ao fazer login). Requer a migração `202611050005_painel_organizador.sql`.

- **Placares**: jogos prontos para jogar com campos de placar, botão **Chamar** (avisa as duplas, com quadra opcional) e contagem de celulares com aviso ligado por dupla. Jogos concluídos podem ser corrigidos ou apagados (apagar só é permitido se os jogos seguintes ainda não tiverem resultado).
- **Duplas**: atletas, apelido, cor e símbolo de cada vaga. A ordem das vagas não muda depois da criação.
- **Edição**: nome, visibilidade, foto de capa, link para os atletas, organizadores, encerramento e conta.

## Operar

1. Entre em **Área do organizador** com a conta criada no Supabase. Crie uma edição com nome, foto de capa (opcional) e de 6 a 32 duplas: os dois atletas, um apelido opcional e a cor e o símbolo de cada dupla. **Adicionar dupla** e o **×** de cada card mudam a quantidade; **Colar lista** preenche várias de uma vez (uma dupla por linha). As vagas na chave são sorteadas ao criar e podem ser sorteadas de novo no painel (**Duplas → Sortear posições de novo**) até o primeiro placar. O rascunho fica salvo no navegador até a edição ser criada. A opção de visibilidade controla a leitura anônima no banco.
2. Selecione um jogo disponível e salve o placar. A chave resolve vencedores e perdedores pelas dependências do modelo v1. Os visitantes consultam atualizações a cada 15 segundos. A lista **Campeonatos** permite trocar de edição.
3. Corrija resultados pelo mesmo formulário. O banco rejeita edições concorrentes e alterações do vencedor quando um dependente já tem resultado. Alterações são registradas em `arena_areia.audit`. As políticas de acesso são aplicadas no servidor.
4. O administrador pode adicionar um organizador com conta confirmada, que passa a operar as suas edições. Para revogar acesso, o administrador do banco remove o vínculo em `arena_areia.staff`.
5. Depois de concluir todos os jogos (duplas × 2 − 2), encerre a edição. Para reutilizar a estrutura, crie outra edição. Os dados da anterior ficam no histórico.

## Modelo e regras

Dupla eliminação gerada por `dist/engine.mjs` para qualquer número de 6 a 32 duplas (sempre duplas × 2 − 2 jogos). Chave principal na ordem clássica de cabeças (1×8, 4×5…): quando o número de duplas não fecha uma potência de 2, as primeiras vagas entram direto na 2ª rodada. Quem perde vai para a repescagem, dividida em dois lados (os perdedores trocam de lado a cada rodada para evitar reencontros cedo). Os dois perdedores da classificatória da principal cruzam de lado e enfrentam os sobreviventes da repescagem; depois vêm as semifinais, o 3º lugar e a final (sempre os 4 últimos jogos). A **Chave completa** abre **espelhada** (os lados se encontram no meio, com a final ao centro) em telas largas e **linear** no celular em pé; o botão ao lado dos filtros troca e a escolha fica salva no aparelho. Os filtros Principal, Repescagem e Finais isolam cada parte. Em tela cheia a chave é ajustada para caber inteira, com zoom (−/+, pinça com dois dedos no celular, toque na porcentagem para reajustar) e arrastar. Edições criadas antes da chave flexível continuam no modelo v1 (18 duplas, 34 jogos). Os testes simulam milhares de campeonatos de cada tamanho.

Este MVP assume de 6 a 32 duplas, vagas sorteadas, dois placares inteiros diferentes e encerramento depois de todos os jogos. A organização deve validar regras específicas de sets, pontuação-alvo, W.O., desistências e empates antes de uso oficial. Teste restauração de backup e os e-mails no domínio de produção antes do primeiro evento.

Logo original em `brand/` (monograma RB, versões branca e escura com fundo transparente); o logo do site e os ícones do app em `dist/assets/` saem dela. Imagem ilustrativa de futevôlei gerada com IA para o projeto. Fontes Barlow Condensed e Inter sob SIL Open Font License (licenças em `dist/assets/`).
