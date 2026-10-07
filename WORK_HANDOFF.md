# Libryari — contexto para ChatGPT Work

## Objetivo atual

Corrigir o leitor de EPUB/PDF mobile da Libryari. A tela deve ocupar todo o visor, sem rolagem vertical. A navegação deve ocorrer pelos botões no rodapé: voltar à esquerda, página anterior no canto inferior esquerdo e próxima página no canto inferior direito.

## Bug em aberto

No modo responsivo **iPhone 16 (393 × 852)**, algumas páginas do EPUB aparecem somente como uma área creme vazia, embora o leitor informe que está em uma página do livro. A captura mais recente mostra a tela vazia com o rodapé visível e o indicador “Página 3”.

Em uma verificação local, o iframe do EPUB continha a imagem ou o texto na árvore de acessibilidade, mas a imagem demorava alguns segundos para aparecer visualmente. Foi adicionado o estado “Organizando página…” para esse carregamento. Ainda é necessário confirmar e corrigir qualquer página que continue vazia depois do carregamento.

## Arquivos importantes

- `index.html`: estrutura da biblioteca e da tela do leitor.
- `css/style.css`: layout mobile, leitor em tela cheia e menu inferior.
- `js/app.js`: importação de livros e renderização de EPUB/PDF.
- `assets/verity.epub`: EPUB fixo usado para reproduzir o problema.
- `../ref/download.jpg`: referência visual desejada para a página de leitura.

## Implementação atual do leitor

- EPUB: `epub.js@0.3.93`, com `jszip@3.10.1` carregados por CDN.
- PDF: `pdf.js@3.11.174`, uma página por vez em canvas.
- EPUB usa `flow: 'paginated'` e `spread: 'none'`.
- O conteúdo do EPUB recebe um estilo injetado para neutralizar CSS antigo do Calibre, remover margens exageradas e manter imagens proporcionais.
- O arquivo Verity tem estilos internos problemáticos: imagens com tamanho fixo, margens de até `67em` e elementos `.mbp_pagebreak`.

## O que preservar

- Identidade minimalista: fundo de papel claro, texto escuro e menu inferior discreto.
- Leitura sem rolagem vertical.
- Botões de página no rodapé, otimizados para toque.
- Imagens sem distorção.
- Livro `Verity`, de Colleen Hoover, fixo na estante e abrindo em `assets/verity.epub`.
- PDFs devem continuar abrindo em uma página por vez, com os mesmos controles.

## Reprodução

1. Inicie um servidor estático na pasta `libryari-dev`.
2. Abra o projeto no navegador.
3. Ative o modo responsivo iPhone 16, 393 × 852.
4. Na estante, abra **Verity**.
5. Avance várias páginas e observe se alguma permanece creme e vazia depois de concluir “Organizando página…”.

## Próximo passo recomendado

Inspecione o iframe criado pelo EPUB.js enquanto a tela está vazia e compare o tamanho do iframe, do `body` interno, das colunas CSS e da imagem/texto renderizados. Corrija a paginação sem reintroduzir rolagem vertical ou espaços em branco entre páginas.
