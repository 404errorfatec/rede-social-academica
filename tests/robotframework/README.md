# Testes (Robot Framework) — próxima etapa

Esta pasta é o lugar reservado para os testes automatizados com
[Robot Framework](https://robotframework.org/), conforme o item "Testes
RobotFramework" do fluxo do projeto.

Ainda não fazem parte do CRUD inicial. Sugestão de organização quando
forem escritos:

```
tests/robotframework/
  requirements.txt        # robotframework, robotframework-requests, etc.
  grupos.robot            # casos de teste da API de Grupos
  componentes.robot       # casos de teste da API de Componentes
  mural.robot             # casos de teste da API de Mural
```

Exemplo mínimo de caso de teste, usando a biblioteca `RequestsLibrary`
contra a API rodando em `http://localhost:3001`:

```robotframework
*** Settings ***
Library    RequestsLibrary

*** Test Cases ***
Listar Grupos Deve Retornar 200
    Create Session    api    http://localhost:3001
    ${resp}=    GET On Session    api    /api/grupos
    Should Be Equal As Integers    ${resp.status_code}    200
```
