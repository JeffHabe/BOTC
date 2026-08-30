sequenceDiagram
    participant LLM as LLM Client
    participant Nginx as Nginx Gateway
    participant MCP as Rust MCP Server
    participant Django as Django REST API

    Note over LLM, Django: 1. 建立連線與探索工具 (Tool Discovery)
    LLM->>Nginx: HTTP GET /mcp/sse (請求建立連線)
    Nginx->>MCP: 轉發 SSE 請求
    MCP-->>LLM: 200 OK (Keep-Alive) & 回傳 Session ID
    
    LLM->>Nginx: HTTP POST /mcp/messages (要求 tools/list)
    Nginx->>MCP: 轉發 JSON-RPC 請求
    MCP-->>LLM: 透過 SSE 串流回傳可用工具清單 (對應 Django API)

    Note over LLM, Django: 2. 工具執行 (Tool Call)
    LLM->>Nginx: HTTP POST /mcp/messages (呼叫特定工具與參數)
    Nginx->>MCP: 轉發 JSON-RPC 請求
    
    activate MCP
    Note right of MCP: 解析參數，封裝為 REST 請求
    MCP->>Django: HTTP POST /api/v1/resource/ (內部 Docker 網路)
    
    activate Django
    Django-->>MCP: HTTP 200 OK (執行結果 JSON)
    deactivate Django
    
    Note right of MCP: 將 Django JSON 轉為 MCP ToolResult
    MCP-->>LLM: 透過 SSE 串流回傳執行結果
    deactivate MCP