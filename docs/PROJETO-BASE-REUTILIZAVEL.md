# Base reutilizável para próximos projetos

Este documento registra a estrutura que funcionou no G Delivery para evitar repetir decisões e configurações em novos projetos.

## Arquitetura padrão

- Next.js com App Router e Node.js 22+.
- Supabase para Postgres, Auth, Storage e Realtime.
- Vercel para publicação inicial.
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
5. Configurar as variáveis na Vercel em Production e Preview.
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
- Não apagar pedidos automaticamente só para economizar espaço: pedidos podem ser necessários para histórico, suporte e obrigações fiscais. Se o volume crescer, arquivar por política definida pelo proprietário.

## Plano Free: ressalvas para avisar cedo

- É adequado para uma operação pequena no início, mas os limites do provedor podem mudar.
- O Supabase Free pode pausar projetos com pouca atividade; reativar não é o mesmo que perda de dados, mas pode causar indisponibilidade temporária.
- O Vercel Hobby é voltado a uso pessoal/não comercial. Para vender de forma profissional, revisar o plano e os termos antes de divulgar amplamente.
- Alertar o proprietário antes de qualquer recurso que aumente custo: domínio, plano pago, mensagens, egress, Storage, automações ou gateway de pagamento.

## Dados de conteúdo

Produtos, preços, promoções, estoque, fotos, WhatsApp do proprietário, horários e área de entrega devem ser fornecidos pelo responsável da loja. Enquanto não forem confirmados, usar dados claramente provisórios e avisar que não é conteúdo de produção.

## Checklist de entrega

- [ ] URL pública e `/admin` respondem.
- [ ] Login administrativo funciona e usuário não autorizado é bloqueado.
- [ ] Nenhuma chave secreta está versionada.
- [ ] Produtos reais, preços, estoque e fotos foram revisados pelo proprietário.
- [ ] Pedido de teste validado sem deixar registros falsos.
- [ ] Pagamento, WhatsApp e status foram confirmados.
- [ ] Supabase e Vercel estão em estado saudável.
- [ ] `npm run lint` e `npm run build` passaram.
- [ ] Domínio e plano de hospedagem foram decididos pelo proprietário.

## Como reaproveitar em outro projeto

Copiar este documento, `.env.example`, `supabase/schema.sql`, os clientes Supabase, o fluxo de Auth/RLS e o checklist. Depois trocar identidade visual, schema de negócio e conteúdo. Não copiar chaves, usuários, dados de clientes ou pedidos do projeto anterior.
