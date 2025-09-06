# 🚀 Guia de Deploy - Fluxos

## Preparação para Deploy no GitHub Pages

### 1. Verificar se tudo está funcionando
```bash
# Instalar dependências
npm install

# Testar em desenvolvimento
npm run dev

# Fazer build de produção
npm run build
```

### 2. Configurar o repositório GitHub

1. **Criar repositório no GitHub** (se ainda não existir)
2. **Adicionar o repositório como origin**:
   ```bash
   git remote add origin https://github.com/SUPERNVX/Fluxos.git
   ```

### 3. Fazer deploy

#### Opção A: Deploy Automático (Recomendado)
O projeto já está configurado com GitHub Actions. Basta fazer push para a branch main:

```bash
# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "feat: Release v2.0.0 with new audio effects"

# Fazer push para main
git push origin main
```

O GitHub Actions automaticamente fará o build e deploy para GitHub Pages.

#### Opção B: Deploy Manual
```bash
# Fazer build e deploy manual
npm run deploy
```

### 4. Configurar GitHub Pages

1. Ir para **Settings** do repositório
2. Navegar até **Pages**
3. Em **Source**, selecionar **Deploy from a branch**
4. Selecionar branch **gh-pages**
5. Pasta: **/ (root)**
6. Salvar

### 5. Acessar o site

Após alguns minutos, o site estará disponível em:
```
https://SUPERNVX.github.io/Fluxos/
```

## 🔧 Estrutura de Deploy

### Arquivos de Configuração
- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `vite.config.ts` - Configuração do Vite com base path
- `package.json` - Scripts de build e deploy

### Processo Automático
1. **Push para main** → Trigger do GitHub Actions
2. **Install dependencies** → `npm ci`
3. **Build** → `npm run build`
4. **Deploy** → Publica pasta `dist` para branch `gh-pages`

## 🐛 Troubleshooting

### Erro 404 no GitHub Pages
- Verificar se a base path está correta no `vite.config.ts`
- Confirmar que o repositório se chama "Fluxos"

### Build falhando
- Verificar se não há erros de TypeScript: `npm run build`
- Verificar se todas as dependências estão instaladas: `npm install`

### Deploy manual não funciona
- Instalar gh-pages globalmente: `npm install -g gh-pages`
- Verificar se o repositório tem permissões corretas

## 📝 Checklist de Deploy

- [ ] ✅ Código testado localmente
- [ ] ✅ Build de produção funcionando
- [ ] ✅ Repositório GitHub configurado
- [ ] ✅ GitHub Actions configurado
- [ ] ✅ Push para branch main
- [ ] ✅ GitHub Pages configurado
- [ ] ✅ Site acessível online

## 🎉 Pronto!

Seu projeto Fluxos está agora pronto para deploy no GitHub Pages com todas as novas funcionalidades implementadas!