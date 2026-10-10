# Conector genérico de estoque

A loja possui estoque local e um endpoint para receber quantidades de um sistema externo. **Não é uma integração pronta com Bling, Tiny ou outro ERP específico.** O fornecedor escolhido precisa adaptar seu envio a este contrato. Baixas feitas pela loja ainda não são enviadas automaticamente para um ERP externo; não ative duas fontes independentes de estoque sem definir quem é a fonte principal.

Configure `INVENTORY_WEBHOOK_SECRET` no ambiente seguro do servidor, com um segredo aleatório de pelo menos 32 caracteres. Não coloque esse valor no Git, em imagens, no navegador ou em conversas. Sem ele, o endpoint responde 503.

## Requisição

`POST /api/integrations/inventory` · `Content-Type: application/json`

```json
{
  "eventId": "um-uuid-unico-por-evento",
  "productId": "base-sommier-bau-camurca",
  "stock": 8,
  "color": "Marrom",
  "size": "188 × 138 cm"
}
```

`color` e `size` são opcionais: sem eles, atualiza o estoque geral; com eles, devem corresponder exatamente a uma variação cadastrada. `stock` é a quantidade física total, **antes de subtrair as reservas do site**, e não um incremento. Estoque abaixo das reservas é rejeitado com 409.

- `x-vl-timestamp`: instante atual em milissegundos, 13 dígitos. Aceita diferença máxima de cinco minutos.
- `x-vl-signature`: `sha256=` seguido do HMAC-SHA256 hexadecimal de `timestamp + "." + corpoJSONExato`, usando o segredo do servidor.
- A assinatura cobre os bytes originais, inclusive espaços. Enviar o mesmo `eventId` novamente retorna `duplicate: true` e não aplica a alteração outra vez.

As alterações ficam na auditoria. O endpoint não usa cookies e não depende da origem do navegador; usa sua própria autenticação por assinatura. Rejeita assinaturas inválidas/expiradas e corpos acima de 64 KB.

## Limites atuais

Não há descoberta de SKU do ERP, OAuth de fornecedor, sincronização fiscal, exportação automática de pedidos nem fila de reenvio. O operador pode localizar os códigos do fabricante na fonte do produto e na busca do painel. Antes da integração real, defina a correspondência entre SKU externo e identificador/variação da loja e teste com o fornecedor em homologação.
