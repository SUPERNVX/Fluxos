# 📋 DOCUMENTAÇÃO TÉCNICA - FLUXOS v1.0

## 🎯 VISÃO GERAL
**Fluxos** é um laboratório de música web desenvolvido em React + TypeScript que oferece processamento de áudio em tempo real usando Web Audio API. Permite aplicar efeitos de áudio, visualizar waveforms e baixar o resultado processado.

---

## 📁 ESTRUTURA DE ARQUIVOS

### **🔧 Configuração e Build**
```
├── package.json              # Dependências e scripts npm
├── vite.config.ts            # Configuração Vite com PWA e code splitting
├── tsconfig.json             # Configuração TypeScript principal
├── tsconfig.app.json         # Config TypeScript para app
├── tsconfig.node.json        # Config TypeScript para Node.js
├── tailwind.config.js        # Configuração Tailwind CSS
├── postcss.config.js         # Configuração PostCSS
└── eslint.config.js          # Configuração ESLint
```

### **🌐 PWA e Assets**
```
├── index.html                # HTML principal da aplicação
├── public/
│   ├── logo.png             # Logo da aplicação (512x512)
│   └── manifest.json        # Manifesto PWA (REMOVIDO - agora no vite.config.ts)
```

### **⚙️ Arquivos Core da Aplicação**
```
├── src/
│   ├── main.tsx             # Entry point da aplicação React
│   ├── App.tsx              # Componente raiz - roteamento entre Landing/Editor
│   ├── App.css              # Estilos globais da aplicação
│   ├── index.css            # Estilos base e imports Tailwind
│   └── vite-env.d.ts        # Declarações TypeScript para Vite
```

---

## 🎛️ SISTEMA DE ESTADO E TIPOS

### **📊 Gerenciamento de Estado**
```
├── src/types/
│   ├── index.ts             # Re-exports de todos os tipos
│   └── audio.ts             # Tipos principais: AudioState, AudioAction, AudioNodes
│
├── src/reducers/
│   ├── index.ts             # Re-exports dos reducers
│   └── audioReducer.ts      # Reducer principal - gerencia todo estado de áudio
│
└── src/constants/
    ├── index.ts             # Re-exports das constantes
    └── audioConfig.ts       # Configurações de áudio e valores padrão
```

**Principais Tipos:**
- `AudioState`: Estado completo da aplicação (volume, efeitos, configurações)
- `AudioAction`: Ações para modificar o estado via reducer
- `AudioNodes`: Referências aos nós Web Audio API
- `Track`: Metadados do arquivo de áudio carregado

---

## 🎵 SISTEMA DE ÁUDIO

### **🔊 Core de Processamento**
```
├── src/hooks/
│   ├── index.ts             # Re-exports dos hooks
│   ├── useAudioPlayer.ts    # 🔥 CORE - Hook principal de áudio
│   ├── useFileHandler.ts    # Validação e upload de arquivos
│   ├── usePresets.ts        # Sistema de presets de efeitos
│   └── useSliderTouchLock.ts # Prevenção de scroll em sliders mobile
│
├── src/utils/
│   ├── index.ts             # Re-exports dos utils
│   └── audioHelpers.ts      # Funções auxiliares de áudio
│
└── src/workers/
    ├── audioRenderWorker.ts # Worker para rendering offline
    └── waveformWorker.ts    # Worker para geração de waveform
```

**useAudioPlayer.ts - Funcionalidades Principais:**
- `setupAudioGraph()`: Constrói cadeia de efeitos Web Audio
- `generateWaveform()`: Cria visualização do áudio
- `download()`: Renderiza áudio com efeitos aplicados
- Sistema de updates em tempo real para todos os efeitos

### **🎚️ Efeitos de Áudio**
```
├── src/utils/effects/
│   ├── index.ts             # Re-exports de todos os efeitos
│   ├── bitcrusher.ts        # Efeito lo-fi de redução de bits
│   ├── delay.ts             # Delay/eco com feedback
│   ├── distortion.ts        # Distorção padrão
│   ├── flanger.ts           # Efeito flanger com LFO
│   ├── fuzz.ts              # Fuzz musical (3 estágios)
│   ├── lfo.ts               # Low Frequency Oscillator
│   ├── muffle.ts            # Filtro abafado
│   ├── overdrive.ts         # Overdrive suave
│   ├── phaser.ts            # Efeito phaser multi-stage
│   ├── tremolo.ts           # Tremolo com formas de onda
│   └── waveshaper.ts        # Waveshaper genérico
```

**Cada Efeito Retorna:**
- `input`: Nó de entrada para conexão
- `output`: Nó de saída para conexão
- `update*()`: Métodos para alterar parâmetros em tempo real

---

## 🖥️ COMPONENTES DE INTERFACE

### **📱 Componentes de Página**
```
├── src/components/
│   ├── index.ts             # Re-exports de todos os componentes
│   ├── LandingPage.tsx      # Página inicial com upload
│   └── EditorPage.tsx       # Página principal do editor
```

### **🎛️ Controles de Efeitos**
```
├── src/components/
│   ├── AudioEffects.tsx     # Container principal dos efeitos
│   ├── DistortionControls.tsx    # Overdrive, Distortion, Fuzz, Bitcrusher
│   ├── ModulationControls.tsx    # Flanger, Phaser, Tremolo
│   ├── SpatialAudioControls.tsx  # Binaural, Muffle
│   ├── CompressorControls.tsx    # Compressor dinâmico
│   ├── EightDControls.tsx        # Efeito 8D/espacial
│   └── MuffledControls.tsx       # Controles de abafamento
```

