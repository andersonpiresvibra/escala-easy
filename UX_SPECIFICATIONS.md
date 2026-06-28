# Especificações de UX para Monitores de Notebooks (Telas Pequenas e Médias)
## Sistema de Gestão de Escala "Escala Easy VIBRA"

Este documento estabelece as diretrizes de design e usabilidade de interface do usuário (UI/UX) aplicadas no sistema para acomodar perfeitamente usuários que trabalham em laptops, minimizando o cansaço cognitivo e maximizando o espaço vertical útil.

---

### 1. LIMITAÇÕES REAIS DE HARDWARE EM LAPTOPS
* **Resolução Típica:** 1366x768 ou 1920x1080 com escalonamento de tela de 125% a 150%.
* **Altura Útil do Navegador (Viewport Height):** Geralmente reduzida para apenas **500px a 650px** devido à barra de tarefas, guias e barra de favoritos do navegador.
* **Carga Vertical Crítica:** Qualquer painel, caixa ("box"), padding exagerado ou cabeçalho redundante empurra a grade principal de escala para fora da área visível da tela, forçando rolagens exaustivas.

---

### 2. DIRETRIZES DE DESIGN DE ALTA FIDELIDADE APLICADAS

#### A. Layout de Tela Sem "Caixas Empilhadas" (Full-width & Border-to-border)
* **Eliminação de Box-in-Box:** Evitamos cartões (`cards`) aninhados com bordas internas e margens duplas. Toda a largura do viewport é aproveitada.
* **Padding Fluido e Compacto:** Usamos paddings dinâmicos (`p-3 md:p-6`) que se ajustam à resolução da tela, dando prioridade para a densidade de informações em pátios de missão crítica.
* **Ocupação 100% da Altura:** A aplicação é contida dentro de `h-screen` com `overflow-hidden`. A rolagem ocorre estritamente dentro da tabela e dos painéis internos que necessitam dela, eliminando a rolagem indesejada de toda a página de fundo.

#### B. Painel de Pintura Compacto (Single-Line Paintbrush)
* **Design Horizontal de Linha Única:** O modo de pintura em massa foi resumido a uma única barra fina de ferramentas (`id="paintbrush_laptop_optimized_panel"`).
* **Ausência de Descrições Longas:** Subtítulos informais e descrições redundantes são substituídos por `tooltips` nativas (`title="..."`) para manter a altura vertical mínima possível.
* **Alinhamento Lado a Lado:** Turnos de pátio e afastamentos são exibidos de forma sequencial na horizontal com divisores finos, perfeitos para cliques ágeis sem mudar o foco visual.

#### C. Edição de Linha Única (Inline Row-Level Editing)
* **Coluna de Ações Dedicada:** Inclusão de uma coluna fixa à direita (`sticky right-0`), provida de um botão com ícone de lápis (`edit`).
* **Micro-Interação Dinâmica:** 
  1. Ao clicar no lápis, a linha entra em modo exclusivo de edição.
  2. O ícone de lápis abre espaço imediatamente para o botão de confirmação (ícone de checkmark `check`) e botão de cancelamento (ícone de fechar `close`).
  3. Todas as células da linha correspondente se transformam em elementos de dropdown compactos (`<select>`), permitindo que o gestor mude qualquer dia com apenas dois cliques de mouse/trackpad.
  4. Nenhuma outra linha ou elemento da página é perturbado, preservando o estado global intacto.

#### D. Cabeçalho de Tabela Fixo (Sticky Header & Left Columns)
* **Rolagem Multidirecional Protegida:** 
  * O cabeçalho contendo os dias e dias da semana é fixado no topo (`sticky top-0 z-30`).
  * A coluna contendo os nomes dos colaboradores é fixada na esquerda (`sticky left-0 z-10`).
  * A coluna de ações é fixada na direita (`sticky right-0 z-10`).
* Isso permite navegar horizontalmente pelos 30 dias de escala sem nunca perder de vista qual colaborador está sendo analisado, ou quais ações de validação estão ativas.

---

### 3. PROTOCOLO DE TESTES DE INTERATIVIDADE
Sempre que uma nova funcionalidade for adicionada, ela deve ser inspecionada sob uma janela de navegador reduzida para **1280x720** para garantir que:
1. Nenhuma barra de rolagem horizontal principal surja fora do contêiner da tabela.
2. A tabela de escala ocupe pelo menos 60% da área útil vertical visível.
3. Elementos de clique (botões e selects) possuam um alvo mínimo de pelo menos `h-6` a `h-7`, ideal para trackpads de notebooks.
