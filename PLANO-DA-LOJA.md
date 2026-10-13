# Próximas etapas da VL Móveis

## Preparado nesta atualização

- Mais comprados: seleção automática de até quatro produtos com estoque cadastrado, considerando unidades de pedidos pagos/concluídos e recebimentos registrados nos últimos 90 dias. Reservas, cancelamentos e recebimentos antigos não contam. A seção aparece quando houver vendas elegíveis.
- Destaques por margem: até duas posições priorizam produtos com custo privado cadastrado e margem unitária positiva no preço atual da variação exibida, já considerando desconto do produto. Busca diversidade de categorias. Não é cálculo de lucro líquido: taxas, impostos, frete e publicidade ainda não estão integrados.
- Administração → Destaques automáticos: permite cadastrar custo geral ou específico por cor/medida, remover custos e conferir a seleção. Custos nunca são publicados na API de catálogo ou página inicial.
- Atendimento: contador de conversas pendentes e mensagens não lidas, atualização automática do painel e aviso por e-mail ao proprietário. Abrir uma conversa marca somente a leitura; a pendência permanece até a resposta. As mensagens seguem a ordem de inserção, mesmo quando chegam no mesmo segundo.
- Os avisos são processados a cada 20 segundos no contêiner de produção. Envia um aviso por conversa pendente e volta a avisar depois que a equipe respondeu e o cliente enviou nova mensagem. Uma falha de e-mail fica registrada para novas tentativas com intervalo progressivo. O e-mail não inclui o texto da conversa.
- O destinatário padrão dos avisos é STORE_OWNER_EMAIL; CHAT_NOTIFY_EMAIL pode definir outro destinatário privado. Continuam usando o remetente EMAIL_FROM e a chave privada de Resend já configurados. A caixa de saída, leituras e custos estão no banco e entram no backup.

## Pagamento: Mercado Pago

Escolhido por simplicidade operacional. Começar pelo Checkout Pro hospedado: o cartão e o CVV são informados no serviço de pagamento, sem armazenamento pela loja. O cliente pode pagar pelos meios habilitados na conta do provedor. A empresa cadastra a conta bancária no Mercado Pago; o dinheiro é repassado conforme seus prazos, tarifas e disponibilidade. Pagamento aprovado e repasse bancário são estados diferentes.

Ainda não está conectado. São necessários:

1. Conta comercial da empresa e aplicação de integração no Mercado Pago, com credenciais de teste. Guardar credenciais somente em configuração privada, nunca no Git, planilha ou conversa.
2. Ler a documentação atual e implementar o checkout com valores calculados pelo servidor, associação entre pagamento e pedido e verificação de notificações assinadas.
3. Conferir pagamento no próprio provedor, moeda BRL, valor exato, recebedor e pedido antes de marcar como pago; tratar repetição, rejeição, estorno e contestação. Uma página de retorno ou confirmação enviada pelo navegador não comprova pagamento.
4. Testar compra em sandbox, estoque/reservas, confirmação, cancelamento e conciliação. Sem esses testes, não habilitar cobranças reais.
5. Cadastrar a conta bancária da VL Móveis no painel do provedor e revisar condições comerciais com o responsável. A identificação e os dados bancários são preenchidos pelo proprietário no serviço, sem enviá-los na conversa.
6. Mostrar no financeiro vendas, taxas, líquido e situação do recebimento/repasse. Esse painel deve servir para consulta, sem saques ou transferências bancárias pela loja.

## Frete: Frenet

A primeira etapa é cotação; contratar a entrega, emitir etiqueta/coleta e acompanhar a transportadora vêm depois. A gratuidade e os limites da API devem ser confirmados no plano atual da conta. Um cálculo de frete gratuito não torna a entrega gratuita.

Ainda não está conectado. São necessários:

1. Conta Frenet e token privado da API.
2. CEP de saída da mercadoria (loja/depósito efetivo).
3. Peso real em kg e dimensões da embalagem em cm, por produto e variação. Medida do colchão montado não substitui medida da embalagem de transporte.
4. Consultar a API com produtos, quantidades, valor declarado e CEP do cliente. Exibir apenas serviços e valores retornados; em falha, dados incompletos ou rota indisponível, oferecer orçamento com a loja.
5. Confirmar transportadoras que aceitam colchões, sofás, geladeiras e seus volumes. A existência de uma cotação não prova contrato, cobertura, coleta, montagem ou capacidade de transportar um móvel específico.
6. Antes de cobrar frete, recalcular/verificar a cotação no servidor e vincular serviço, prazo e preço ao pedido. Depois do pagamento confirmado, contratar entrega e tratar etiqueta, rastreamento, falhas e cancelamento.

## Gestão da loja e tráfego

Usar um ERP pronto como Bling ou Olist Tiny para SKUs/variações, compras, estoque físico, vendas e documentos fiscais. Comparar preço do plano inicial, acesso à API e funções necessárias antes de contratar. O ERP deve ser a fonte oficial do estoque; o site mantém uma cópia sincronizada e registra reservas/pedidos de forma consistente. Validar envio de pedidos, baixa de estoque, sincronização e eventos repetidos antes de abrir vendas reais.

Usar Google Sheets como relatório de gestão: por dia/campanha, registrar vendas pagas, faturamento, taxas, custo dos produtos, frete pago pela loja, gastos com anúncios e resultado. Os números devem vir de vendas confirmadas e conciliação; uma tabela de acompanhamento não deve alterar o estoque em paralelo ao ERP.

A IA pode resumir esses números, identificar campanhas e produtos com melhor resultado e ajudar a escrever anúncios. Começar com dados agregados, sem cartões, senhas, chaves ou conteúdo privado de clientes. Não alterar preço, estoque nem orçamento de anúncios automaticamente sem uma regra comercial definida.

## Segurança antes de ativar vendas

A auditoria final permanece pendente até as integrações reais estarem montadas. Verificar HTTPS, proteção de sessão, permissões de clientes/admin, origem das requisições, validação de preços/frete no servidor, reservas concorrentes, assinaturas das notificações, valor/recebedor dos pagamentos, eventos repetidos, estornos, dados em logs, segredos, dependências, backup e recuperação. Testar também isolamento de pedidos e conversas entre clientes e privacidade dos custos.

Não armazenar número completo do cartão ou CVV. O banco SQLite tem permissões privadas, mas isso não equivale a declarar todos os dados criptografados em repouso; verificar os controles da hospedagem e os provedores. Testes locais e simulados não certificam a configuração bancária, a entrega real ou a segurança integral dos provedores externos.
