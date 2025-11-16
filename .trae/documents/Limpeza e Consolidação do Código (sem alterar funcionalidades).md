## Diagnóstico Geral
- Estrutura atual está consistente, mas há arquivos não utilizados e trechos duplicados.
- Duplicidade de tipos: `Track` e partes do estado existem em múltiplos lugares (`src/types/audio.ts`, `src/types/index.ts`, `src/types.ts`). Apenas `src/types/audio.ts` é referenciado por `App.tsx` e outras partes.
- Efeitos: há código de criação de reverb e binaural repetido em duas seções de `useAudioPlayer` (tempo real e offline).
- Workers: `src/workers/audioRenderWorker.ts` não é referenciado; `src/workers/waveformWorker.ts` é o único usado.
- Efeitos não utilizados: `src/utils/effects/delay.ts` não é referenciado.
- Constantes: `AUDIO_EFFECT_LIMITS` em `src/constants/audioConfig.ts` não é usado.
- Barrel files sem uso: `src/reducers/index.ts` e `src/types/index.ts` não são importados.
- CSS: `src/App.css` não é importado (apenas `index.css` é usado).
- Aviso do bundler: import dinâmico de `en` também está estático em `src/i18n/index.ts`; funcionalmente correto, mas gera aviso de chunk.

## Propostas de Limpeza (sem alterar funcionalidade)
- Remover arquivos não utilizados:
  - `src/workers/audioRenderWorker.ts` (sem referências).
  - `src/utils/effects/delay.ts` (sem referências).
  - `src/types.ts` e `src/types/index.ts` (duplicam tipos já em `src/types/audio.ts`).
  - `src/reducers/index.ts` (sem uso).
  - `src/App.css` (não importado em lugar algum).
- Manter `AUDIO_EFFECT_LIMITS` por ora, ou remover se preferir evitar código morto; como não há uso, remoção não afeta funcionalidade.

## Consolidação de Código
- Extrair construtores de `ImpulseResponse` para util compartilhada:
  - Mover `createImpulseResponse` e `createBinauralImpulseResponse` de `src/hooks/useAudioPlayer.ts:58–99` e `src/hooks/useAudioPlayer.ts:100–150` para `src/utils/effects/reverb.ts`.
  - Reutilizar nos dois contextos (tempo real e offline) em `useAudioPlayer` (referências: `src/hooks/useAudioPlayer.ts:241–251`, `src/hooks/useAudioPlayer.ts:629–641`).
  - Ganho: menos duplicação, melhor manutenção; sem alteração de parâmetros ou comportamento.
- Abstrair padrões de “bypass wet/dry” (bass, 8D, muffle):
  - Criar helper em `src/utils/audioHelpers.ts` que retorna `{ wetGain, dryGain, merger, applyEnabled(boolean) }` e conecta nós internamente.
  - Substituir blocos equivalentes em `useAudioPlayer` (bass: `src/hooks/useAudioPlayer.ts:370–395`; 8D: `src/hooks/useAudioPlayer.ts:377–383, 474–483`; muffle: `src/hooks/useAudioPlayer.ts:456–472`).
  - Garantir mesma topologia/valores para evitar qualquer mudança de áudio.
- Unificar tipagens de presets:
  - Garantir que `usePresets` e `SettingsModal` usem `PresetSettings` de `src/types/audio.ts` em toda a superfície (já aplicado em parte); revisar `src/components/EditorPage.tsx:43–49, 145–151` para conformidade.

## Organização e Importação
- Padronizar imports via barrels já existentes (`components/index.ts`, `utils/index.ts`, `constants/index.ts`), apenas onde isso não muda o bundle nem funcionalidade.
- i18n: Opcionalmente remover o import estático de `en` e inicializar sem recursos, delegando tudo ao load dinâmico de `useLanguage`. Alternativa conservadora: manter `en` estático e apenas silenciar/aceitar o aviso do bundler.

## Logs e Tratamento de Erros
- Substituir `console.*` em componentes/hooks por `ErrorHandler` onde fizer sentido (ex.: `src/hooks/useAudioPlayer.ts:170, 195, 807, 1132`), mantendo logs de `warn` apenas para diagnóstico leve.
- Condicionar logs informativos (`console.log`) do `MemoryManager` a `NODE_ENV === 'development'` para reduzir ruído em produção.

## Critérios de Aceitação
- `npm run lint`: nenhum erro novo; avisos de hooks podem permanecer.
- `npm run build`: sucesso sem erros de TypeScript.
- Nenhuma mudança perceptível de UI/áudio; topologia do grafo de áudio e parâmetros permanecem idênticos.

## Passos
1. Remover arquivos não utilizados listados.
2. Criar `src/utils/effects/reverb.ts` e mover funções; atualizar imports em `useAudioPlayer`.
3. Criar helper de bypass wet/dry e aplicar nos três blocos, validando equivalência.
4. Revisar tipagens de presets e usos em `SettingsModal`/`EditorPage`.
5. Opcional: ajustar i18n para evitar aviso de chunk.
6. Trocar logs por `ErrorHandler` onde aplicável e condicionar logs de `MemoryManager` ao ambiente.
7. Rodar lint e build para validar.

Confirma que seguimos com essa limpeza e consolidação conservadora?