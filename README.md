# Jogos da Amizade — App de Campeonato

Projeto React (Vite + Tailwind) pronto para publicar na Vercel.

## Como publicar na Vercel (sem linha de comando)

1. Descompacte este .zip numa pasta no computador.
2. Crie uma conta em https://vercel.com (dá pra entrar com GitHub, Google ou e-mail).
3. Crie um repositório novo no GitHub e suba os arquivos desta pasta nele
   (pelo próprio site do GitHub: "Add file" → "Upload files", arrasta tudo
   menos a pasta `node_modules`, que nem existe nesse zip).
4. Na Vercel, clique em "Add New" → "Project", conecte sua conta do GitHub
   e escolha o repositório que você acabou de criar.
5. A Vercel detecta sozinha que é um projeto Vite — não precisa mexer em
   nenhuma configuração. Clique em "Deploy".
6. Em ~1 minuto o app estará no ar, com uma URL tipo
   `campeonato-app.vercel.app`. Toda vez que você atualizar o código no
   GitHub, a Vercel publica a nova versão automaticamente.

## Como rodar localmente antes de publicar (opcional, se quiser testar)

Precisa ter o Node.js instalado (https://nodejs.org).

```
npm install
npm run dev
```

Abre em http://localhost:5173

## Antes de publicar: configure o Firebase (obrigatório)

Esse app agora guarda os dados do campeonato num banco de dados na nuvem
(Firebase), pra todo mundo ver as mesmas informações e só você poder editar.
Sem esse passo, o app não funciona. Leva uns 10 minutos, só uma vez:

1. Acesse https://console.firebase.google.com e crie um projeto novo
   (pode chamar "campeonato-app", por exemplo). Não precisa habilitar o
   Google Analytics.
2. No menu lateral, vá em **Build > Firestore Database** → "Criar banco de
   dados" → escolha "Iniciar no modo de produção" → escolha a região mais
   próxima (ex: `southamerica-east1`).
3. Ainda no Firestore, clique na aba **Regras** e cole o conteúdo do arquivo
   `firestore.rules` (está nesta pasta), trocando `SEU_EMAIL_ADMIN@exemplo.com`
   pelo e-mail que você vai usar pra logar como administrador. Clique em
   "Publicar".
4. No menu lateral, vá em **Build > Authentication** → "Vamos começar" →
   ative o provedor **E-mail/senha**.
5. Na aba **Users** do Authentication, clique em "Add user" e cadastre o
   mesmo e-mail (e uma senha) que você colocou nas regras do passo 3. Esse
   é o login que você vai usar dentro do app.
6. Volte pra tela inicial do projeto (ícone de engrenagem > Configurações
   do projeto), role até "Seus apps", clique no ícone `</>` (Web) pra
   registrar um app, dê um nome qualquer, e copie o objeto `firebaseConfig`
   que aparece.
7. Abra `src/firebase.js` nesta pasta e cole os valores copiados no lugar
   de cada `"COLE_AQUI"`.
8. Suba os arquivos atualizados pro GitHub (inclusive o `firebase.js` já
   preenchido — essas chaves são feitas pra ficar públicas, quem protege
   os dados são as regras do passo 3, não o segredo dessas chaves).

Depois disso, é só publicar na Vercel normalmente (passos acima). Pra
logar como administrador dentro do app, use o e-mail e senha que você
cadastrou no passo 5.

## Se quiser trocar a senha do administrador depois

Vá em Firebase Console > Authentication > Users, clique nos três pontinhos
ao lado do seu usuário > "Reset password" (ele manda um e-mail), ou exclua
e recrie o usuário com senha nova. Nunca mais precisa mexer em código pra
isso.
