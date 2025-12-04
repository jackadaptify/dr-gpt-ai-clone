-- Atualiza todos os agentes que usam modelos OpenAI para usar o Gemini 2.0 Flash
-- Isso resolve o erro 429 (Quota Exceeded) movendo para um modelo gratuito/mais barato.

UPDATE agents
SET model_id = 'gemini-2.0-flash'
WHERE model_id LIKE '%gpt%' 
   OR model_id LIKE '%o3%' 
   OR model_id LIKE '%dall-e%'
   OR model_id LIKE '%gemini-3%';

-- Confirmação
SELECT id, name, model_id FROM agents WHERE model_id = 'gemini-2.0-flash';
