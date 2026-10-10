# VL Móveis

Loja em **Next.js, React e TypeScript**, com identidade própria em laranja e preto. Esta é uma base funcional para desenvolvimento e atendimento: **não há cobrança online automática, frete automático nem robô de IA conectado**.

## Rodar no computador

Instale o Node.js **24 LTS**. Na pasta do projeto:

```bash
npm ci
npm run dev
```

Abra o navegador no endereço local indicado pelo terminal, na porta 3000. Para testar a versão de produção:

```bash
npm run build
npm start
```

## Acesso administrativo

1. Abra “Entre ou cadastre-se” e crie sua conta com uma senha exclusiva, de pelo menos 12 caracteres. Confirme o e-mail pelo link recebido antes de entrar. Em teste local sem Resend conectado, use `npm run emails -- seu-email` no terminal da pasta do projeto e abra o link mostrado; é uma prévia local, nenhum e-mail foi enviado.
2. No terminal do **servidor da loja**, habilite somente a conta da pessoa responsável:

```bash
npm run admin -- seu-email@example.com
```

3. Atualize a página da conta e abra “Painel da loja”. O painel também está no caminho `/admin`.

O comando exige uma conta existente. O primeiro usuário cadastrado **não** ganha acesso administrativo automaticamente. Não existe senha padrão ou acesso administrativo público. Não envie senhas em conversas.

## O que funciona

- Home, catálogo, busca por texto, filtro por categoria, favoritos e comparação de até três produtos.
- Produto com descrição, medidas, fonte original, fotografia por cor quando fornecida e consulta de entrega por CEP.
- Cadastro com confirmação de e-mail, reenvio de confirmação, recuperação de senha, login, logout e sessão persistente. Sacola local para visitantes, migrada para a conta ao entrar.
- Produtos sem preço geram orçamento pelo WhatsApp **(21) 99001-5722**. Nenhum preço, desconto, estoque ou avaliação foi inventado.
- Pedido de produtos com preço e estoque cadastrados, para retirada em Sepetiba ou Campo Grande. O pedido calcula o valor no servidor e reserva estoque; não cobra o cliente.
- Administração de produtos, imagens, preços, desconto percentual por produto, desconto em reais em pedidos pendentes, quantidade geral e quantidade/preço por combinação de cor e medida. Arquivar preserva o histórico; produtos com reserva não podem ser removidos.
- Confirmação manual de pagamento, baixa transacional de estoque, lançamento idempotente no caixa e conclusão da entrega. Cancelamento de pedido pendente libera as reservas. Não há estorno automatizado de pedidos pagos.
- Atendimento cliente/equipe com histórico persistente e atualização periódica. Ainda não há notificações externas ou atendimento por IA.
- Banners com foto, texto, destino interno e publicação no carrossel. Despesas e entradas manuais no fluxo de caixa. Dashboard atualizado a cada 15 segundos enquanto aberto.
- Avaliações de contas reais, uma por pessoa/produto. “Compra confirmada” só aparece quando há pedido pago daquele produto.

## Catálogos e revisão dos produtos

Os quatro PDFs originais ficam em `sources/catalogs`, apenas como fontes internas da importação; não são servidos no site. A página e os links de Catálogos Ortobom foram retirados. `data/catalog.json` contém a importação inicial; cada item registra catálogo e página. `data/import-report.json` descreve as fontes e as limitações. Fotos extraídas ficam em `public/catalogo`.

**Revise a disponibilidade atual e as combinações de medida/altura antes de vender.** Há documentação histórica de 2021, e algumas páginas contêm tabelas de vários produtos. A importação é uma seleção estruturada dos documentos, não uma confirmação comercial do fabricante. Os PDFs originais são usados somente internamente. Móveis de outros fabricantes e eletros não estão nesses arquivos: essas categorias aguardam cadastro da loja.

As medidas são mostradas na ordem usada pela fonte. Quando não há fotografia própria de outra cor, não simulamos uma cor no produto. O administrador pode enviar a fotografia real de cada variação. O catálogo não contém os preços de venda da VL Móveis nem o estoque atual.

Para refazer a extração, opcionalmente instale PyMuPDF, Pillow e Tesseract e execute:

```bash
python3 scripts/import-catalogs.py --sources sources/catalogs
python3 scripts/refine-catalog-media.py
```

Isso atualiza o arquivo de importação e as fotografias; **não sobrescreve os produtos já administrados no banco**. O banco só recebe o catálogo inicial quando não há produtos cadastrados.

## Dados e operação

