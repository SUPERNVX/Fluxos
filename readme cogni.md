# Cogni IA - Plataforma de Ferramentas Educacionais

## 🎯 Visão Geral

A **Cogni IA** é uma plataforma moderna focada em ferramentas educacionais inteligentes que utilizam Inteligência Artificial para potencializar o desempenho acadêmico de estudantes. Nossa missão é transformar a forma como estudantes aprendem, se preparam e alcançam seus objetivos educacionais.

## 🚀 Proposta do Projeto

### Objetivo Principal
Capacitar estudantes a alcançar seu máximo potencial acadêmico através de ferramentas inteligentes e personalizadas, eliminando métodos ultrapassados de estudo e oferecendo soluções que realmente funcionam.

### Público-Alvo
- **Estudantes** preparando-se para ENEM e vestibulares
- **Escolas** buscando ferramentas inovadoras para seus alunos
- **Educadores** interessados em tecnologia educacional

### Diferencial Competitivo
Não somos mais uma plataforma de cursos genéricos. Somos parceiros no sucesso acadêmico, oferecendo:
- Ferramentas que se adaptam ao estilo de aprendizado individual
- IA que ensina, orienta e acelera o progresso
- Resultados mensuráveis e feedback instantâneo

## 🛠️ Ferramentas Principais

### 1. **Scribo** - IA para Redações
- **Função**: Correção e aperfeiçoamento de redações para ENEM e vestibulares
- **Tecnologia**: IA avançada para análise textual
- **Benefícios**: 
  - Feedback instantâneo e personalizado
  - Correções detalhadas
  - Orientações para melhoria
  - Caminho para a nota 1000

### 2. **Calculadora de Notas** - Planejamento Estratégico
- **Função**: Cálculo preciso de notas necessárias para atingir metas
- **Tecnologia**: Algoritmos de planejamento acadêmico
- **Benefícios**:
  - Eliminação da ansiedade sobre notas
  - Planejamento estratégico de estudos
  - Visualização clara de objetivos
  - Controle total sobre o desempenho

## 🎨 Design e Experiência Visual

### Paleta de Cores
- **Fundo Principal**: `#1A1625` (roxo escuro profundo)
- **Texto Primário**: `#F3F4F6` (branco suave)
- **Texto Secundário**: `#9CA3AF` (cinza claro)
- **Accent Principal**: `#8B5CF6` (roxo vibrante)
- **Accent Secundário**: `#60A5FA` (azul suave)
- **Sucesso**: `#34D399` (verde)
- **Alerta**: `#FB7185` (rosa)

### Tipografia
- **Títulos**: Merriweather (serif, elegante)
- **Corpo**: Lato (sans-serif, legível)

### Background Animado - DarkVeil
- **Tecnologia**: WebGL com shaders personalizados
- **Efeito**: Ondas fluidas em tons roxos
- **Parâmetros**: Speed=2, WarpAmount=1.5
- **Cores**: Gradiente de 5 tons roxos para profundidade

## 🏗️ Estrutura Técnica

### Tecnologias Utilizadas
```
Frontend:
├── React 19.1.1
├── Vite 7.1.0
├── GSAP 3.13.0 (animações)
├── OGL 1.0.11 (WebGL)
└── Lucide React (ícones)

Ferramentas:
├── ESLint (qualidade de código)
└── CSS3 (estilização customizada)
```

### Estrutura de Arquivos
```
src/
├── App.jsx              # Componente principal e roteamento
├── style.css            # Estilos globais e responsivos
├── main.jsx             # Ponto de entrada da aplicação
├── SplitText.jsx        # Animação de texto com GSAP
├── DarkVeil.jsx         # Background animado WebGL
├── DarkVeil.css         # Estilos do canvas WebGL
└── assets/
    └── react.svg        # Logo do React
```

### Componentes Principais

#### 1. **App.jsx**
- Gerenciamento de estado da navegação
- Roteamento entre páginas
- Estrutura principal da aplicação

#### 2. **HomeContent**
- Página principal com background DarkVeil
- Texto animado com SplitText
- Layout responsivo e moderno

#### 3. **SplitText**
- Animação de entrada de texto letra por letra
- Integração com GSAP e ScrollTrigger
- Configurações personalizáveis

#### 4. **DarkVeil**
- Background animado com WebGL
- Shaders customizados para efeito de ondas
- Paleta de cores roxa personalizada

## 📱 Páginas e Navegação

### Estrutura de Páginas
1. **Home** - Apresentação principal e ferramentas
2. **Sobre** - Missão, visão, valores e diferenciais
3. **Projetos** - Detalhes das ferramentas disponíveis
4. **Blog** - Estratégias e dicas educacionais
5. **Contato** - Formulário de comunicação

### Sistema de Navegação
- **Header**: Logo da Cogni IA
- **Footer**: Navegação principal com ícones
- **Responsivo**: Adaptação para mobile e desktop

## 🎭 Animações e Interatividade

### Animações Implementadas
- **SplitText**: Entrada de texto letra por letra
- **DarkVeil**: Background fluido e orgânico
- **Hover Effects**: Botões e links interativos
- **Transições**: Suaves entre estados

### Parâmetros de Animação
```javascript
SplitText: {
  delay: 100ms,
  duration: 1s,
  ease: "power3.out",
  splitType: "chars"
}

DarkVeil: {
  speed: 2,
  warpAmount: 1.5,
  colors: "5-tone purple gradient"
}
```

## 📐 Layout e Responsividade

### Sistema de Grid
- **Desktop**: Grid de 4 colunas
- **Tablet**: Grid de 2 colunas
- **Mobile**: Coluna única

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Componentes Responsivos
- Widgets adaptativos
- Tipografia escalável
- Navegação otimizada para touch

## 🎨 Filosofia de Design

### Princípios
1. **Modernidade**: Visual contemporâneo e sofisticado
2. **Profissionalismo**: Credibilidade e confiança
3. **Acessibilidade**: Usabilidade para todos
4. **Performance**: Carregamento rápido e fluido

### Tom de Comunicação
- **Imperativo**: Comandos diretos e persuasivos
- **Orientado a Resultados**: Foco em benefícios tangíveis
- **Motivacional**: Linguagem que inspira ação
- **Técnico-Acessível**: Complexidade simplificada

## 🔧 Configuração e Desenvolvimento

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```

### Build para Produção
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## 📈 Melhorias Futuras

### Planejadas (ver melhorias home.md)
- Otimização de contraste e tipografia
- Micro-animações adicionais
- Efeitos parallax sutis
- Melhorias de performance
- Estados de loading elegantes

### Funcionalidades
- Integração com APIs das ferramentas
- Sistema de autenticação
- Dashboard personalizado
- Analytics de uso

## 🎯 Objetivos de Negócio

### Metas
1. Tornar-se a plataforma #1 em ferramentas educacionais de IA
2. Transformar como estudantes aprendem e se preparam
3. Democratizar acesso a tecnologia educacional avançada
4. Criar impacto mensurável no desempenho acadêmico

### Valores
- **Resultados Reais**: Foco em impacto mensurável
- **Tecnologia Acessível**: Democratização da IA educacional
- **Inovação Constante**: Evolução contínua das ferramentas
- **Sucesso Estudantil**: Prioridade absoluta no estudante

---

## 📞 Contato e Suporte

Para dúvidas, sugestões ou suporte técnico, utilize o formulário de contato disponível na plataforma.

**Cogni IA** - Transformando o futuro da educação, um estudante por vez.