## Objetivo
Adicionar fluxo de vídeo ao Fluxos: upload de vídeo, extração do áudio para processamento com os efeitos atuais, preview com vídeo 16:9 sincronizado e exportação em formatos comuns. Carregar funcionalidades de vídeo apenas quando o usuário enviar um vídeo.

## Requisitos Funcionais
- Upload de vídeo (mp4, iPhone, e mais um formato comum) e áudio (como já existe).
- Extração do áudio do vídeo para o pipeline atual de efeitos.
- Área de capa expande para um player 16:9, exibindo o vídeo quando o arquivo for de vídeo.
- Preview sincronizado: ao alterar a velocidade do áudio, o vídeo acompanha (playbackRate e/ou remapeamento de tempo).
- Download: opções para “Vídeo” (mp4, iPhone/mov, webm) e “Áudio” (lossless, mp3 320kbps).
- Não carregar módulos de vídeo se o upload for de áudio (lazy loading + code splitting).

## Suporte de Formatos
- Entrada: `video/mp4` (H.264/AAC), `video/quicktime` (iPhone .mov com H.264/AAC ou HEVC/AAC), `video/webm`.
- Saída Vídeo:
  - MP4 (H.264 + AAC, compatível ampla).
  - MOV (H.264 + AAC; “formato do iPhone”).
  - WebM (VP9 + Opus) como terceiro formato.
- Saída Áudio:
  - Lossless: WAV (mesma taxa de amostragem do upload; sem perdas).
  - Comprimido: MP3 320 kbps.

## Arquitetura Técnica
- Detecção de tipo: `File.type` e leitura via `URL.createObjectURL`.
- Extração de áudio do vídeo (2 camadas):
  1. Preview: `HTMLVideoElement` + `captureStream()` → `MediaStream` → `AudioContext.createMediaStreamSource` → pipeline de efeitos (sem recodificação).
  2. Export: `ffmpeg.wasm` (lazy) para demux do áudio do arquivo e remux do vídeo com o áudio processado (preservando qualidade do vídeo).
- Sincronização de velocidade:
  - Preview: ajustar `video.playbackRate` exatamente ao valor do slider de velocidade.
  - Export: recalcular timestamps do áudio renderizado; remux com `-c:v copy` (sem re-encode) e `-r` cap a `min(original_fps, 60)` se necessário.
- Lazy loading de vídeo:
  - Criar `VideoModule` (componentes + hooks + worker ffmpeg) e carregá-lo via `import()` somente quando `file.type.startsWith('video/')`.
  - Manual chunks em `vite.config.ts` para isolar `ffmpeg.wasm`/video.

## UI/UX
- Área de capa: condicional
  - Áudio: mantém imagem de capa (como hoje).
  - Vídeo: container 16:9 responsivo, controles básicos (play/pause, tempo), opção “mute” do track original para evitar dupla reprodução (usar áudio processado como fonte principal).
- Controles de efeitos: permanecem idênticos.
- Velocidade: controla áudio e `video.playbackRate` em conjunto.
- Download modal:
  - Se áudio: opções “WAV (Lossless)” e “MP3 320kbps).”
  - Se vídeo: opções “MP4 (H.264/AAC)”, “MOV (iPhone)”, “WebM (VP9/Opus)”.
- i18n: adicionar chaves para os novos rótulos/formatos.

## Pipeline de Exportação
- Áudio-only:
  - Render offline via `OfflineAudioContext` → WAV (lossless, manter sample rate) e MP3 320k (via `ffmpeg.wasm` se necessário).
- Vídeo:
  - Demux vídeo: extrair trilha de vídeo sem re-encode (`-c:v copy`).
  - Substituir trilha de áudio pela renderização WAV → transcodificar para AAC (mp4/mov) ou Opus (webm). 
  - Garantir sincronização (timestamps alinhados; fps máximo 60, preservar resolução e bitrate do vídeo original).

## Performance e Memória
- Carregar `ffmpeg.wasm` apenas on-demand (vídeo).
- Usar Web Worker para ffmpeg.
- Integrar com `MemoryManager`: revogar ObjectURLs, limpar buffers, contabilizar blobs.

## Tratamento de Erros
- i18n de erros novos (ex.: “VIDEO_DEMUX_FAILED”, “VIDEO_REMUX_FAILED”, “UNSUPPORTED_CODEC”).
- Fallbacks:
  - Se `-c:v copy` falhar, re-encode para alvo seguro (H.264) com cap de 60fps.
  - Se `captureStream` indisponível, usar demux parcial para preview de áudio.

## Testes e Validação
- Upload de vídeo (mp4/mov/webm) com diferentes resoluções/fps.
- Verificar sincronização em playback e em export.
- Confirmar preservação de qualidade de vídeo (sem mudança de resolução/bitrate, fps ≤ 60).
- Lint/build sem erros; lazy chunks só carregam para vídeo.

## Roadmap de Implementação
1. Detecção de arquivo e lazy loading de `VideoModule`.
2. Player 16:9 na área da capa (condicional ao tipo de arquivo).
3. Preview integrado: `captureStream` → pipeline; sincronização via `playbackRate`.
4. Export áudio: WAV/MP3.
5. Export vídeo: mp4/mov/webm com remux do áudio processado.
6. Integração com MemoryManager e i18n.
7. Testes, medidas e documentação.

## Clarificações Solicitadas
1. “Formato do iPhone”: preferimos **MOV (H.264 + AAC)** por ampla compatibilidade. Confirma?
2. Lossless preferido: **WAV** (já suportado) ou deseja **FLAC** também?
3. Tamanho máximo para upload de vídeo: manter 100MB (atual) ou aumentar (vídeo costuma ser maior)?
4. Para export WebM, tudo bem re-encode de vídeo (VP9) caso `copy` não seja possível?

Confirma o plano e as escolhas acima? Após confirmar, inicio a implementação com lazy loading e preservação total de compatibilidade com o pipeline atual.