O banco SQLite fica em `data/store.sqlite`, fora do Git. Contém contas, sessões, sacolas, mensagens, pedidos, estoque, caixa, banners e auditoria. Imagens enviadas pelo painel ficam em `public/catalogo` e também precisam de backup.

- Use uma instalação Node persistente com disco gravável. **Não hospede esta versão em funções sem disco persistente ou em múltiplas instâncias independentes.** Para escalar, migre o banco para PostgreSQL e as imagens para armazenamento de objetos.
- Em produção, termine HTTPS em um proxy confiável e defina `APP_ORIGIN` com a origem pública exata. O cookie de sessão é `Secure` em produção.
- Defina `DB_PATH` para o volume persistente, se necessário. Execute o comando de administrador com o mesmo `DB_PATH` usado pelo servidor.
- Faça backups consistentes do SQLite com sua ferramenta de backup SQLite; não copie apenas o arquivo principal enquanto houver gravações em WAL. Inclua as imagens enviadas e teste a restauração.
- Antes de publicar, revise os dados da empresa e as políticas com a loja. Endereço administrativo informado: Estrada do Piaí, nº 6269, Rio de Janeiro – RJ, CEP 23545-353; CNPJ informado: 39.930.081/0001-64. Endereços de atendimento e horários das duas lojas ainda precisam ser confirmados.

## Segurança implementada

Senhas com scrypt e salt aleatório; tokens de sessão aleatórios armazenados como hash; cookies HttpOnly/SameSite/Secure; autorização de administrador no servidor; checagem de origem nas mutações; limites de tentativas; validação com Zod; SQL parametrizado; preço recalculado no servidor; operações de estoque/caixa transacionais; auditoria; imagens decodificadas e regravadas em WebP, com limites de tamanho/pixels; CSP com nonce por resposta, proteção contra frames e cabeçalhos de segurança.

A CSP permite estilos inline para cores e layout; scripts de produção exigem nonce. O ambiente de desenvolvimento permite `unsafe-eval` para as ferramentas do Next. Nenhuma dessas medidas equivale a uma garantia de segurança absoluta. Esta versão ainda não inclui MFA, antifraude, integração fiscal, auditoria independente ou rotinas automatizadas de backup. Recuperação por e-mail já funciona quando o envio está conectado. Pedidos de privacidade são atendidos pela equipe.

## Integrações e escolhas recomendadas

- **Pagamentos:** usar um intermediador como Mercado Pago para Pix/cartão, checkout hospedado e notificações autenticadas. Não capturar dados de cartão na loja. É necessário cadastrar a empresa no intermediador e conectar suas credenciais; informar apenas uma conta bancária não ativa a cobrança. Esse gateway não está implementado nesta versão.
- **Frete:** manter retirada e orçamento local para móveis/colchões, confirmando dimensões, acesso e montagem. Depois conectar a transportadora ou agregador que realmente atende essas cargas. A consulta atual valida o formato do CEP, mas não consulta endereço, tarifa ou prazo externos.
- **Estoque:** o estoque local já atende os pedidos. Para um ERP externo, existe um conector genérico autenticado, descrito em [INTEGRACOES.md](INTEGRACOES.md). A adaptação ao fornecedor escolhido e o envio das baixas para esse fornecedor ainda precisam ser implementados.
- **IA:** manter o atendimento humano atual. Um futuro robô poderá usar a mesma conversa, identificando claramente quando é IA e transferindo histórico à equipe. O guia de conforto da Home usa regras de características; não é IA nem recomendação médica.

## Verificar

```bash
npm run typecheck
npm run build
npm test
npm run test:ui
```

Os testes de API usam o build de produção e criam um banco isolado. `npm test` recompila antes de executar; após um build recente, `npm run test:api` evita a recompilação. Os testes de navegador iniciam o build de produção na porta 3102, usam outro banco e removem as imagens de teste. Não usam nem alteram contas, pedidos ou estoque da instalação principal. Para `test:ui`, Chromium deve estar instalado: use `CHROMIUM_PATH` ou instale o navegador do Playwright com `npx playwright install chromium`. Capturas ficam em `VL_ARTIFACTS_DIR` (por padrão `/workspace/vl-moveis-validation` neste ambiente).

O ambiente cloud já é isolado: use este checkout, sem criar um Git worktree para tarefas normais.

## Confirmação de e-mail e Resend

O cadastro cria uma conta pendente e não concede sessão. Um link de uso único confirma o endereço; só depois o cliente entra com e-mail e senha. Links de confirmação expiram em 24 horas, e os de recuperação em 30 minutos. O banco guarda apenas o hash do token. Reenviar invalida o link anterior, e trocar a senha encerra todas as sessões. Um link de recuperação também comprova o endereço. Contas antigas ainda sem confirmação precisam confirmar o e-mail para entrar.

