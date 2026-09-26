# G Delivery

Loja virtual responsiva para uma operação local de bebidas em Gonçalves Dias (MA), com catálogo, carrinho, pedidos detalhados, entrega grátis e painel administrativo para produtos, fotos, estoque, status, previsão e indicadores.

## Rodar localmente

Requer Node.js 22 ou superior.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. O painel fica em `http://localhost:3000/admin`.

Sem Supabase configurado, a loja não exibe produtos e o painel fica bloqueado para evitar dados de demonstração em produção. Preencha as variáveis de `.env.local` para ativar autenticação e pedidos reais. Nunca coloque uma `service_role` ou secret key em variáveis `NEXT_PUBLIC_*`.

## Supabase

1. Crie uma conta e um projeto gratuito no [Supabase](https://supabase.com/dashboard).
2. Execute o SQL de `supabase/schema.sql` pelo SQL Editor.
3. Crie o usuário administrador em Authentication > Users.
4. Adicione o `id` desse usuário à tabela `admin_users`.
5. Preencha `.env.local` com a Project URL, a Publishable key e a Secret key. Use também `SUPABASE_URL` no ambiente do servidor.

O esquema aplica RLS em todas as tabelas públicas: qualquer visitante pode ler produtos ativos e somente IDs presentes em `admin_users` podem acessar ou alterar a operação. Ele também cria o bucket `product-images`, com leitura pública e escrita restrita aos administradores.

O plano Free é suficiente para começar: 500 MB de banco por projeto, 1 GB de arquivos, 5 GB de egress não armazenado em cache, 5 GB em cache, 50 mil usuários ativos/mês, 2 milhões de mensagens Realtime/mês e até dois projetos ativos. Projetos gratuitos com pouca atividade podem ser pausados depois de aproximadamente sete dias; basta reativá-los no painel. Confira os limites atuais antes da publicação, pois o provedor pode alterá-los.

> O endpoint transacional usa `SUPABASE_URL` e `SUPABASE_SECRET_KEY` apenas no servidor. A chave secreta nunca pode ser enviada ao navegador.

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm start
```

## Antes de publicar

- Troque o número de WhatsApp no `.env.local`.
- Substitua preços e produtos demonstrativos.
- Configure a área real de entrega e os horários. A interface está definida sem taxa de entrega.
- Use Node.js 22+ no provedor de hospedagem.

## Reaproveitamento

O guia [docs/PROJETO-BASE-REUTILIZAVEL.md](docs/PROJETO-BASE-REUTILIZAVEL.md) registra a arquitetura, segurança, limites de plano e checklist para iniciar projetos semelhantes sem refazer todo o diagnóstico.
