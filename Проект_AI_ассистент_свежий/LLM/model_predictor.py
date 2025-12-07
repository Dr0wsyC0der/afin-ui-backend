from LLM.model_loader import model_llm, tokenizer
import logging
import torch

# generate_explanation (ИЗНАЧАЛЬНЫЙ)
# def generate_explanation(input_dict: dict):
#     """
#     Генерирует объяснение задержки на основе входных данных.
#     """
#     prompt = f"""
#     ### Инструкция:
#     Интерпретируй результат прогноза задержки.
#
#     ### Входные данные:
#     {input_dict}
#
#     ### Ответ:
#     """
#     inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
#     with torch.no_grad():
#         output = model.generate(
#             **inputs,
#             max_new_tokens=200,
#             temperature=0.2,
#             top_p=0.9
#         )
#     text = tokenizer.decode(output[0], skip_special_tokens=True)
#
#     # Обрезаем prompt и оставляем только ответ
#     if "### Ответ:" in text:
#         text = text.split("### Ответ:")[-1].strip()
#
#     return text

# ТЕСТОВЫЙ generate_explanation
def generate_explanation(input_dict: dict):
    """
    Генерирует объяснение задержки на основе входных данных.
    """
    try:
        user_question = input_dict.get('user_question')
        
        if user_question:
            # Если есть вопрос пользователя, отвечаем на него с учётом контекста
            instruction = f"""Ты - бизнес-ассистент, который анализирует вероятность задержки бизнес-процессов.
Пользователь задал вопрос: "{user_question}"
Ответь на вопрос, используя контекст из данных о процессе."""
        else:
            # Обычное объяснение без вопроса
            instruction = """Ты - бизнес-ассистент, который анализирует вероятность задержки бизнес-процессов.
Проанализируй предоставленные данные и дай краткое объяснение, почему процесс может быть задержан или выполнен вовремя.
Будь конкретен и используй контекст из данных."""
        
        prompt = f"""
### Инструкция:
{instruction}

### Входные данные:
- Процесс: {input_dict.get('process_name', 'N/A')}
- Отдел: {input_dict.get('department', 'N/A')}
- Роль: {input_dict.get('role', 'N/A')}
- Ожидаемая длительность: {input_dict.get('expected_duration', 'N/A')} минут
- Вероятность задержки: {input_dict.get('delay_probability', 'N/A')}
- Прогноз: {input_dict.get('prediction', 'N/A')}
- Месяц: {input_dict.get('month', 'N/A')}
- День недели: {input_dict.get('weekday', 'N/A')}

### Объяснение:
"""

        # inputs = tokenizer(prompt, return_tensors="pt").to(model_llm.device)
        inputs = tokenizer(prompt, return_tensors="pt").to("cpu")

        with torch.no_grad():
            output = model_llm.generate(
                **inputs,
                max_new_tokens=200,
                temperature=0.3,  # Немного увеличил для более креативных ответов
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )

        text = tokenizer.decode(output[0], skip_special_tokens=True)

        # Обрезаем prompt и оставляем только ответ
        if "### Объяснение:" in text:
            text = text.split("### Объяснение:")[-1].strip()
        elif "### Ответ:" in text:
            text = text.split("### Ответ:")[-1].strip()

        return text

    except Exception as e:
        logging.error(f"Ошибка в generate_explanation: {str(e)}")
        return f"Не удалось сгенерировать объяснение: {str(e)}"