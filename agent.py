import asyncio
import os
from claude_code_sdk import query, ClaudeCodeOptions, AssistantMessage, TextBlock


async def run_agent(prompt: str) -> str:
    """Run a Claude agent with the given prompt and return the result."""
    result_parts = []

    async for message in query(
        prompt=prompt,
        options=ClaudeCodeOptions(
            allowed_tools=["Read", "Write", "Bash"],
            max_turns=5,
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    result_parts.append(block.text)

    return "\n".join(result_parts)


async def main():
    print("=== Agente Claude - Exemplo com Agent SDK ===\n")

    # Exemplo 1: tarefa simples
    print("Tarefa: Listar arquivos do projeto\n")
    resposta = await run_agent(
        "Liste os arquivos no diretório atual e explique brevemente para que serve cada um."
    )
    print(resposta)
    print("\n" + "=" * 50 + "\n")

    # Exemplo 2: tarefa de código
    print("Tarefa: Criar um arquivo de exemplo\n")
    resposta = await run_agent(
        "Crie um arquivo chamado 'hello.txt' com o conteúdo 'Olá, mundo! Este arquivo foi criado pelo agente Claude.'"
    )
    print(resposta)


if __name__ == "__main__":
    asyncio.run(main())
