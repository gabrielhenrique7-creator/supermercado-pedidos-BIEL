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

Sem Supabase configurado, a aplicação entra em modo demonstração e guarda alterações no `localStorage` do navegador. Nesse modo, loja e painel devem ser abertos no mesmo navegador; abas abertas atualizam entre si. Preencha as variáveis de `.env.local` para ativar autenticação Supabase. Nunca coloque uma `service_role` ou secret key em variáveis `NEXT_PUBLIC_*`.

## Supabase

1. Crie uma conta e um projeto gratuito no [Supabase](https://supabase.com/dashboard).
2. Execute o SQL de `supabase/schema.sql` pelo SQL Editor.
3. Crie o usuário administrador em Authentication > Users.
4. Adicione o `id` desse usuário à tabela `admin_users`.
5. Preencha `.env.local` com a Project URL e a Publishable key.

O esquema aplica RLS em todas as tabelas públicas: qualquer visitante pode ler produtos ativos e somente IDs presentes em `admin_users` podem acessar ou alterar a operação. Ele também cria o bucket `product-images`, com leitura pública e escrita restrita aos administradores.

O plano Free é suficiente para começar: 500 MB de banco por projeto, 1 GB de arquivos, 5 GB de egress não armazenado em cache, 5 GB em cache, 50 mil usuários ativos/mês, 2 milhões de mensagens Realtime/mês e até dois projetos ativos. Projetos gratuitos com pouca atividade podem ser pausados depois de aproximadamente sete dias; basta reativá-los no painel. Confira os limites atuais antes da publicação, pois o provedor pode alterá-los.

> A interface completa funciona em demonstração. Para pedidos compartilhados entre aparelhos pela internet, a próxima etapa é conectar o projeto Supabase e ativar o endpoint transacional de pedidos; não exponha uma chave secreta no navegador.

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
 