Para envio real, configure no servidor (ou no arquivo `.env.local` do seu computador, fora do Git):

```dotenv
RESEND_API_KEY=coloque-a-chave-aqui-no-seu-servidor
EMAIL_FROM=VL Móveis <contato@seu-dominio-verificado.com.br>
APP_ORIGIN=https://endereco-publico-da-loja
```

São exemplos de configuração, não credenciais funcionais. Cadastre/verifique o domínio remetente no Resend e copie os registros DNS indicados pelo serviço. Se usa Zoho Mail, mantenha seus registros de recebimento e configure o Resend para envio transacional, preferencialmente em um subdomínio dedicado. Não apague os registros MX do Zoho e não crie dois registros SPF para o mesmo nome. Depois reinicie o servidor e faça um cadastro com uma caixa de e-mail que você controla para validar a entrega real e o link. Apenas declarar uma variável não confirma entrega.

Em testes locais, `APP_ORIGIN` pode ser a origem local do navegador indicada no terminal. Sem a chave do Resend, o desenvolvimento usa **prévia local**, gravada em `data/emails-local` com acesso restrito, fora do Git. A tela informa que nenhum e-mail foi enviado. Use `npm run emails -- seu-email` no terminal do projeto para ler a última mensagem e abrir o link. **Não há prévia local para origens públicas.** Em produção sem serviço conectado, o cadastro não finge enviar e-mail: informa que a configuração está pendente.

No painel do Resend, abra **Domains** e confira se o domínio remetente está **Verified**. Em **API keys → Create API key**, crie uma chave com permissão **Sending access**, restrita ao domínio de envio quando disponível. Copie a chave uma única vez diretamente para `RESEND_API_KEY` no arquivo privado `.env.local`, na pasta que contém `package.json`; não cole na conversa. O endereço em **Emails → To** é um destinatário, não comprova um remetente verificado.

Para a prévia no seu computador, use `APP_ORIGIN` com o endereço exibido pelo iniciador. Remova uma eventual linha `EMAIL_MODE=local` ao ativar envio real; ela força a prévia e impede entrega. Não substitua o arquivo `.env.local` inteiro caso já tenha outras configurações. Salve e reinicie com `bash iniciar-linux.sh`. Teste o cadastro com uma caixa de e-mail que você controla e confirme o status **Delivered** em **Emails**. O link local só funciona no computador onde o site está rodando.

A chave do Resend não deve ser enviada no chat, compartilhada com clientes ou colocada no JavaScript do navegador. A confirmação comprova controle do endereço de e-mail; não substitui controles de pagamento e antifraude.

## Ajuda e crediário

`/ajuda` contém busca por texto (sem distinção de acentos), categorias e respostas expansíveis. A página inicial apresenta fotos e especificações do modelo selecionado, sem acrescentar características não documentadas. Cartão VL Móveis e crediário são solicitados na loja ou pelo WhatsApp; até 36 parcelas dependem de aprovação da financeira, com consulta ao SPC e Serasa. O site não contrata essas modalidades nem cobra automaticamente por Pix, cartão ou boleto.

## Descontos no painel

Em **Produtos e estoque → Editar**, informe o desconto de 0 a 90%. Ele se aplica ao preço geral e aos preços de variação, é mostrado fora da foto e é recalculado pelo servidor ao reservar o pedido. Sem preço cadastrado, continua sob consulta.

Em **Pedidos e clientes**, pedidos pendentes permitem desconto em reais. Esse valor é separado do subtotal, aparece no total do cliente e no caixa após confirmar o recebimento. Só um administrador pode alterar descontos, e pedidos pagos/concluídos não permitem alteração retroativa. Todas essas alterações deixam auditoria. Não há cobrança online automática.

## Atualizar sua cópia local

Encerre o servidor com Ctrl+C, baixe a versão atual da branch `preview-vl-moveis` no GitHub e extraia sobre a mesma pasta do projeto, substituindo os arquivos do código. Preserve `.env.local`, `data/store.sqlite` e arquivos WAL; eles não são incluídos no ZIP. Não apague a pasta antiga com seus dados. Depois execute `bash iniciar-linux.sh` na pasta do projeto. As imagens originais são atualizadas com uma migração que preserva preços, estoque, pedidos e imagens personalizadas. A rota de PDFs antigos permanece bloqueada mesmo se arquivos de uma versão anterior ainda estiverem no disco.
