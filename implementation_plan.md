# Plano de Consolidação e Otimização

## Objetivo
Consolidar a lógica de áudio dispersa e duplicada entre `useAudioPlayer` e `useVideoPlayer` em uma classe centralizada `AudioEngine`. Otimizar a performance reduzindo re-renders e unificando o processamento de áudio offline e em tempo real.

## Mudanças Propostas

### 1. Criação do `AudioEngine` (Core)
Criar uma classe `AudioEngine` em `src/core/AudioEngine.ts` que será responsável por:
- Gerenciar o `AudioContext`.
- Criar e conectar nós de áudio (Grafo de Áudio).
- Gerenciar efeitos (Reverb, Delay, Distorção, etc.).
- Controlar parâmetros em tempo real (Volume, Velocidade, etc.).
- Fornecer métodos para renderização offline (Download).

Isso eliminará a duplicação de código onde a construção do grafo de áudio é repetida em `useAudioPlayer`, `useVideoPlayer` e na função `download`.

### 2. Refatoração dos Hooks
- **`useAudioPlayer.ts`**:
    - Remover lógica direta de manipulação do `AudioContext` e nós.
    - Instanciar e usar `AudioEngine`.
    - Focar apenas no gerenciamento de estado da UI (Play/Pause, progress) e delegar o processamento de áudio.
- **`useVideoPlayer.ts`**:
    - Similar ao `useAudioPlayer`, delegar o processamento de áudio para `AudioEngine`.
    - Manter a sincronização com o elemento de vídeo.

### 3. Unificação da Renderização Offline
- A lógica de `download` atualmente recria todo o grafo de áudio manualmente.
- O `AudioEngine` terá um método `renderOffline` que reutilizará a mesma lógica de construção do grafo usada para reprodução em tempo real, garantindo consistência exata entre o que se ouve e o que se baixa.

### 4. Otimização de Performance
- **Memoização**: Revisar `EditorPage` e componentes filhos para garantir que props não sejam recriadas desnecessariamente.
- **Gerenciamento de Estado**: Reduzir o número de `useEffect` que disparam atualizações de estado. O `AudioEngine` pode usar um padrão de observador ou callbacks diretos para evitar re-renders excessivos no React.

## Plano de Verificação

### Testes Manuais
1. **Reprodução de Áudio**:
    - Carregar um arquivo de áudio.
    - Testar Play/Pause, Seek, Volume.
    - Ativar cada efeito (Reverb, 8D, Modulação, Distorção) e verificar se o som muda conforme esperado.
2. **Reprodução de Vídeo**:
    - Carregar um arquivo de vídeo.
    - Verificar sincronia áudio/vídeo.
    - Testar efeitos no áudio do vídeo.
3. **Download (Renderização Offline)**:
    - Aplicar efeitos notáveis (ex: Reverb alto, Distorção).
    - Baixar o arquivo processado.
    - Ouvir o arquivo baixado e comparar com a reprodução em tempo real.
4. **Performance**:
    - Monitorar uso de memória (via `MemoryManager` logs) e FPS durante a reprodução e manipulação de controles.

### Arquivos Afetados
- `src/hooks/useAudioPlayer.ts`
- `src/hooks/useVideoPlayer.ts`
- `src/components/EditorPage.tsx`
- `src/core/AudioEngine.ts` (Novo)
