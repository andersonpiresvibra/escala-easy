# MANUAL DE USUÁRIO E DOCUMENTAÇÃO TÉCNICA
## ESCALA EASY VIBRA — SISTEMA DE GESTÃO DE ESCALAS

Este documento reúne a documentação técnica e o manual de operações do sistema **Escala Easy VIBRA**. Projetado estritamente para a automação, otimização e gestão de escalas mensais de trabalho corporativo, o sistema garante conformidade regulatória, controle de fadiga e eficiência operacional de equipes divididas em turnos operacionais e administrativos.

---

## 1. SOBRE O APLICATIVO

O **Escala Easy VIBRA** é uma solução web responsiva desenvolvida para organizar e gerenciar a distribuição diária de trabalho de colaboradores em múltiplos setores corporativos (como Aeródromo, VIP e Treinamento), operando de forma integrada entre dispositivos desktop (para gestores) e mobile (para operadores).

### Diretriz de Negócio Crítica
O sistema opera em contexto **estritamente corporativo e administrativo**. Não há qualquer associação com aviação civil, aeronaves, voos comerciais ou infraestrutura física de aeroportos. Todos os colaboradores cadastrados representam profissionais internos identificados sob o padrão de ID limpo `collab_` (ex: `collab_12345`).

---

## 2. OBJETIVOS DO SISTEMA

* **Automatizar a Escala Mensal:** Geração automática da grade com apenas 1 clique, integrando regras regulatórias e de bem-estar.
* **Prevenir Fadiga Ocupacional:** Bloqueio e validação da regra de fadiga (**Diretriz 5x1**), impedindo escalas consecutivas superiores a 5 dias de trabalho para um mesmo colaborador.
* **Garantir Contingente Mínimo:** Controle em tempo real do contingente ativo de pátio e setores, alertando visualmente se o nível de segurança operacional for violado (mínimo de 5 profissionais nos finais de semana e 6 a 7 em dias de semana).
* **Fomentar a Autogestão:** Portal do Colaborador para que operadores configurem datas comemorativas, solicitem folgas em uma janela controlada e realizem permutas transparentes.
* **Assegurar Governança e Auditoria:** Histórico completo de alterações (Audit Log) e alçadas rígidas de acesso (Operador, Líder de Turno e Supervisor).

---

## 3. ESTRUTURA DE SESSÕES (NAVEGAÇÃO DO APP)

O sistema é dividido em três áreas principais de controle de alçadas (ACL - Role-Based Access Control):

### A. Painel de Escala Coletiva (Visão do Líder de Turno - LT)
* **Objetivo:** Visualização macro, planejamento e alterações diárias na grade de todos os colaboradores do turno.
* **Elementos Principais:**
  * **Grade Mãe (Matriz Bidimensional):** Exibição bidimensional de Colaboradores vs. Dias do Mês (1 a 31). Cada célula indica se o dia é de trabalho ou folga/afastamento corporativo.
  * **Contador de Contingente Diário:** Rodapé dinâmico que calcula o número de operadores ativos por dia, aplicando cor verde (adequado) ou vermelho (insuficiente).
  * **Botão "Gerar Escala Inteligente":** Disparador do motor de otimização automatizada.
  * **Painel de Empatia:** Lembretes visuais de aniversariantes da semana para engajamento interno da equipe.

### B. Painel de Auditoria e Homologação (Visão do Supervisor)
* **Objetivo:** Fiscalizar processos de permuta, auditar alterações diretas e aprovar definitivamente o fechamento do mês.
* **Elementos Principais:**
  * **Status de Fechamento:** Indicador visual se a escala do mês está "Pendente" ou "Homologada e Publicada".
  * **Histórico de Auditoria (Logs):** Tabela de ocorrências detalhada, contendo tipo de ação, descrição, data/hora e autor.
  * **Sobreposição Manual (Overrule):** Permissão de alteração direta de qualquer célula de colaborador/dia na Grade Mãe com atualização imediata e geração automática de log de auditoria correspondente.

### C. Portal do Colaborador (Visão do Operador - Mobile)
* **Objetivo:** Espaço individual para autogestão do trabalhador.
* **Elementos Principais:**
  * **Simulador de Usuário:** Menu rápido para fins de desenvolvimento que permite simular o login de diferentes colaboradores cadastrados.
  * **Configuração de Datas Comemorativas (Datas Magnas):** Cadastro obrigatório de 5 datas especiais (Aniversário próprio, aniversário do cônjuge, aniversário dos filhos, data de casamento e aniversário da mãe) com respectivo "Ranking de Desapego".
  * **Janela Temporal de Folgas:** Interface de solicitação de preferências de folga de comum acordo (ativa do dia 20 ao dia 23 de cada mês).
  * **Calendário Mensal Individual:** Grade de dias estilizada exibindo cores para Trabalho, Folga Comum e Folgas por Data Magna (com ícones decorativos de bolo para aniversário, alianças para casamento, corações para família, etc.).
  * **Central de Permutas (Trocas):** Criação e acompanhamento de propostas de troca de turnos com outros operadores com linha do tempo visual de aprovação.

