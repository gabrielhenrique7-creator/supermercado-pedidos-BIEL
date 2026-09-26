# Base reutilizável para próximos projetos

Este documento registra a estrutura que funcionou no G Delivery para evitar repetir decisões e configurações em novos projetos.

## Arquitetura padrão

- Next.js com App Router e Node.js 22+.
- Supabase para Postgres, Auth, Storage e Realtime.
- Netlify para publicação inicial de operações comerciais pequenas, após conferir os termos e limites atuais do plano.
- RLS ativado em todas as tabelas públicas.
- Área pública separada da área administrativa (`/admin`).
- Cliente usa apenas URL pública e chave publishable.
- Operações privilegiadas usam uma chave secreta exclusivamente no servidor.

## Variáveis de ambiente

Públicas e seguras para o navegador:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_WHATSAPP_NUMBER
```

Somente no servidor:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

Nunca colocar secret key, service role ou credenciais em `NEXT_PUBLIC_*`, no GitHub, em screenshots ou em mensagens.

## Fluxo de configuração

1. Criar o projeto Supabase e confirmar a região e o plano.
2. Aplicar o schema/migrations.
3. Criar o usuário administrador no Supabase Auth.
4. Autorizar o UUID em `admin_users`.
5. Configurar as variáveis na hospedagem para produção e pré-visualização.
6. Fazer uma nova publicação depois de qualquer alteração de variável.
7. Testar loja, login, painel, pedido, WhatsApp e atualização de status.
8. Rodar lint, build e os advisors de segurança/performance.

## Decisões de segurança

- Pedidos são gravados por uma função transacional no banco.
- Cliente é atualizado pelo token de acompanhamento e Realtime/polling.
- Produtos e estoque são validados no servidor; o preço nunca vem do navegador.
- Erros internos não são enviados ao cliente.
- Fotos aceitam somente tipos e tamanho definidos no Storage.
- Painel exige Auth e autorização em `admin_users`.
- Cancelar um pedido devolve o estoque uma única vez; reabrir o pedido baixa o estoque novamente e deve falhar se não houver quantidade suficiente.
- Excluir pedido também devolve o estoque, mas nunca pode devolver novamente o estoque de um pedido que já estava cancelado.
- Não apagar pedidos reais automaticamente só para economizar espaço: pedidos podem ser necessários para histórico, suporte, indicadores e obrigações fiscais. Se o volume crescer, arquivar por política definida pelo proprietário.
- A exclusão definitiva fica identificada como recurso exclusivo para testes ou pedidos criados por engano, com confirmação antes da ação.

## Plano Free: ressalvas para avisar cedo

- É adequado para uma operação pequena no início, mas os limites do provedor podem mudar.
- O Supabase Free pode pausar projetos com pouca atividade; reativar não é o mesmo que perda de dados, mas pode causar indisponibilidade temporária.
- Nunca escolher hospedagem somente pelo preço: confirmar previamente se o plano permite uso comercial, funções de servidor, variáveis secretas e o volume esperado.
- Alertar o proprietário antes de qualquer recurso que aumente custo: domínio, plano pago, mensagens, egress, Storage, automações ou gateway de pagamento.

## Dados de conteúdo

Produtos, preços, promoções, estoque, fotos, WhatsApp do proprietário, horários e área de entrega devem ser fornecidos pelo responsável da loja. Enquanto não forem confirmados, usar dados claramente provisórios e avisar que não é conteúdo de produção.

Antes da abertura, produtos provisórios não podem permanecer ativos como se estivessem à venda. O proprietário deve revisar nome, preço, preço anterior, foto, estoque e disponibilidade de cada item.

## Pagamentos e indicadores

- Se o pagamento for combinado pelo WhatsApp, o pedido começa como `Aguardando pagamento` e somente o lojista pode marcá-lo como `Pago`.
- Pagamento na entrega deve permanecer separado de pagamento confirmado.
- Vendas semanais, mensais, total comprado e média por pedido devem considerar somente pedidos válidos e pagos, nunca cancelados.
- Pedidos de teste precisam ser excluídos antes da abertura para não contaminar indicadores nem reduzir estoque.
- O painel deve explicar métricas ambíguas em linguagem simples, por exemplo: `Média por pedido pago = total pago ÷ pedidos pagos`.

## Conta do proprietário

- O acesso inicial pode ser testado pelo desenvolvedor, mas a entrega exige usuário e e-mail controlados pelo proprietário.
- Confirmar troca de senha e saída da conta.
- Manter pelo menos um caminho seguro de recuperação de acesso.
- Remover autorizações administrativas de teste que não devam continuar após a entrega.

## Checklist de entrega

- [ ] URL pública e `/admin` respondem.
- [ ] Login administrativo funciona e usuário não autorizado é bloqueado.
- [ ] Nenhuma chave secreta está versionada.
- [ ] Produtos reais, preços, estoque e fotos foram revisados pelo proprietário.
- [ ] Pedido de teste validado sem deixar registros falsos.
- [ ] Cancelar devolve estoque; reabrir baixa novamente; excluir não duplica a devolução.
- [ ] Pedidos, vendas e métricas de teste estão zerados antes da abertura.
- [ ] Pagamento, WhatsApp e status foram confirmados.
- [ ] E-mail administrativo, senha e recuperação pertencem ao proprietário.
- [ ] Supabase e hospedagem estão em estado saudável.
- [ ] Advisors de segurança foram verificados e qualquer aviso restante foi explicado ao proprietário.
- [ ] `npm run lint` e `npm run build` passaram.
- [ ] Domínio e plano de hospedagem foram decididos pelo proprietário.
- [ ] O proprietário recebeu uma explicação curta sobre editar produtos, confirmar pagamentos, cancelar e excluir somente testes.

## Como reaproveitar em outro projeto

Copiar este documento, `.env.example`, `supabase/schema.sql`, os clientes Supabase, o fluxo de Auth/RLS e o checklist. Depois trocar identidade visual, schema de negócio e conteúdo. Não copiar chaves, usuários, dados de clientes ou pedidos do projeto anterior.
