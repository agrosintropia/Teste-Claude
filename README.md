# Agente Claude - Exemplo com Agent SDK

Este projeto demonstra como criar um agente simples usando o **Claude Code SDK**.

## Pré-requisitos

- Python 3.9+
- Chave de API da Anthropic (`ANTHROPIC_API_KEY`)

## Instalação

```bash
pip install -r requirements.txt
```

## Configuração

```bash
export ANTHROPIC_API_KEY="sua-chave-aqui"
```

## Como usar

```bash
python agent.py
```

## O que o agente faz

1. Lista os arquivos do diretório atual
2. Cria um arquivo de exemplo chamado `hello.txt`

## Estrutura do projeto

```
.
├── agent.py          # Código principal do agente
├── requirements.txt  # Dependências Python
└── README.md         # Este arquivo
```

## Personalizando

Edite a função `main()` em `agent.py` para mudar o que o agente faz.
As ferramentas disponíveis são: `Read`, `Write`, `Bash`, `WebSearch`, entre outras.

```python
options=ClaudeCodeOptions(
    allowed_tools=["Read", "Write", "Bash", "WebSearch"],
    max_turns=10,
)
```