---

## 4. FUNCIONALIDADES INTEGRADAS

### I. Motor de Otimização e Distribuição de Turnos
O motor automatizado executa uma varredura para preencher os dias de escala de acordo com as seguintes regras em cascata:
1. **Pré-marcação de Folgas Especiais:** Reserva as datas especiais registradas no perfil de cada colaborador como folgas.
2. **Distribuição do Padrão de Trabalho (5x1):** Distribui turnos de trabalho buscando manter uma sequência saudável de 5 dias trabalhados para cada 2 dias de folga (folga "sanduíche").
3. **Respeito às Folgas Comuns Solicitadas:** Integra as solicitações aprovadas na janela mensal de preferências.

### II. Central Eletrônica de Permutas com Validação Inteligente
Permite aos operadores solicitarem trocas diretas. O fluxo de aprovação é 100% integrado e auditado:
$$\text{Operador A Propõe} \rightarrow \text{Operador B Aceita} \rightarrow \text{Validação de Fadiga e Mínimo Diário} \rightarrow \text{LT Valida} \rightarrow \text{Supervisor Homologa}$$

### III. Gestão Flexível de Afastamentos (Siglas de Abonos)
Integração de indisponibilidades operacionais com siglas corporativas padronizadas:
* **CP (Curso/Treinamento):** Afastamento para qualificação.
* **LI (Licença):** Licenças corporativas diversas.
* **TA (Trabalho Administrativo):** Atuação em regime administrativo sem pátio ativo.
* **EX (Exame Médico):** Realização de exames obrigatórios periódicos.
* **AT (Atestado):** Afastamento médico por razões de saúde.

---

## 5. GUIAS PASSO-A-PASSO DAS TAREFAS

### TAREFA A: CADASTRAR UM NOVO COLABORADOR (LÍDER/SUPERVISOR)
1. No menu superior ou lateral de navegação, certifique-se de estar na aba de gerenciamento de equipe ou clique na seção **Colaboradores**.
2. Localize o formulário **"[+ Novo Colaborador]"** (ou equivalente em botões de cadastro rápido).
3. Preencha as informações obrigatórias do trabalhador:
   * **Nome Completo:** Nome social ou de registro do colaborador.
   * **Data de Aniversário:** Campo de data (utilizado pelo motor para prever a folga automática no mês de nascimento).
   * **Regime de Trabalho:** Escolha a carga horária (Ex: 7h20, 6h00, 8h00).
   * **Turno:** Defina o turno base do trabalhador (Madrugada, Tarde, Manhã ou Administrativo).
   * **Setor de Atuação:** Defina o local de atividade (Aeródromo, VIP ou Treinamento).
   * **Saldo Inicial de Banco de Horas (BH):** Valor de saldo acumulado.
4. Clique em **"Cadastrar Colaborador"**. O colaborador será gerado com o prefixo identificador `collab_` no banco de dados e ficará visível na Grade Mãe de Escala imediatamente.

---

### TAREFA B: GERENCIAR SIGLAS, TURNOS E AFASTAMENTOS (LÍDER DE TURNO)
Como gestor, você pode lançar abonos operacionais que indisponibilizam temporariamente o profissional.
#### Método 1: Modo Pincel (Rápido e Prático)
1. Na parte superior da Grade Mãe, clique no botão de seleção de **Ferramenta de Pincel (Afastamentos/Folgas)**.
2. Selecione a sigla que deseja aplicar na lista disponível (por exemplo, **CP** para Curso ou **AT** para Atestado).
3. O cursor de seleção será ativado para "Modo Pintura".
4. Vá até a Grade Mãe e clique diretamente na célula correspondente ao **colaborador** e ao **dia** em que deseja aplicar o afastamento.
5. A célula será pintada imediatamente com a cor correspondente à sigla, o contingente ativo daquele dia será recalculado e uma auditoria interna será gerada.

#### Método 2: Edição Direta via Grade Mãe (Duplo Clique ou Menu Suspenso)
1. Dê um clique duplo ou clique no botão de edição de linha de um colaborador específico na tabela da Grade Mãe.
2. Isso habilitará o modo de edição de linha diretamente na tabela.
3. Para o dia desejado, utilize o menu de seleção suspenso para escolher entre:
   * **T** (Trabalho/Turno Regular)
   * **F** (Folga)
   * **Siglas Especiais** (CP, LI, TA, EX, AT)
