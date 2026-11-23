-- Eventos dos quizzes (painel de abandono por etapa). Rodar uma vez no SQL Editor do Supabase.
-- É a MESMA tabela do quiz Ninho Calmo: se ela já existe no projeto, não precisa rodar de novo (o campo "quiz" separa).
-- Ninguém faz cadastro: "sid" é um código anônimo gerado no aparelho da pessoa.
create table if not exists public.quiz_eventos (
  id           bigserial primary key,
  criado_em    timestamptz not null default now(),
  quiz         text not null,          -- ex.: ninho-calmo, visagismo-barbeiro
  variante     text,                   -- ex.: v2 (teste A/B com ?v=b)
  sid          text not null,          -- sessão anônima
  tipo         text not null,          -- view | comecou | resposta | resultado | checkout | voltou | saiu | faq | som
  etapa        text,                   -- id da tela: inicio, idade, horario, sinais, coco, alivio, ...
  ordem        int,                    -- posição da tela no quiz
  resposta     text,                   -- valor escolhido (multi: separado por vírgula)
  ms           int,                    -- tempo na tela até o evento
  dispositivo  text,
  url          text,
  pais         text,
  utm_source   text, utm_medium text, utm_campaign text, utm_content text, utm_term text
);
create index if not exists quiz_eventos_quiz_data on public.quiz_eventos (quiz, criado_em);
create index if not exists quiz_eventos_sid on public.quiz_eventos (sid);

-- Só o servidor (service_role) grava e lê. Sem policy = navegador não acessa.
alter table public.quiz_eventos enable row level security;

-- Funil: quantas sessões chegaram em cada tela (por quiz e variante).
create or replace view public.quiz_funil as
select quiz, variante, ordem, etapa,
       count(distinct sid) as sessoes,
       round(avg(ms) filter (where tipo = 'resposta') / 1000.0, 1) as seg_medio_resposta
from public.quiz_eventos
where tipo in ('view', 'resposta')
group by quiz, variante, ordem, etapa
order by quiz, variante, ordem;

-- Respostas: quantas sessões escolheram cada opção (e quantas delas chegaram ao checkout).
create or replace view public.quiz_respostas as
with chk as (select distinct sid from public.quiz_eventos where tipo = 'checkout')
select e.quiz, e.variante, e.etapa, e.resposta,
       count(distinct e.sid) as sessoes,
       count(distinct e.sid) filter (where e.sid in (select sid from chk)) as foram_ao_checkout
from public.quiz_eventos e
where e.tipo = 'resposta'
group by e.quiz, e.variante, e.etapa, e.resposta;

-- Por criativo: começou, viu resultado, foi ao checkout.
create or replace view public.quiz_por_criativo as
select quiz, variante, utm_content,
       count(distinct sid) filter (where tipo = 'comecou')   as comecaram,
       count(distinct sid) filter (where tipo = 'resultado') as viram_resultado,
       count(distinct sid) filter (where tipo = 'checkout')  as foram_ao_checkout
from public.quiz_eventos
group by quiz, variante, utm_content;
