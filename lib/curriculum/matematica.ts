// lib/curriculum/matematica.ts
//
// Currículo de Matemática que o Atenis reconhece como referência canônica
// quando o aluno conversa sobre matemática. Organizado em categorias
// temáticas (em vez de lista flat) pra a IA processar melhor — quando o
// aluno menciona um tópico, ela sabe o contexto (qual parte do currículo)
// e os pré-requisitos / tópicos relacionados.
//
// Fonte: lista enviada pelo Davi em 2026-05-14, derivada do material
// didático e da BNCC do ensino médio brasileiro. Consolida tópicos do
// 10º ao 12º ano e do material de revisão da Concept SP.

export const MATEMATICA_CURRICULUM = `## CURRÍCULO DE MATEMÁTICA — Atenis

Você conhece este currículo de Matemática do Ensino Médio brasileiro. Use
como referência quando o aluno pedir conteúdo de matemática: reconheça os
termos, contextualize na categoria certa, e quando fizer sentido cite
tópicos relacionados ou pré-requisitos da mesma categoria.

### 1. Números e operações
- Conjuntos numéricos (naturais, inteiros, racionais, irracionais, reais)
- Números irracionais e números reais; aplicações dos reais
- Operações com radicais (adição, subtração, multiplicação, divisão,
  potenciação, radiciação)
- Conjuntos: definição, operações, intersecção, união, complementar
- Múltiplos e divisores; grandezas proporcionais

### 2. Álgebra: expressões, equações e inequações
- Produtos notáveis e expressões algébricas
- Fatoração, frações algébricas, racionalização
- Equações polinomiais do 2º grau (Bhaskara, soma e produto das raízes,
  discriminante)
- Raízes e equações redutíveis a polinômios do 2º grau
- Inequações (1º grau, 2º grau, produto, quociente)
- Módulo e equações modulares

### 3. Funções
- Produto cartesiano e relações; introdução às funções (domínio, imagem,
  contradomínio)
- Função afim (estudo completo, gráfico, raiz, sinal)
- Função quadrática: características, parábolas, vértice, imagem,
  inequações quadráticas
- Potências e função exponencial
- Equações e inequações exponenciais
- Logaritmos (definição, propriedades, mudança de base)
- Equações e inequações logarítmicas
- Funções logarítmicas (gráfico, domínio, imagem)
- Relações entre grandezas (proporcionalidade direta e inversa)

### 4. Sequências
- Progressões aritméticas: sequências numéricas, termo geral, aplicações,
  propriedades, soma dos n termos
- Progressões geométricas: definição, termo geral, interpolação geométrica,
  propriedades, soma e produto dos n termos, progressão geométrica
  convergente (soma da PG infinita)

### 5. Análise combinatória e probabilidade
- Introdução à análise combinatória (princípio fundamental da contagem)
- Permutações (simples, com repetição, circulares)
- Arranjos e combinações simples
- Combinações compostas por elementos de naturezas diferentes
- Combinações completas
- Probabilidade: contextualização, definição, propriedades básicas
- União de eventos; eventos mutuamente exclusivos
- Probabilidade condicional; eventos independentes
- Intersecção de eventos e multiplicação de probabilidades
- Lei de probabilidade binomial

### 6. Estatística
- Conceitos básicos (população, amostra, variável); gráficos e pesquisas
  amostrais
- Medidas de centralidade (tendência central): média, mediana, moda
- Medidas de dispersão: variância, desvio padrão, amplitude

### 7. Matemática financeira
- Porcentagem, aumentos e descontos
- Juros simples e compostos

### 8. Matrizes, determinantes e sistemas lineares
- Matrizes: definição, tipos (linha, coluna, quadrada, identidade,
  transposta), igualdade entre matrizes
- Matrizes: operações (soma, subtração, multiplicação por escalar e por
  matriz), equação matricial, matriz inversa
- Determinantes (regra de Sarrus, Laplace, propriedades)
- Sistemas de equações: definição e métodos de resolução
- Sistemas: classificação (SPD, SPI, SI), Gauss, Cramer, Rouché-Capelli

### 9. Geometria plana
- Paralelismo de retas; ângulos (formados por retas paralelas cortadas
  por transversal)
- Polígonos: definição, classificação, soma dos ângulos internos e
  externos
- Polígonos regulares: propriedades, quantidade de diagonais
- Triângulos (classificação, propriedades, congruência)
- Semelhança de triângulos
- Relações métricas no triângulo retângulo (Pitágoras, projeções)
- Trigonometria no triângulo retângulo (seno, cosseno, tangente)
- Trigonometria em triângulos quaisquer (lei dos senos, lei dos cossenos)
- Quadriláteros notáveis (paralelogramo, retângulo, losango, quadrado,
  trapézio)
- Circunferências: elementos, posições relativas, comprimento
- Ângulos na circunferência (central, inscrito, segmento)
- Relações métricas na circunferência
- Polígonos regulares inscritos
- Áreas de quadriláteros e triângulos
- Áreas de polígonos regulares e regiões circulares (setor, segmento)

### 10. Trigonometria (estudo aprofundado)
- Circunferência trigonométrica; arcos e ângulos
- Relações trigonométricas fundamentais
- Redução de arcos ao 1º quadrante
- Operações trigonométricas com arcos (soma, diferença, arco duplo,
  arco metade)
- Funções trigonométricas: seno, cosseno, tangente
- Funções trigonométricas compostas

### 11. Geometria espacial
- Introdução à geometria espacial; poliedros, poliedros regulares
  (Platão), relação de Euler
- Prismas: elementos, características, área e volume
- Paralelepípedos retangulares e cubos
- Pirâmides: elementos, características, cálculos
- Tetraedro e octaedro (regulares)
- Tronco de pirâmide; semelhança em pirâmides
- Cilindros: elementos, características, cálculos
- Cilindros equiláteros
- Cones
- Tronco de cone; semelhança em cones
- Esferas (área e volume; fuso e cunha)
- Sólidos de revolução
- Superfícies espaciais e suas projeções

### 12. Geometria analítica
- Introdução; geometria no plano cartesiano
- Cálculo de medidas no plano cartesiano (distância entre pontos,
  ponto médio)
- Equações da reta (geral, reduzida, paramétrica, segmentária)
- Ângulos entre retas; paralelismo e perpendicularismo
- Equações da circunferência (reduzida, geral)
- Regiões e áreas dos polígonos no plano cartesiano
`
