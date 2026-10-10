# Publicar a VL Móveis mantendo o domínio

O domínio `vlmoveis.net.br` continua registrado no Registro.br. Trocar a hospedagem não exige transferir o registro do domínio.

## Hospedagem preparada

A versão atual usa SQLite e fotos enviadas pelo administrador. Por isso precisa de **uma única instância com disco persistente**. O arquivo `render.yaml` prepara Render com Docker, serviço Starter e disco de 1 GB. Serviço e disco são pagos; confira o preço atual no painel antes de criar. Nada é publicado apenas por existir este arquivo.

Na Vercel seria necessário migrar SQLite para um banco externo e as fotos enviadas para armazenamento externo. Não conecte esta versão a funções com disco temporário: contas e pedidos não podem depender desses arquivos temporários.

## Passos no Render

1. Entre em `https://dashboard.render.com` e conecte sua conta do GitHub.
2. Escolha **New → Blueprint**, selecione `doomfag/vl-moveis-novo` e a branch `preview-vl-moveis`. Revise o serviço e o disco do arquivo `render.yaml`.
3. Configure no painel privado: `RESEND_API_KEY` com a chave completa; `EMAIL_FROM` com um endereço no domínio realmente verificado pelo Resend; `STORE_OWNER_EMAIL=kauacontato98@gmail.com`.
4. Defina `APP_ORIGIN` com o endereço HTTPS exato fornecido pelo Render para o serviço. Se o painel só fornecer esse endereço depois de criar o serviço, complete a configuração e reinicie antes de testar o cadastro.
5. Não configure `EMAIL_MODE=local`. Ela só serve para testes locais, sem envio.
6. Aguarde o build e confirme que `/api/health` está saudável. Teste fotos, cadastro, confirmação, login, painel e pedido no endereço do Render antes de alterar o domínio atual.
7. Cadastre `kauacontato98@gmail.com` **no site hospedado**, defina sua senha e confirme o e-mail. A configuração privada identifica essa conta como proprietária e concede o primeiro acesso administrativo depois da confirmação. Não há senha padrão ou cadastro público de administrador. Se já existir um administrador, use o procedimento de operador: `node scripts/admin.mjs email-da-conta` no Shell do serviço, com o mesmo `DB_PATH`.
8. O banco e as fotos ficam no disco configurado. Reinício ou nova versão não apagam a conta. Faça backups consistentes e guarde uma cópia fora da hospedagem; disco persistente não substitui backup. Não exclua o serviço/disco ao atualizar.

A conta de teste criada no computador não é automaticamente transferida ao servidor. Se houver dados reais que precisem migrar, faça backup e restauração antes de apontar o domínio. O script `atualizar-linux.sh` facilita atualizações locais, preservando dados e configuração.

## Domínio no Registro.br e site antigo na Vercel

1. Registre quais servidores DNS e registros atuais o domínio usa. Se o Registro.br delega DNS para outra empresa, os registros devem ser alterados nessa empresa; não troque os servidores DNS sem migrar todos os registros existentes.
2. Em **Settings → Custom Domains** do Render, adicione `vlmoveis.net.br` e `www.vlmoveis.net.br`.
3. Copie **exatamente** os registros solicitados pelo Render para os registros web correspondentes no provedor DNS. Não invente IP nem use o IP de um exemplo.
4. Preserve MX, SPF, DKIM e DMARC do Zoho, os registros do Resend e o subdomínio `send.vlmoveis.net.br`. Não substitua toda a zona DNS nem crie dois SPF no mesmo nome.
5. Quando o domínio e HTTPS forem confirmados no Render, use `APP_ORIGIN=https://vlmoveis.net.br` (ou a origem canônica adotada). Teste cadastro, confirmação e recuperação pelo domínio definitivo.
6. Mantenha o site antigo da Vercel disponível durante a mudança e até confirmar o funcionamento. A propagação de DNS varia; verifique antes de remover qualquer configuração antiga.

## Pagamentos e frete

Esta publicação permite catálogo, atendimento, cadastro, painel e pedidos sujeitos à confirmação. O site ainda não cobra automaticamente por Pix, cartão ou boleto nem calcula frete de transportadora. Cartão VL Móveis e crediário são atendidos pelo WhatsApp/loja. Não anuncie cobrança automática antes da integração real.

## Backup

O contêiner inicia o site com `scripts/start-production.mjs`. Ele cria uma cópia consistente do banco SQLite e das fotos enviadas um minuto após iniciar e a cada 24 horas enquanto o serviço fica ativo. Guarda as três cópias mais recentes em `/var/lib/vl-moveis/backups`, no disco privado; falhas são informadas nos logs. A aba **Backup** do administrador mostra a última cópia e permite baixar um arquivo `.tar.gz` atualizado, com banco, fotos, instruções e hashes SHA-256. Clientes e visitantes não têm acesso.

**Guarde regularmente uma cópia fora do Render**, em computador ou armazenamento privado. As cópias locais não sobrevivem à exclusão do disco e não constituem backup externo automático. Nenhum serviço externo de armazenamento foi contratado ou conectado. Chaves de API, variáveis privadas e o código do site não entram no arquivo; preserve essas configurações separadamente no painel privado. As fotos originais do catálogo estão no repositório, enquanto as enviadas pelo admin ficam na cópia.

Para restaurar, pare o serviço, preserve o banco e as fotos atuais, extraia o arquivo em pasta privada e confira os hashes do `manifest.json`. Restaure `store.sqlite` em `DB_PATH` e o conteúdo de `photos` em `CATALOG_UPLOAD_DIR`, com permissões privadas do usuário do serviço. Somente com o serviço parado, retire os antigos arquivos `-wal` e `-shm` antes de iniciar com o banco restaurado. Confira cadastro, login, produtos e fotos. O teste automatizado verifica recuperação de dados gravados em WAL e fotos, integridade, retenção e preservação das cópias em falhas.
