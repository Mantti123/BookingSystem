# READ

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant FE as Frontend (resources.js)
    participant BE as Backend Route (Express)
    participant Service as Service Layer
    participant DB as PostgreSQL

    User->>FE: Open page / click "Load Resources"
    FE->>BE: GET /api/resources
    BE->>Service: fetchAllResources()
    Service->>DB: SELECT * FROM resources
    DB-->>Service: return rows
    Service-->>BE: 200 OK {resources}
    BE-->>FE: JSON data
    FE-->>User: Render table/list