4. Clique em **"Salvar"** ao final da linha do colaborador para persistir as alterações em tempo real no banco de dados corporativo (Supabase).

---

### TAREFA C: INSERIR FOLGAS COMUNS E EXAMES PERIÓDICOS (OPERADOR)
#### Para Solicitação de Folgas Comuns (Janela Temporal):
1. Acesse o **Portal do Colaborador** (simule o login com seu usuário se estiver testando).
2. O sistema verifica se a data atual está entre o **dia 20 e o dia 23** do mês corrente. Caso esteja dentro deste período, o botão **"Solicitar Preferências"** estará habilitado em cor verde.
3. No calendário do Portal, clique em um dia que esteja com a indicação de disponível (sem atingir o teto de solicitações simultâneas por dia).
4. O sistema irá registrar o dia como **"Folga Comum (F)"** e pré-carimbar o dia na sua escala individual, deduzindo do seu saldo de folgas mensais disponíveis.
5. Para remover uma solicitação, basta clicar novamente sobre o dia no calendário do Portal durante a janela de solicitação ativa.

#### Para Inserção de Exames Periódicos (EX) ou Afastamentos pela Gestão:
1. O operador deve encaminhar o agendamento do exame ou atestado para o Líder de Turno (LT) ou Supervisor.
2. O Líder de Turno acessará o painel administrativo, selecionará a ferramenta pincel **EX (Exame Médico)** ou **AT (Atestado)** e clicará sobre o dia correspondente da escala do colaborador para registrar a indisponibilidade.

---

### TAREFA D: CRIAR E REALIZAR UMA PERMUTA DE TURNOS (OPERADOR)
As permutas amigáveis permitem trocar os dias de trabalho entre dois colegas de equipe de forma automatizada:
1. Acesse o **Portal do Colaborador** e vá até a seção **Permutas**.
2. Clique no botão azul **"[+ Propor Nova Troca]"**.
3. No formulário do modal que se abrirá, preencha:
   * **Seu Dia de Trabalho (Saída):** O dia da escala em que você gostaria de folgar.
   * **Dia de Retorno (Trabalho do Colega):** O dia em que você se propõe a trabalhar em substituição ao colega.
   * **Colega da Troca:** Selecione na lista suspensa o operador com quem deseja propor a troca.
4. Clique em **"Enviar Proposta de Permuta"**. A proposta ficará pendente na central com o status inicial **"Aguardando Aceite do Colega"**.
5. O colega selecionado receberá uma notificação na tela dele, podendo visualizar a proposta e clicar em **"Aceitar Permuta"** ou **"Recusar Permuta"**.
6. Assim que o colega aceitar, o sistema executa o validador interno para checar se a troca infringe a regra de fadiga 5x1 para ambos ou se desrespeita o contingente mínimo. Se estiver tudo correto, a proposta passa para o status **"Aguardando Validação do Líder (LT)"**.
7. O Líder de Turno valida tecnicamente a troca no painel gerencial, enviando-a para a etapa final de homologação.
8. O Supervisor visualiza o card e homologa o fechamento. O status na linha do tempo horizontal é atualizado para **"Aprovada e Homologada"** e os turnos são automaticamente trocados na Grade Mãe de forma transparente.

---

## 6. PERGUNTAS FREQUENTES (FAQ) E RESOLUÇÃO DE PROBLEMAS

### O que acontece se eu tentar programar uma folga comum e o botão estiver desabilitado?
O botão é bloqueado automaticamente a partir do dia 24 do mês anterior ao planejamento da escala. Além disso, se o teto regulatório de folgas simultâneas para o pátio operacional no dia selecionado já tiver sido alcançado (limite de 2 operadores de folga no mesmo dia), o dia ficará travado para seleção, garantindo que o contingente mínimo ativo não caia abaixo do limite de segurança.

### O sistema permite trabalhar 6 dias seguidos caso ocorra uma necessidade extrema?
O motor de geração e os validadores de permuta barram de forma intransigente qualquer sequência de trabalho superior a 5 dias. O limite 5x1 é regulatório e atua como uma barreira rígida para preservar a saúde e a integridade física dos profissionais do turno.

### Como funciona o critério de desempate no fim de ano?
Nos dias 24/25 de Dezembro e 31 de Dezembro/01 de Janeiro, as folgas de perfil de aniversários e casamentos são pausadas. O sistema realiza uma inversão automática de 50% baseado na escala realizada no ano anterior para manter a justiça na distribuição de plantões de feriados.

---
**Escala Easy VIBRA** — *Conectando eficiência, segurança de pátio e o bem-estar da sua equipe corporativa.*
