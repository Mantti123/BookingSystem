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
sequenceDiagram
    participant User as User (Browser)
    participant FE as Frontend (resources.js / form.js)
    participant BE as Backend Route (Express)
    participant Service as Service Layer
    participant DB as PostgreSQL

    User->>FE: Edit resource form + click "Update"
    FE->>BE: PUT /api/resources/:id {updatedData}
    BE->>Service: validate & updateResource(id, updatedData)
    Service->>DB: UPDATE resources SET ... WHERE id = :id
    DB-->>Service: Success
    Service-->>BE: 200 OK {updatedResource}
    BE-->>FE: JSON updated resource
    FE-->>User: Show updated data