### **🎮 Componentes de UI Base**
```
├── src/components/
│   ├── Slider.tsx           # Slider customizado com touch support
│   ├── ToggleSwitch.tsx     # Switch on/off para efeitos
│   ├── NumericInput.tsx     # Input numérico validado
│   ├── CollapsibleSection.tsx    # Seções expansíveis
│   ├── Tooltip.tsx          # Tooltips informativos
│   ├── PlayerControls.tsx   # Play/pause/stop/download
│   ├── Waveform.tsx         # Visualização de waveform
│   └── Dropzone.tsx         # Área de drop para arquivos
```

### **🌐 Internacionalização e Configurações**
```
├── src/components/
│   ├── LanguageSelector.tsx # Seletor de idioma
│   └── SettingsModal.tsx    # Modal de configurações
│
├── src/hooks/
│   └── useLanguage.ts       # Hook para i18n
│
└── src/i18n/
    ├── index.ts             # Configuração i18next
    └── locales/             # Traduções por idioma
        ├── en/translation.json    # Inglês
        ├── pt-BR/translation.json # Português Brasil
        ├── es/translation.json    # Espanhol
        ├── fr/translation.json    # Francês
        ├── de/translation.json    # Alemão
        └── ru/translation.json    # Russo
```

---

## 🚀 SISTEMA DE PERFORMANCE

### **⚡ Otimizações Implementadas**
```
├── src/components/
│   ├── LazyComponents.tsx   # Sistema de lazy loading para efeitos
│   └── ErrorPopup.tsx       # Pop-ups de erro para usuário
│
├── src/utils/
│   ├── errorHandler.ts      # Sistema centralizado de erros
│   └── memoryManager.ts     # Gerenciamento avançado de memória
```

**Lazy Loading:**
- Componentes de efeitos carregados sob demanda
- SmartLoader com pré-carregamento inteligente
- Redução de 40-60% no bundle inicial

**Memory Management:**
- Thresholds adaptativos por tamanho de arquivo
- Auto-cleanup de recursos antigos
- Pop-ups apenas para arquivos >70MB

**Code Splitting (vite.config.ts):**
- Chunks separados: vendor, distortion, modulation, spatial, workers
- Bundle principal: ~288kB (88kB gzipped)

---

## 📦 FUNCIONALIDADES PRINCIPAIS

### **🎵 Processamento de Áudio**
1. **Upload**: Suporte MP3, WAV, OGG, M4A (até 100MB)
2. **Efeitos em Tempo Real**: 15+ efeitos aplicados instantaneamente
3. **Download**: Rendering offline com todos os efeitos aplicados
4. **Waveform**: Visualização gerada via Web Worker
5. **Presets**: Sistema de salvamento/carregamento de configurações

### **🎚️ Categorias de Efeitos**
1. **Básicos**: Volume, Speed, Bass Boost
2. **Reverb**: 4 tipos (Default, Hall, Room, Plate)
3. **Modulation**: Flanger, Phaser, Tremolo
4. **Distortion**: Overdrive, Distortion, Fuzz, Bitcrusher
5. **Spatial**: 8D Audio, Binaural, Muffle
6. **Dynamics**: Compressor

### **🌐 PWA Features**
1. **Offline**: Funciona sem internet após primeiro carregamento
2. **Install**: Pode ser instalado como app nativo
3. **Performance**: Cache inteligente de assets
4. **Responsive**: Otimizado para desktop e mobile

---

## 🔧 ARQUITETURA TÉCNICA

### **🎯 Padrões Utilizados**
- **React Hooks**: Estado e lógica em hooks customizados
- **Reducer Pattern**: Gerenciamento de estado complexo
- **Web Audio API**: Processamento de áudio nativo do browser
- **Web Workers**: Processamento pesado em background
- **TypeScript**: Type safety completo
- **Tailwind CSS**: Styling utility-first

### **📊 Fluxo de Dados**
```
Arquivo Upload → useFileHandler → AudioContext → setupAudioGraph → Web Audio Nodes → Output
                      ↓                              ↑
                 ErrorHandler ←→ MemoryManager ←→ Real-time Updates
```

### **⚙️ Build e Deploy**
- **Vite**: Build tool moderno e rápido
- **GitHub Pages**: Deploy automatizado via GitHub Actions
- **PWA**: Service Worker gerado automaticamente
- **Otimizações**: Tree shaking, minification, code splitting

---

## 🎯 PONTOS DE EXTENSÃO

### **📍 Para Adicionar Novos Efeitos:**
1. Criar arquivo em `src/utils/effects/`
2. Adicionar tipos em `src/types/audio.ts`
3. Adicionar ao reducer em `src/reducers/audioReducer.ts`
4. Criar componente de controle em `src/components/`
5. Integrar no `setupAudioGraph()` do `useAudioPlayer.ts`

### **📍 Para Adicionar Nova Funcionalidade:**
1. Estado: Adicionar em `audioReducer.ts` e tipos
2. UI: Criar componente em `src/components/`
3. Lógica: Implementar em hook customizado
4. Integração: Conectar no `useAudioPlayer.ts`

### **📍 Para Novos Idiomas:**
1. Adicionar pasta em `src/i18n/locales/`
2. Criar `translation.json` com todas as chaves
3. Atualizar `LanguageSelector.tsx`

---

**🎵 Esta arquitetura permite extensibilidade máxima mantendo performance e type safety. Qualquer AI coder pode facilmente entender e extender o sistema seguindo os padrões estabelecidos.**